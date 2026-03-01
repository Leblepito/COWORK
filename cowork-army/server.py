#!/usr/bin/env python3
"""
COWORK.ARMY — Server v7 (PostgreSQL + async)
FastAPI backend matching CLAUDE.md spec exactly.
"""
import asyncio
import uvicorn, os, uuid, logging
from pathlib import Path
from contextlib import asynccontextmanager
from fastapi import FastAPI, UploadFile, File, Form
from fastapi.responses import HTMLResponse, JSONResponse
from fastapi.middleware.cors import CORSMiddleware

from database import setup_db, get_db
from database.connection import set_event_loop
from database.models import Agent
from sqlalchemy import select, delete
from registry import BASE_AGENTS
from runner import spawn_agent, kill_agent, get_statuses, get_output
from commander import delegate_task, create_dynamic_agent
from autonomous import autonomous

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("cowork")

BASE = Path(__file__).parent
WORKSPACE = BASE / "workspace"


@asynccontextmanager
async def lifespan(app):
    # Store event loop for sync thread access (runner threads)
    set_event_loop(asyncio.get_event_loop())

    # Initialize database
    db = await setup_db()

    # Seed base agents
    await db.seed_base_agents(BASE_AGENTS)

    # Cleanup old base agents not in new registry
    new_ids = {a["id"] for a in BASE_AGENTS}
    async with db._sf() as session:
        result = await session.execute(
            select(Agent.id).where(Agent.is_base == True)
        )
        existing_base_ids = {row[0] for row in result.all()}
        stale_ids = existing_base_ids - new_ids
        if stale_ids:
            await session.execute(
                delete(Agent).where(Agent.id.in_(stale_ids))
            )
            await session.commit()
            logger.info(f"Removed {len(stale_ids)} old base agents: {stale_ids}")

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


app = FastAPI(title="COWORK.ARMY", version="7.0", lifespan=lifespan)
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

# ══════════════ HEALTH ══════════════
@app.get("/health")
async def health():
    return {"status": "ok", "version": "7.0"}

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

# ══════════════ AGENTS ══════════════
@app.get("/api/agents")
async def api_agents():
    db = get_db()
    return await db.get_all_agents()

@app.get("/api/agents/{agent_id}")
async def api_agent_detail(agent_id: str):
    db = get_db()
    a = await db.get_agent(agent_id)
    return a if a else JSONResponse({"error": "not found"}, 404)

@app.post("/api/agents")
async def api_create_agent(
    agent_id: str = Form(...), name: str = Form(...), icon: str = Form("🤖"),
    domain: str = Form(""), desc: str = Form(""),
    skills: str = Form(""), rules: str = Form(""), triggers: str = Form(""),
    system_prompt: str = Form("")
):
    return await create_dynamic_agent(
        agent_id, name, icon, domain, desc,
        [s.strip() for s in skills.split(",") if s.strip()],
        [r.strip() for r in rules.split(",") if r.strip()],
        [t.strip() for t in triggers.split(",") if t.strip()],
        system_prompt
    )

@app.put("/api/agents/{agent_id}")
async def api_update_agent(agent_id: str, name: str = Form(""), icon: str = Form(""),
                           domain: str = Form(""), desc: str = Form(""), system_prompt: str = Form("")):
    db = get_db()
    a = await db.get_agent(agent_id)
    if not a: return JSONResponse({"error": "not found"}, 404)
    if name: a["name"] = name
    if icon: a["icon"] = icon
    if domain: a["domain"] = domain
    if desc: a["desc"] = desc
    if system_prompt: a["system_prompt"] = system_prompt
    await db.upsert_agent(a)
    return await db.get_agent(agent_id)

@app.delete("/api/agents/{agent_id}")
async def api_delete_agent(agent_id: str):
    db = get_db()
    ok = await db.delete_agent(agent_id)
    return {"deleted": ok, "agent_id": agent_id}

# ══════════════ LIFECYCLE ══════════════
@app.post("/api/agents/{agent_id}/spawn")
async def api_spawn(agent_id: str, task: str = ""):
    return await spawn_agent(agent_id, task)

@app.post("/api/agents/{agent_id}/kill")
async def api_kill(agent_id: str):
    return kill_agent(agent_id)

@app.get("/api/agents/{agent_id}/output")
async def api_output(agent_id: str):
    return {"lines": get_output(agent_id)}

@app.get("/api/statuses")
async def api_statuses():
    return await get_statuses()

# ══════════════ TASKS ══════════════
@app.get("/api/tasks")
async def api_tasks():
    db = get_db()
    return await db.list_tasks()

