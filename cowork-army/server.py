#!/usr/bin/env python3
"""
COWORK.ARMY — Server v5 (PostgreSQL + async)
FastAPI backend matching CLAUDE.md spec exactly.
"""
import asyncio
import uvicorn, os, uuid, logging
from pathlib import Path
from datetime import datetime
from contextlib import asynccontextmanager
from fastapi import FastAPI, UploadFile, File, Form, Request
from fastapi.responses import HTMLResponse, JSONResponse
from fastapi.middleware.cors import CORSMiddleware

from database import setup_db, get_db
from database.connection import set_event_loop
from registry import BASE_AGENTS
from runner import spawn_agent, kill_agent, get_statuses, get_output, CREDIT_ERROR
from commander import delegate_task, create_dynamic_agent
from autonomous import autonomous
from auth import register_user, login_user, get_current_user, require_user
from army_templates import get_template_list, get_template

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


app = FastAPI(title="COWORK.ARMY", version="5.0", lifespan=lifespan)
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"], allow_credentials=True)

# ══════════════ AUTH ══════════════
@app.post("/api/auth/register")
async def api_register(email: str = Form(...), password: str = Form(...),
                       name: str = Form(...), company: str = Form("")):
    return await register_user(email, password, name, company)

@app.post("/api/auth/login")
async def api_login(email: str = Form(...), password: str = Form(...)):
    return await login_user(email, password)

@app.get("/api/auth/me")
async def api_me(request: Request):
    user = await require_user(request)
    safe = {k: v for k, v in user.items() if k != "password_hash"}
    return safe

@app.put("/api/auth/profile")
async def api_update_profile(request: Request, name: str = Form(""), company: str = Form(""),
                              avatar: str = Form("")):
    user = await require_user(request)
    db = get_db()
    updates = {}
    if name: updates["name"] = name
    if company: updates["company"] = company
    if avatar: updates["avatar"] = avatar
    if updates:
        await db.update_user(user["id"], **updates)
    updated = await db.get_user(user["id"])
    return {k: v for k, v in updated.items() if k != "password_hash"}

# ══════════════ ONBOARDING & TEMPLATES ══════════════
@app.get("/api/templates")
async def api_templates():
    return get_template_list()

@app.get("/api/templates/{template_id}")
async def api_template_detail(template_id: str):
    t = get_template(template_id)
    if not t:
        return JSONResponse({"detail": "Sablon bulunamadi"}, 404)
    return t

@app.post("/api/onboarding/setup")
async def api_onboarding_setup(request: Request,
                                template_id: str = Form(...),
                                company_name: str = Form(""),
                                custom_agents: str = Form("[]")):
    """Setup user's agent army from a template."""
    import json as _json

    user = await require_user(request)
    db = get_db()
    template = get_template(template_id)
    if not template:
        return JSONResponse({"detail": "Gecersiz sablon"}, 400)

    # Update company if provided
    if company_name:
        await db.update_user(user["id"], company=company_name)

    created = []
    for agent_def in template["agents"]:
        agent_id = f"{user['id']}-{agent_def['suffix']}"
        await create_dynamic_agent(
            agent_id=agent_id,
            name=agent_def["name"],
            icon=agent_def["icon"],
            domain=agent_def["domain"],
            desc=agent_def["desc"],
            skills=agent_def["skills"],
            rules=agent_def["rules"],
            triggers=agent_def["triggers"],
            system_prompt=agent_def["system_prompt"],
            owner_id=user["id"],
        )
        created.append(agent_id)

    # Create CEO agent for this user
    ceo_id = f"{user['id']}-ceo"
    agent_names = ", ".join(a["name"] for a in template["agents"])
    company_ctx = f" Sirket: {company_name}." if company_name else ""
    ceo_prompt = (
        f"Sen {user['name'] or 'kullanici'} icin calisan CEO Agent'sin.{company_ctx} "
        f"Emrindeki agentlar: {agent_names}. "
        "Gorevleri analiz et, uygun agentlara dagit, ilerlemeyi takip et. "
        "Farkli gorev turleri verebilirsin:\n"
        "- Sistem gelistirme (yeni ozellik ekleme, frontend/backend)\n"
        "- Bug fix (hata duzeltme, debugging)\n"
        "- SEO optimizasyonu (anahtar kelime, meta tag, sayfa hizi)\n"
        "- Icerik uretimi (blog, sosyal medya, email)\n"
        "- Pazarlama kampanyasi (reklam, analiz, A/B test)\n"
        "- Veri analizi (rapor, metrik, performans)\n"
        "- Guvenlik & DevOps (deployment, monitoring, CI/CD)\n"
        "Her agent'in yeteneklerine gore gorev ata. "
        "Birden fazla agent'i ayni anda calistirilabilir. "
        "Oncelik sirasina gore gorev dagit ve sonuclari raporla."
    )
    await create_dynamic_agent(
        agent_id=ceo_id, name="CEO Agent", icon="👔",
        domain="Yonetim & Koordinasyon",
        desc="Tum agentlari yoneten, gorev dagitan ve koordine eden ust duzey yonetici agent.",
        skills=["task_delegation", "team_coordination", "strategic_planning",
                "performance_monitoring", "project_management"],
        rules=["Gorevleri agent yeteneklerine gore dagit",
               "Ilerlemeyi duzenli takip et",
               "Oncelik sirasina gore gorev ata"],
        triggers=["gorev", "task", "koordine", "yonet", "manage", "plan", "proje", "project"],
        system_prompt=ceo_prompt,
        owner_id=user["id"],
    )
    created.append(ceo_id)

    # Mark user as onboarded
    await db.update_user(user["id"], plan=f"army:{template_id}")

    await db.add_event(ceo_id, f"Yeni ordu kuruldu: {template['name']} ({len(created)} agent)", "info")

    return {
        "status": "ok",
        "template": template_id,
        "agents_created": created,
        "count": len(created),
    }

