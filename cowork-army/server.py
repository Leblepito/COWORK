#!/usr/bin/env python3
"""
COWORK.ARMY — Server v5 (PostgreSQL + async)
FastAPI backend matching CLAUDE.md spec exactly.
"""
import asyncio
import os
import time
import uuid
import uvicorn
import logging
import structlog
import json as json_module
from pathlib import Path
from contextlib import asynccontextmanager
from dotenv import load_dotenv
from fastapi import FastAPI, UploadFile, File, Form, Request
from fastapi.responses import HTMLResponse, JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from sse_starlette.sse import EventSourceResponse

from database import setup_db, get_db
from database.connection import set_event_loop
from registry import BASE_AGENTS
from runner import spawn_agent, kill_agent, get_statuses, get_output, PROCS
from commander import delegate_task, create_dynamic_agent, init_router
from autonomous import autonomous
from logging_config import configure_logging
from middleware.error_handler import add_error_handlers
from exceptions import NotFoundError, ValidationError, AuthError
from env_check import validate_env
from schemas import DelegateRequest
from sse import broadcaster
from cache import app_cache

logging.basicConfig(level=logging.INFO)
logger = structlog.get_logger()

BASE = Path(__file__).parent
WORKSPACE = BASE / "workspace"

MAX_UPLOAD_SIZE = 5 * 1024 * 1024  # 5MB

VALID_PROVIDERS = {"anthropic", "gemini"}


def _read_env_file() -> dict:
    """Read .env file and return as a dict."""
    env_path = BASE / ".env"
    result = {}
    if env_path.exists():
        for line in env_path.read_text().splitlines():
            if "=" in line and not line.startswith("#"):
                k, _, v = line.partition("=")
                result[k.strip()] = v.strip().strip('"')
    return result


def _write_env_file(updates: dict) -> None:
    """Write key-value updates to .env file (merge with existing)."""
    env_path = BASE / ".env"
    current = _read_env_file()
    current.update(updates)
    env_path.write_text("\n".join(f"{k}={v}" for k, v in current.items()) + "\n")
ALLOWED_MIMES = {"text/plain", "application/json", "image/png", "image/jpeg", "image/gif"}
_start_time = time.time()


@asynccontextmanager
async def lifespan(app):
    # Load .env file into os.environ before anything else
    load_dotenv(BASE / ".env", override=False)

    # Validate environment variables on startup
    validate_env()

    # Store event loop for sync thread access (runner threads)
    set_event_loop(asyncio.get_event_loop())

    # Initialize database
    db = await setup_db()

    # Seed base agents
    await db.seed_base_agents(BASE_AGENTS)

    # Fit smart router with all agents
    await init_router()

    # Setup workspace directories
    agents = await db.get_all_agents()
    for a in agents:
        ws = WORKSPACE / a["workspace_dir"]
        for d in ["inbox", "output"]:
            (ws / d).mkdir(parents=True, exist_ok=True)
        readme = ws / "README.md"
        if not readme.exists():
            readme.write_text(f"# {a['icon']} {a['name']}\n{a['desc']}\n", encoding="utf-8")
        gorev = ws / "gorevler.md"
        if not gorev.exists():
            gorev.write_text(f"# {a['icon']} {a['name']} — Görevler\n\n## Aktif\n_Boş_\n", encoding="utf-8")

    logger.info(f"{len(agents)} agents ready")
    yield

    # Shutdown — kill all active agents
    logger.info("server_shutdown_started", active_agents=len(PROCS))
    for agent_id, proc in list(PROCS.items()):
        if proc.alive:
            proc.status = "error"
            proc.log("🛑 Server shutting down")
            import time as _time
            proc._finished_at = _time.time()
            logger.info("agent_killed_on_shutdown", agent_id=agent_id)
    PROCS.clear()
    logger.info("server_shutdown_complete")


app = FastAPI(title="COWORK.ARMY", version="7.0", lifespan=lifespan)
configure_logging()
add_error_handlers(app)

from middleware.rate_limit import add_rate_limiting, limiter
add_rate_limiting(app)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3333",
        "https://ireska.com",
        "https://www.ireska.com",
        os.environ.get("FRONTEND_URL", ""),
    ],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ══════════════ INFO ══════════════
@app.get("/api/info")
async def api_info():
    db = get_db()
    agents = await db.get_all_agents()
    return {
        "name": "COWORK.ARMY", "version": "7.0", "mode": "production",
        "agents": len(agents), "bridge_connected": False, "bridge_count": 0,
        "autonomous": autonomous.running, "autonomous_ticks": autonomous.tick_count,
    }