@app.post("/api/tasks")
async def api_create_task(title: str = Form(...), description: str = Form(""),
                          assigned_to: str = Form(""), priority: str = Form("normal")):
    if assigned_to:
        db = get_db()
        tid = f"TASK-{uuid.uuid4().hex[:8].upper()}"
        return await db.create_task(tid, title, description, assigned_to, priority, "user", "pending", [])
    return await delegate_task(title, description, priority)

@app.put("/api/tasks/{task_id}")
async def api_update_task(task_id: str, status: str = Form(""), log_message: str = Form("")):
    db = get_db()
    task = await db.get_task(task_id)
    if not task:
        return JSONResponse({"error": "task not found"}, 404)
    updates = {}
    if status:
        updates["status"] = status
    if log_message:
        current_log = task.get("log", [])
        updates["log"] = current_log + [log_message]
    if updates:
        await db.update_task(task_id, **updates)
    return await db.get_task(task_id)

# ══════════════ COMMANDER ══════════════
@app.post("/api/commander/delegate")
async def api_delegate(title: str = Form(...), description: str = Form(""), priority: str = Form("normal")):
    return await delegate_task(title, description, priority)

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

# ══════════════ SETTINGS ══════════════

def _read_env_file() -> dict[str, str]:
    """Read all key=value pairs from .env file."""
    env = BASE / ".env"
    result = {}
    if env.exists():
        for line in env.read_text().splitlines():
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                k, v = line.split("=", 1)
                result[k.strip()] = v.strip().strip('"')
    return result

def _write_env_file(updates: dict[str, str]):
    """Update .env file with given key=value pairs, preserving other lines."""
    env = BASE / ".env"
    existing = {}
    other_lines = []
    if env.exists():
        for line in env.read_text().splitlines():
            stripped = line.strip()
            if stripped and not stripped.startswith("#") and "=" in stripped:
                k = stripped.split("=", 1)[0].strip()
                existing[k] = line
            else:
                other_lines.append(line)
    for k, v in updates.items():
        existing[k] = f"{k}={v}"
        os.environ[k] = v
    all_lines = other_lines + list(existing.values())
    env.write_text("\n".join(all_lines) + "\n")

def _get_env_value(key: str) -> str:
    v = os.environ.get(key, "")
    if not v:
        v = _read_env_file().get(key, "")
    return v

@app.get("/api/settings/api-key-status")
async def api_key_status():
    anthropic_key = _get_env_value("ANTHROPIC_API_KEY")
    google_key = _get_env_value("GEMINI_API_KEY")
    active_provider = _get_env_value("LLM_PROVIDER") or "anthropic"
    return {
        "set": bool(anthropic_key) if active_provider == "anthropic" else bool(google_key),
        "preview": (anthropic_key[:12] + "...") if anthropic_key else "",
        "active_provider": active_provider,
        "anthropic": {"set": bool(anthropic_key), "preview": (anthropic_key[:12] + "...") if anthropic_key else ""},
        "gemini": {"set": bool(google_key), "preview": (google_key[:12] + "...") if google_key else ""},
    }

@app.post("/api/settings/api-key")
async def api_set_key(key: str = Form(...), provider: str = Form("anthropic")):
    if provider == "gemini":
        env_key = "GEMINI_API_KEY"
    else:
        env_key = "ANTHROPIC_API_KEY"
    _write_env_file({env_key: key})
    return {"status": "saved", "provider": provider, "preview": key[:12] + "..."}

@app.get("/api/settings/llm-provider")
async def api_get_provider():
    provider = _get_env_value("LLM_PROVIDER") or "anthropic"
    return {"provider": provider}

@app.post("/api/settings/llm-provider")
async def api_set_provider(provider: str = Form(...)):
    if provider not in ("anthropic", "gemini"):
        return JSONResponse({"error": "Invalid provider. Use 'anthropic' or 'gemini'."}, 400)
    _write_env_file({"LLM_PROVIDER": provider})
    return {"status": "saved", "provider": provider}

# ══════════════ WORKSPACE ══════════════
@app.get("/api/workspace/{agent_id}")
async def api_workspace(agent_id: str):
    db = get_db()
    a = await db.get_agent(agent_id)
    if not a: return JSONResponse({"error": "not found"}, 404)
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
    if not a: return JSONResponse({"error": "not found"}, 404)
    fp = WORKSPACE / a["workspace_dir"] / path
    if not fp.exists(): return JSONResponse({"error": "file not found"}, 404)
    try: return {"path": path, "content": fp.read_text()[:50000]}
    except: return {"path": path, "content": "[binary]", "size": fp.stat().st_size}

# ══════════════ COURIER UPLOAD ══════════════
@app.post("/api/courier/upload")
async def api_upload(file: UploadFile = File(...)):
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
    print("=" * 50)
    print("  COWORK.ARMY v7.0 -- Command Center")
    print("  http://localhost:8888")
    print("=" * 50)
    uvicorn.run(app, host="0.0.0.0", port=8888)