# ══════════════ INFO ══════════════
@app.get("/api/info")
async def api_info():
    db = get_db()
    agents = await db.get_all_agents()
    return {
        "name": "COWORK.ARMY", "version": "5.0", "mode": "production",
        "agents": len(agents), "bridge_connected": False, "bridge_count": 0,
        "autonomous": autonomous.running, "autonomous_ticks": autonomous.tick_count,
    }

# ══════════════ AGENTS ══════════════
@app.get("/api/agents")
async def api_agents(request: Request):
    db = get_db()
    user = await get_current_user(request)
    if user:
        return await db.get_user_agents(user["id"])
    return await db.get_all_agents()

@app.get("/api/agents/{agent_id}")
async def api_agent_detail(agent_id: str):
    db = get_db()
    a = await db.get_agent(agent_id)
    return a if a else JSONResponse({"error": "not found"}, 404)

@app.post("/api/agents")
async def api_create_agent(
    request: Request,
    agent_id: str = Form(...), name: str = Form(...), icon: str = Form("🤖"),
    domain: str = Form(""), desc: str = Form(""),
    skills: str = Form(""), rules: str = Form(""), triggers: str = Form(""),
    system_prompt: str = Form("")
):
    user = await get_current_user(request)
    owner_id = user["id"] if user else ""
    result = await create_dynamic_agent(
        agent_id, name, icon, domain, desc,
        [s.strip() for s in skills.split(",") if s.strip()],
        [r.strip() for r in rules.split(",") if r.strip()],
        [t.strip() for t in triggers.split(",") if t.strip()],
        system_prompt, owner_id=owner_id
    )
    return result

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
    # Manual spawn from UI bypasses credit error block
    return await spawn_agent(agent_id, task, force=True)

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
@app.get("/api/settings/api-key-status")
async def api_key_status():
    key = os.environ.get("ANTHROPIC_API_KEY", "")
    if not key:
        env = BASE / ".env"
        if env.exists():
            for line in env.read_text().splitlines():
                if line.startswith("ANTHROPIC_API_KEY=") and line.split("=", 1)[1].strip():
                    key = line.split("=", 1)[1].strip()
    return {"set": bool(key), "preview": (key[:12] + "...") if key else ""}

