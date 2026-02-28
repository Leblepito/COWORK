"""
COWORK.ARMY Backend — FastAPI server on port 8888
Agent ordusu kontrol merkezi. SQLite persistence, dynamic agent support.
"""
from __future__ import annotations

import json
import logging
import os
import sys
from contextlib import asynccontextmanager
from pathlib import Path

from dotenv import load_dotenv
from fastapi import FastAPI, Form, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

sys.path.insert(0, str(Path(__file__).parent))

load_dotenv(Path(__file__).parent / ".env", override=False)

from database import Database
from registry import get_base_agents_as_dicts
from runner import AgentRunner
from autonomous import AutonomousLoop
from commander import CommanderRouter

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(name)s] %(message)s")
logger = logging.getLogger("cowork-army")

# ── Config ──────────────────────────────────────────────

COWORK_ROOT = os.getenv("COWORK_ROOT", str(Path(__file__).parent.parent))
API_KEY = os.getenv("ANTHROPIC_API_KEY", "")
DB_PATH = str(Path(__file__).parent / "cowork.db")

# ── Global Instances ────────────────────────────────────

db = Database(DB_PATH)
commander_router: CommanderRouter | None = None
runner: AgentRunner | None = None
auto_loop: AutonomousLoop | None = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    global commander_router, runner, auto_loop

    # Initialize database and seed base agents
    db.initialize()
    db.seed_base_agents(get_base_agents_as_dicts())

    commander_router = CommanderRouter(db)

    def event_cb(agent_id: str, message: str, etype: str) -> None:
        if auto_loop:
            auto_loop.add_event(agent_id, message, etype)

    runner = AgentRunner(
        cowork_root=COWORK_ROOT,
        anthropic_api_key=API_KEY,
        event_callback=event_cb,
        db=db,
    )
    auto_loop = AutonomousLoop(runner=runner, db=db)

    agent_count = len(db.get_all_agents())
    logger.info("✅ %d agents ready (root=%s)", agent_count, COWORK_ROOT)
    if not API_KEY:
        logger.warning("ANTHROPIC_API_KEY not set — agents will not be able to run")
    yield
    auto_loop.stop()
    logger.info("COWORK.ARMY shutdown")