# ══════════════ HEALTH ══════════════
@app.get("/health")
async def health_simple():
    """Simple health check for load balancers and legacy clients."""
    return {"status": "ok", "version": "7.0"}


@app.get("/api/health")
async def health_check():
    db = get_db()
    db_ok = False
    try:
        count = await db.get_event_count()
        db_ok = True
    except Exception:
        db_ok = False
    provider = os.environ.get("LLM_PROVIDER", "anthropic")
    return {
        "status": "healthy" if db_ok else "degraded",
        "uptime_seconds": round(time.time() - _start_time, 1),
        "database": "connected" if db_ok else "disconnected",
        "llm_provider": provider,
        "active_agents": len([p for p in PROCS.values() if p.alive]),
    }


# ══════════════ AGENTS ══════════════
@app.get("/api/agents")
async def api_agents():
    cached = app_cache.get("agents:all")
    if cached is not None:
        return cached
    db = get_db()
    result = await db.get_all_agents()
    app_cache.set("agents:all", result, ttl=300)
    return result

@app.get("/api/agents/{agent_id}")
async def api_agent_detail(agent_id: str):
    db = get_db()
    a = await db.get_agent(agent_id)
    if not a: raise NotFoundError("agent", agent_id)
    return a

@app.post("/api/agents")
async def api_create_agent(
    agent_id: str = Form(...), name: str = Form(...), icon: str = Form("🤖"),
    domain: str = Form(""), desc: str = Form(""),
    skills: str = Form(""), rules: str = Form(""), triggers: str = Form(""),
    system_prompt: str = Form("")
):
    result = await create_dynamic_agent(
        agent_id, name, icon, domain, desc,
        [s.strip() for s in skills.split(",") if s.strip()],
        [r.strip() for r in rules.split(",") if r.strip()],
        [t.strip() for t in triggers.split(",") if t.strip()],
        system_prompt
    )
    app_cache.delete("agents:all")
    return result

@app.put("/api/agents/{agent_id}")
async def api_update_agent(agent_id: str, name: str = Form(""), icon: str = Form(""),
                           domain: str = Form(""), desc: str = Form(""), system_prompt: str = Form("")):
    db = get_db()
    a = await db.get_agent(agent_id)
    if not a: raise NotFoundError("agent", agent_id)
    if name: a["name"] = name
    if icon: a["icon"] = icon
    if domain: a["domain"] = domain
    if desc: a["desc"] = desc
    if system_prompt: a["system_prompt"] = system_prompt
    await db.upsert_agent(a)
    app_cache.delete("agents:all")
    return await db.get_agent(agent_id)

@app.delete("/api/agents/{agent_id}")
async def api_delete_agent(agent_id: str):
    db = get_db()
    ok = await db.delete_agent(agent_id)
    app_cache.delete("agents:all")
    return {"deleted": ok, "agent_id": agent_id}

# ══════════════ LIFECYCLE ══════════════
@app.post("/api/agents/{agent_id}/spawn")
@limiter.limit("10/minute")
async def api_spawn(request: Request, agent_id: str, task: str = ""):
    result = await spawn_agent(agent_id, task)
    await broadcaster.broadcast("agent_status", {"agent_id": agent_id, "status": "working"})
    return result

@app.post("/api/agents/{agent_id}/kill")
async def api_kill(agent_id: str):
    result = kill_agent(agent_id)
    await broadcaster.broadcast("agent_status", {"agent_id": agent_id, "status": "done"})
    return result

@app.get("/api/agents/{agent_id}/output")
async def api_output(agent_id: str):
    return {"lines": get_output(agent_id)}

@app.get("/api/statuses")
async def api_statuses():
    return await get_statuses()

# ══════════════ TASKS ══════════════
@app.get("/api/tasks")
async def api_tasks(agent: str = "", status: str = "", date_from: str = "", date_to: str = ""):
    db = get_db()
    return await db.list_tasks(
        agent=agent or None, status=status or None,
        date_from=date_from or None, date_to=date_to or None,
    )

@app.post("/api/tasks")
async def api_create_task(title: str = Form(...), description: str = Form(""),
                          assigned_to: str = Form(""), priority: str = Form("normal")):
    if assigned_to:
        db = get_db()
        tid = f"TASK-{uuid.uuid4().hex[:8].upper()}"
        result = await db.create_task(tid, title, description, assigned_to, priority, "user", "pending", [])
        await broadcaster.broadcast("task_update", {"status": "created"})
        return result
    result = await delegate_task(title, description, priority)
    await broadcaster.broadcast("task_update", {"status": "created"})
    return result