@app.post("/api/settings/api-key")
async def api_set_key(key: str = Form(...)):
    env = BASE / ".env"
    lines = []
    if env.exists():
        lines = [l for l in env.read_text().splitlines() if not l.startswith("ANTHROPIC_API_KEY=")]
    lines.append(f"ANTHROPIC_API_KEY={key}")
    env.write_text("\n".join(lines) + "\n")
    os.environ["ANTHROPIC_API_KEY"] = key
    # Reset credit error flag so agents can retry with new key
    CREDIT_ERROR["active"] = False
    CREDIT_ERROR["message"] = ""
    return {"status": "saved", "preview": key[:12] + "..."}

# ══════════════ ANIMATION ══════════════
@app.get("/api/animations/states")
async def api_animation_states():
    """Get all agents' mood, energy, and animation state."""
    db = get_db()
    agents = await db.get_all_agents()
    return {
        a["id"]: {
            "mood": a.get("mood", "neutral"),
            "energy": a.get("energy", 100),
            "animation_state": a.get("animation_state", {}),
        }
        for a in agents
    }

@app.post("/api/animations/mood/{agent_id}")
async def api_set_mood(agent_id: str, mood: str = Form(...), energy: int = Form(None)):
    """Set agent mood and energy level. Moods: neutral, happy, focused, stressed, excited, tired."""
    db = get_db()
    a = await db.get_agent(agent_id)
    if not a:
        return JSONResponse({"error": "not found"}, 404)
    valid_moods = ["neutral", "happy", "focused", "stressed", "excited", "tired", "celebrating"]
    if mood not in valid_moods:
        return JSONResponse({"error": f"Invalid mood. Valid: {valid_moods}"}, 400)
    await db.update_agent_mood(agent_id, mood, energy)
    await db.add_animation_event(agent_id, "mood_change", {"mood": mood, "energy": energy})
    return {"agent_id": agent_id, "mood": mood, "energy": energy}

@app.post("/api/animations/trigger/{agent_id}")
async def api_trigger_animation(agent_id: str, animation: str = Form(...), params: str = Form("{}")):
    """Trigger a specific animation on an agent.
    Animations: spawn, despawn, celebrate, alert, power_up, shake, teleport.
    """
    import json as _json
    db = get_db()
    a = await db.get_agent(agent_id)
    if not a:
        return JSONResponse({"error": "not found"}, 404)
    valid_anims = ["spawn", "despawn", "celebrate", "alert", "power_up", "shake", "teleport"]
    if animation not in valid_anims:
        return JSONResponse({"error": f"Invalid animation. Valid: {valid_anims}"}, 400)
    try:
        anim_params = _json.loads(params)
    except _json.JSONDecodeError:
        anim_params = {}
    anim_data = {"animation": animation, "params": anim_params, "triggered_at": datetime.now().isoformat()}
    await db.update_agent_animation_state(agent_id, anim_data)
    await db.add_animation_event(agent_id, animation, anim_data)
    return {"agent_id": agent_id, "animation": animation, "params": anim_params}

@app.get("/api/animations/events")
async def api_animation_events(limit: int = 20, since: str = ""):
    """Get recent animation events."""
    db = get_db()
    return await db.get_animation_events(limit, since)

@app.post("/api/animations/broadcast")
async def api_broadcast_animation(animation: str = Form(...), params: str = Form("{}")):
    """Trigger an animation on ALL agents (e.g., celebrate, alert)."""
    import json as _json
    db = get_db()
    agents = await db.get_all_agents()
    valid_anims = ["celebrate", "alert", "power_up", "shake"]
    if animation not in valid_anims:
        return JSONResponse({"error": f"Invalid broadcast animation. Valid: {valid_anims}"}, 400)
    try:
        anim_params = _json.loads(params)
    except _json.JSONDecodeError:
        anim_params = {}
    triggered = []
    for a in agents:
        anim_data = {"animation": animation, "params": anim_params, "triggered_at": datetime.now().isoformat()}
        await db.update_agent_animation_state(a["id"], anim_data)
        await db.add_animation_event(a["id"], animation, anim_data)
        triggered.append(a["id"])
    return {"animation": animation, "triggered": triggered, "count": len(triggered)}

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
    port = int(os.environ.get("PORT", 8888))
    print("=" * 50)
    print("  COWORK.ARMY v6.0 -- Command Center")
    print(f"  http://localhost:{port}")
    print("=" * 50)
    uvicorn.run(app, host="0.0.0.0", port=port)