app = FastAPI(title="COWORK.ARMY", version="5.2.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ═══════════════════════════════════════════════════════
#  AGENT ROUTES
# ═══════════════════════════════════════════════════════

@app.get("/api/agents")
async def list_agents():
    agents = db.get_all_agents()
    return [_agent_to_frontend(a) for a in agents]


@app.get("/api/agents/{agent_id}")
async def get_agent(agent_id: str):
    agent = db.get_agent(agent_id)
    if not agent:
        return JSONResponse(status_code=404, content={"error": "Agent not found"})
    return _agent_to_frontend(agent)


@app.post("/api/agents")
async def create_agent(
    id: str = Form(""),
    name: str = Form(...),
    icon: str = Form("\U0001f916"),
    tier: str = Form("WORKER"),
    color: str = Form("#9ca3af"),
    domain: str = Form(""),
    desc: str = Form(""),
    skills: str = Form("[]"),
    rules: str = Form("[]"),
    workspace_dir: str = Form("."),
    triggers: str = Form("[]"),
    system_prompt: str = Form(""),
):
    """Create a new dynamic agent."""
    data = {
        "id": id.strip() if id.strip() else None,
        "name": name,
        "icon": icon,
        "tier": tier,
        "color": color,
        "domain": domain,
        "desc": desc,
        "skills": json.loads(skills) if isinstance(skills, str) else skills,
        "rules": json.loads(rules) if isinstance(rules, str) else rules,
        "workspace_dir": workspace_dir,
        "triggers": json.loads(triggers) if isinstance(triggers, str) else triggers,
        "system_prompt": system_prompt,
    }
    if not data["id"]:
        del data["id"]
    agent = db.create_agent(data)
    # Ensure runner has a process slot
    if runner:
        runner.ensure_process(agent["id"])
    if auto_loop:
        auto_loop.add_event("commander", f"Yeni agent oluşturuldu: {agent['name']}", "task_created")
    return _agent_to_frontend(agent)


@app.put("/api/agents/{agent_id}")
async def update_agent(
    agent_id: str,
    name: str = Form(None),
    icon: str = Form(None),
    tier: str = Form(None),
    color: str = Form(None),
    domain: str = Form(None),
    desc: str = Form(None),
    skills: str = Form(None),
    rules: str = Form(None),
    workspace_dir: str = Form(None),
    triggers: str = Form(None),
    system_prompt: str = Form(None),
):
    """Update an existing agent."""
    data: dict = {}
    if name is not None: data["name"] = name
    if icon is not None: data["icon"] = icon
    if tier is not None: data["tier"] = tier
    if color is not None: data["color"] = color
    if domain is not None: data["domain"] = domain
    if desc is not None: data["desc"] = desc
    if workspace_dir is not None: data["workspace_dir"] = workspace_dir
    if system_prompt is not None: data["system_prompt"] = system_prompt
    if skills is not None: data["skills"] = json.loads(skills)
    if rules is not None: data["rules"] = json.loads(rules)
    if triggers is not None: data["triggers"] = json.loads(triggers)

    agent = db.update_agent(agent_id, data)
    if not agent:
        return JSONResponse(status_code=404, content={"error": "Agent not found"})
    return _agent_to_frontend(agent)


@app.delete("/api/agents/{agent_id}")
async def delete_agent(agent_id: str):
    """Delete a dynamic agent (base agents cannot be deleted)."""
    agent = db.get_agent(agent_id)
    if not agent:
        return JSONResponse(status_code=404, content={"error": "Agent not found"})
    if agent.get("is_base"):
        return JSONResponse(status_code=403, content={"error": "Base agents cannot be deleted"})
    # Kill if running
    if runner:
        await runner.kill(agent_id)
        runner.processes.pop(agent_id, None)
    db.delete_agent(agent_id)
    if auto_loop:
        auto_loop.add_event("commander", f"Agent silindi: {agent['name']}", "warning")
    return {"status": "deleted", "agent_id": agent_id}


@app.post("/api/agents/{agent_id}/spawn")
async def spawn_agent(
    agent_id: str,
    task: str = Query(None),
    task_id: str = Query(None),
):
    if not db.get_agent(agent_id):
        return JSONResponse(status_code=404, content={"error": "Agent not found"})
    assert runner is not None
    result = await runner.spawn(agent_id, task, task_id=task_id)
    if auto_loop:
        msg = f"Başlatıldı{' — görev: ' + task[:60] if task else ''}"
        auto_loop.add_event(agent_id, msg, "info")
    return result


@app.post("/api/agents/{agent_id}/kill")
async def kill_agent(agent_id: str):
    if not db.get_agent(agent_id):
        return JSONResponse(status_code=404, content={"error": "Agent not found"})
    assert runner is not None
    result = await runner.kill(agent_id)
    if auto_loop:
        auto_loop.add_event(agent_id, "Agent durduruldu", "warning")
    return result


@app.get("/api/statuses")
async def get_statuses():
    assert runner is not None
    return runner.get_all_statuses()


@app.get("/api/agents/{agent_id}/output")
async def get_output(agent_id: str):
    if not db.get_agent(agent_id):
        return JSONResponse(status_code=404, content={"error": "Agent not found"})
    assert runner is not None
    return {"lines": runner.get_output(agent_id)}


# ═══════════════════════════════════════════════════════
#  TASK ROUTES
# ═══════════════════════════════════════════════════════

@app.get("/api/tasks")
async def list_tasks():
    return db.list_tasks()


@app.get("/api/tasks/{task_id}")
async def get_task(task_id: str):
    task = db.get_task(task_id)
    if not task:
        return JSONResponse(status_code=404, content={"error": "Task not found"})
    return task


@app.post("/api/tasks")
async def create_task(
    title: str = Form(...),
    description: str = Form(""),
    assigned_to: str = Form(...),
    priority: str = Form("medium"),
):
    task = db.create_task(title, description, assigned_to, priority)
    if auto_loop:
        auto_loop.add_event(assigned_to, f"Yeni görev: {title[:60]}", "task_created")
    return task


@app.put("/api/tasks/{task_id}")
async def update_task(
    task_id: str,
    status: str = Form(...),
    log_message: str = Form(""),
):
    """Update a task's status."""
    task = db.get_task(task_id)
    if not task:
        return JSONResponse(status_code=404, content={"error": "Task not found"})
    valid_statuses = {"pending", "in_progress", "done", "error", "cancelled"}
    if status not in valid_statuses:
        return JSONResponse(
            status_code=400,
            content={"error": f"Invalid status. Must be one of: {', '.join(sorted(valid_statuses))}"},
        )
    db.update_task_status(task_id, status, log_message)
    return db.get_task(task_id)


# ═══════════════════════════════════════════════════════
#  AUTONOMOUS ROUTES
# ═══════════════════════════════════════════════════════

@app.post("/api/autonomous/start")
async def start_autonomous():
    assert auto_loop is not None
    auto_loop.start()
    return {"status": "started"}


@app.post("/api/autonomous/stop")
async def stop_autonomous():
    assert auto_loop is not None
    auto_loop.stop()
    return {"status": "stopped"}


@app.get("/api/autonomous/status")
async def autonomous_status():
    assert auto_loop is not None
    return auto_loop.get_status()


@app.get("/api/autonomous/events")
async def autonomous_events(
    limit: int = Query(50, ge=1, le=200),
    since: str = Query(""),
):
    assert auto_loop is not None
    return auto_loop.get_events(limit=limit, since=since)


# ═══════════════════════════════════════════════════════
#  COMMANDER ROUTES
# ═══════════════════════════════════════════════════════

@app.post("/api/commander/delegate")
async def commander_delegate(
    title: str = Form(...),
    description: str = Form(""),
    priority: str = Form("normal"),
    auto_spawn: str = Form("true"),
):
    assert commander_router is not None
    text = f"{title} {description}".strip()
    agent_id, agent_name, match_count = commander_router.route(text)

    task = db.create_task(
        title=title,
        description=description,
        assigned_to=agent_id,
        priority=priority,
        created_by="commander",
    )

    spawned = False
    spawn_result = None
    if auto_spawn.lower() == "true" and runner:
        proc = runner.ensure_process(agent_id)
        if not proc.alive:
            # Kargocu gets the raw task — it will analyze and re-route
            if agent_id == "kargocu":
                desc = (
                    f"Aşağıdaki görevi analiz et ve doğru agent'a formatlanmış şekilde ilet:\n\n"
                    f"Başlık: {title}\n"
                    f"Açıklama: {description}\n"
                    f"Öncelik: {priority}"
                )
            else:
                desc = f"{title}: {description}" if description else title
            spawn_result = await runner.spawn(agent_id, desc, task_id=task["id"])
            spawned = True

    if auto_loop:
        if agent_id == "kargocu":
            msg = f"📦 Kargocu'ya yönlendirildi: '{title[:40]}' — akıllı routing"
        else:
            msg = f"Görev delegasyonu: '{title[:40]}' → {agent_name} ({agent_id})"
        auto_loop.add_event("commander", msg, "task_created")

    return {
        "task": task,
        "routed_to": agent_id,
        "agent_name": agent_name,
        "spawned": spawned,
        "spawn_result": spawn_result,
        "routed_via_kargocu": agent_id == "kargocu",
    }


# ═══════════════════════════════════════════════════════
#  SETTINGS ROUTES
# ═══════════════════════════════════════════════════════

@app.get("/api/settings/api-key-status")
async def api_key_status():
    return {"has_key": bool(API_KEY), "masked": (API_KEY[:8] + "..." + API_KEY[-4:]) if len(API_KEY) > 12 else ""}


@app.post("/api/settings/api-key")
async def save_api_key(api_key: str = Form(...)):
    global API_KEY
    key = api_key.strip()
    if not key:
        return JSONResponse(status_code=400, content={"error": "API key boş olamaz"})

    env_path = Path(__file__).parent / ".env"
    lines: list[str] = []
    if env_path.exists():
        lines = env_path.read_text(encoding="utf-8").splitlines()

    found = False
    for i, line in enumerate(lines):
        if line.startswith("ANTHROPIC_API_KEY"):
            lines[i] = f"ANTHROPIC_API_KEY={key}"
            found = True
            break
    if not found:
        lines.insert(0, f"ANTHROPIC_API_KEY={key}")

    env_path.write_text("\n".join(lines) + "\n", encoding="utf-8")

    API_KEY = key
    os.environ["ANTHROPIC_API_KEY"] = key
    if runner:
        runner.api_key = key

    logger.info("ANTHROPIC_API_KEY updated via UI")
    return {"status": "saved", "masked": key[:8] + "..." + key[-4:]}


# ═══════════════════════════════════════════════════════
#  INFO ROUTE
# ═══════════════════════════════════════════════════════

@app.get("/api/info")
async def server_info():
    active_count = 0
    if runner:
        for proc in runner.processes.values():
            if proc.alive:
                active_count += 1
    total_agents = len(db.get_all_agents()) if db.conn else 0
    return {
        "name": "COWORK.ARMY",
        "version": "5.2.0",
        "mode": "local",
        "agents": total_agents,
        "bridge_connected": True,
        "bridge_count": active_count,
        "autonomous": auto_loop.running if auto_loop else False,
        "autonomous_ticks": auto_loop.tick_count if auto_loop else 0,
    }


# ═══════════════════════════════════════════════════════
#  HEALTH
# ═══════════════════════════════════════════════════════

@app.get("/health")
async def health():
    return {"status": "ok", "service": "cowork-army"}


# ── Helpers ──────────────────────────────────────────────

def _agent_to_frontend(agent: dict) -> dict:
    """Convert DB agent dict to frontend format with resolved paths."""
    return {
        **agent,
        "workspace_path": os.path.realpath(
            os.path.join(COWORK_ROOT, agent.get("workspace_dir", "."))
        ),
    }


# ── Entrypoint ──────────────────────────────────────────

if __name__ == "__main__":
    import uvicorn

    uvicorn.run("server:app", host="0.0.0.0", port=8888, reload=True)