@app.put("/api/tasks/{task_id}")
async def api_update_task(task_id: str, status: str = Form(""), log_message: str = Form("")):
    db = get_db()
    t = await db.get_task(task_id)
    if not t:
        raise NotFoundError("task", task_id)
    updates = {}
    old_status = t.get("status")
    if status:
        updates["status"] = status
    if log_message:
        log = t.get("log", []) or []
        log.append(log_message)
        updates["log"] = log
    if updates:
        await db.update_task(task_id, **updates)
        if "status" in updates and updates["status"] != old_status:
            try:
                await db.record_task_transition(task_id, old_status, updates["status"], "user")
            except Exception as e:
                logger.warning("task_transition_record_failed", error=str(e))
    return await db.get_task(task_id)

# ══════════════ USAGE & HISTORY ══════════════
@app.get("/api/usage/summary")
async def usage_summary(period: str = "day"):
    db = get_db()
    return await db.get_usage_summary(period)

@app.get("/api/usage/by-agent/{agent_id}")
async def usage_by_agent(agent_id: str):
    db = get_db()
    return await db.get_usage_by_agent(agent_id)

@app.get("/api/tasks/{task_id}/history")
async def task_history(task_id: str):
    db = get_db()
    return await db.get_task_history(task_id)

# ══════════════ BUDGET ══════════════
@app.get("/api/usage/budget")
async def usage_budget():
    db = get_db()
    daily = await db.get_daily_spend()
    from cost_tracking import get_budget_status
    return get_budget_status(daily)

@app.post("/api/settings/budget")
async def set_budget(request: Request):
    form = await request.form()
    limit = float(form.get("limit", "10.0"))
    if limit < 0:
        raise ValidationError("Budget limit must be >= 0")
    os.environ["LLM_BUDGET_LIMIT_USD"] = str(limit)
    return {"status": "updated", "limit": limit}

# ══════════════ COMMANDER ══════════════
@app.post("/api/commander/delegate")
async def api_delegate(body: DelegateRequest):
    result = await delegate_task(body.task, "", "normal")
    return result

# ══════════════ AUTONOMOUS ══════════════
@app.post("/api/autonomous/start")
async def api_auto_start():
    await autonomous.start()
    return {"status": "started"}

@app.post("/api/autonomous/stop")
async def api_auto_stop():
    await autonomous.stop()
    return {"status": "stopped"}

@app.get("/api/autonomous/status")
async def api_auto_status():
    return await autonomous.status()

@app.get("/api/autonomous/events")
async def api_auto_events(limit: int = 50, since: str = ""):
    db = get_db()
    return await db.get_events(limit, since)

# ══════════════ SSE EVENTS ══════════════
@app.get("/api/events/stream")
async def event_stream(request: Request):
    # Optional auth via query param
    token = request.query_params.get("token")
    if token:
        from middleware.auth import verify_token
        if verify_token(token) is None:
            raise AuthError("Invalid or expired token")

    queue: asyncio.Queue = asyncio.Queue(maxsize=100)
    if not broadcaster.subscribe(queue):
        raise ValidationError("Too many SSE connections (max 100)")

    async def generate():
        try:
            yield {"event": "connected", "data": json_module.dumps({"status": "connected"})}
            while True:
                try:
                    msg = await asyncio.wait_for(queue.get(), timeout=15.0)
                    yield {"event": msg["event"], "data": json_module.dumps(msg["data"])}
                except asyncio.TimeoutError:
                    yield {"event": "heartbeat", "data": json_module.dumps({"ts": 0})}
        except asyncio.CancelledError:
            pass
        finally:
            broadcaster.unsubscribe(queue)

    return EventSourceResponse(generate())


# ══════════════ SETTINGS ══════════════
@app.get("/api/settings/api-key-status")
async def api_key_status():
    cached = app_cache.get("settings:provider_config")
    if cached is not None:
        return cached
    active_provider = os.environ.get("LLM_PROVIDER", "anthropic")
    ant_key = os.environ.get("ANTHROPIC_API_KEY", "")
    gem_key = os.environ.get("GEMINI_API_KEY", "")
    result = {
        "active_provider": active_provider,
        "set": bool(ant_key if active_provider == "anthropic" else gem_key),
        "preview": (ant_key[:12] + "...") if ant_key else "",
        "anthropic": {"set": bool(ant_key), "preview": (ant_key[:12] + "...") if ant_key else ""},
        "gemini": {"set": bool(gem_key), "preview": (gem_key[:12] + "...") if gem_key else ""},
    }
    app_cache.set("settings:provider_config", result, ttl=600)
    return result

@app.post("/api/settings/api-key")
async def api_set_key(key: str = Form(...), provider: str = Form("anthropic")):
    env_key = "GEMINI_API_KEY" if provider == "gemini" else "ANTHROPIC_API_KEY"
    _write_env_file({env_key: key})
    os.environ[env_key] = key
    app_cache.delete("settings:provider_config")
    return {"status": "saved", "preview": key[:12] + "...", "provider": provider}

@app.get("/api/settings/llm-provider")
async def api_get_llm_provider():
    provider = os.environ.get("LLM_PROVIDER", "anthropic")
    return {"provider": provider}

@app.post("/api/settings/llm-provider")
async def api_set_llm_provider(provider: str = Form(...)):
    if provider not in VALID_PROVIDERS:
        from fastapi import HTTPException
        raise HTTPException(status_code=400, detail=f"Invalid provider '{provider}'. Valid: {', '.join(VALID_PROVIDERS)}")
    _write_env_file({"LLM_PROVIDER": provider})
    os.environ["LLM_PROVIDER"] = provider
    app_cache.delete("settings:provider_config")
    return {"provider": provider, "status": "saved"}

# ══════════════ WORKSPACE ══════════════
@app.get("/api/workspace/{agent_id}")
async def api_workspace(agent_id: str):
    db = get_db()
    a = await db.get_agent(agent_id)
    if not a: raise NotFoundError("agent", agent_id)
    ws = WORKSPACE / a["workspace_dir"]
    files = []
    if ws.exists():
        for f in sorted(ws.rglob("*")):
            if f.is_file():
                files.append({"path": str(f.relative_to(ws)), "size": f.stat().st_size})
    return {"agent_id": agent_id, "workspace": str(ws), "files": files}

@app.get("/api/workspace/{agent_id}/file")
async def api_ws_file(agent_id: str, path: str = ""):
    db = get_db()
    a = await db.get_agent(agent_id)
    if not a: raise NotFoundError("agent", agent_id)
    fp = WORKSPACE / a["workspace_dir"] / path
    if not fp.exists(): raise NotFoundError("file", path)
    try: return {"path": path, "content": fp.read_text()[:50000]}
    except (UnicodeDecodeError, OSError) as e:
        return {"path": path, "content": "[binary]", "size": fp.stat().st_size}

# ══════════════ COURIER UPLOAD ══════════════
@app.post("/api/courier/upload")
@limiter.limit("5/minute")
async def api_upload(request: Request, file: UploadFile = File(...)):
    if file.content_type and file.content_type not in ALLOWED_MIMES:
        raise ValidationError(f"File type '{file.content_type}' not allowed")
    content = await file.read()
    if len(content) > MAX_UPLOAD_SIZE:
        raise ValidationError(f"File too large: {len(content)} bytes (max {MAX_UPLOAD_SIZE})")
    await file.seek(0)
    inbox = WORKSPACE / "supervisor" / "inbox"
    inbox.mkdir(parents=True, exist_ok=True)
    dest = inbox / file.filename
    content = await file.read()
    dest.write_bytes(content)
    result = await delegate_task(f"Dosya işle: {file.filename}", f"Yüklenen dosya: {file.filename} ({len(content)} bytes)")
    return {"file": file.filename, "size": len(content), "security": "PASS", "routed_to": result.get("assigned_to", "supervisor"), "task": result}

# ══════════════ DASHBOARD ══════════════
@app.get("/", response_class=HTMLResponse)
async def dashboard():
    fp = BASE / "frontend" / "dashboard.html"
    if fp.exists(): return fp.read_text()
    return "<h1>COWORK.ARMY — Frontend not found. Place dashboard.html in frontend/</h1>"

# ══════════════ MAIN ══════════════
if __name__ == "__main__":
    import sys, io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
    port = int(os.environ.get("PORT", 8888))
    print("=" * 50)
    print("  COWORK.ARMY v6.0 -- Command Center")
    print(f"  http://localhost:{port}")
    print("=" * 50)
    uvicorn.run(app, host="0.0.0.0", port=port)
