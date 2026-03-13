"""
COWORK.ARMY v7.0 — Agent API Routes
"""
from fastapi import APIRouter, Form
from ..database import get_db
from ..agents.runner import spawn_agent, kill_agent, get_statuses, get_output

router = APIRouter(prefix="/api", tags=["agents"])

# CEO durum ve tetikleme endpoint'leri
_ceo_run_count = 0
_ceo_last_run: str | None = None


@router.get("/agents/ceo/status")
async def ceo_status():
    """CEO agent'in aktif/pasif durumunu döndür."""
    from ..agents.runner import get_statuses as _gs
    all_statuses = await _gs()
    ceo_st = all_statuses.get("ceo", {})
    is_active = ceo_st.get("status", "idle") in ("working", "thinking", "running")
    return {
        "agent_id": "ceo",
        "current_task": ceo_st.get("task"),
        "is_active": is_active,
        "tick_count": _ceo_run_count,
        "last_run": _ceo_last_run,
        "status": ceo_st.get("status", "idle"),
    }


@router.post("/agents/ceo/trigger")
async def trigger_ceo():
    """CEO agent'i manuel olarak tetikle."""
    global _ceo_run_count, _ceo_last_run
    from datetime import datetime, timezone
    from ..database import get_db as _get_db
    try:
        from ..agents.autonomous import autonomous_loop
        db = _get_db()
        await autonomous_loop.trigger_ceo_agent(db)
        _ceo_run_count += 1
        _ceo_last_run = datetime.now(timezone.utc).isoformat()
        return {"status": "triggered", "tick_count": _ceo_run_count}
    except Exception as e:
        # Fallback: doğrudan spawn
        result = await spawn_agent("ceo", "Sistem durumunu analiz et ve gerekli görevleri oluştur")
        _ceo_run_count += 1
        _ceo_last_run = datetime.now(timezone.utc).isoformat()
        return {"status": "spawned", "result": result, "tick_count": _ceo_run_count, "error": str(e)}


@router.get("/agents")
async def list_agents(department_id: str | None = None):
    db = get_db()
    return await db.get_all_agents(department_id=department_id)


@router.get("/agents/{agent_id}")
async def get_agent(agent_id: str):
    db = get_db()
    agent = await db.get_agent(agent_id)
    if not agent:
        return {"error": "Agent not found"}
    return agent


@router.post("/agents")
async def create_agent(
    id: str = Form(...),
    name: str = Form(...),
    department_id: str = Form(""),
    icon: str = Form("🤖"),
    tier: str = Form("WORKER"),
    color: str = Form("#64748b"),
    domain: str = Form(""),
    description: str = Form(""),
    system_prompt: str = Form(""),
):
    db = get_db()
    agent_data = {
        "id": id, "name": name,
        "department_id": department_id or None,
        "icon": icon, "tier": tier, "color": color,
        "domain": domain, "desc": description,
        "system_prompt": system_prompt,
        "workspace_dir": id, "is_base": False,
        "skills": [], "rules": [], "triggers": [],
    }
    await db.upsert_agent(agent_data)
    return await db.get_agent(id)


@router.put("/agents/{agent_id}")
async def update_agent(
    agent_id: str,
    name: str = Form(""),
    department_id: str = Form(""),
    icon: str = Form(""),
    domain: str = Form(""),
    description: str = Form(""),
    system_prompt: str = Form(""),
):
    db = get_db()
    agent = await db.get_agent(agent_id)
    if not agent:
        return {"error": "Agent not found"}
    updated = {
        "id": agent_id,
        "name": name or agent["name"],
        "department_id": department_id or agent.get("department_id"),
        "icon": icon or agent["icon"],
        "tier": agent["tier"],
        "color": agent["color"],
        "domain": domain or agent["domain"],
        "desc": description or agent.get("desc", ""),
        "system_prompt": system_prompt or agent["system_prompt"],
        "workspace_dir": agent["workspace_dir"],
        "is_base": agent["is_base"],
        "skills": agent["skills"],
        "rules": agent["rules"],
        "triggers": agent["triggers"],
    }
    await db.upsert_agent(updated)
    return await db.get_agent(agent_id)


@router.delete("/agents/{agent_id}")
async def delete_agent(agent_id: str):
    db = get_db()
    ok = await db.delete_agent(agent_id)
    if ok:
        return {"status": "deleted", "agent_id": agent_id}
    return {"error": "Cannot delete (base agent or not found)"}


@router.post("/agents/{agent_id}/spawn")
async def spawn(agent_id: str, task: str = ""):
    return await spawn_agent(agent_id, task)


@router.post("/agents/{agent_id}/kill")
async def kill(agent_id: str):
    return kill_agent(agent_id)


@router.get("/agents/{agent_id}/output")
async def output(agent_id: str):
    return {"lines": get_output(agent_id)}


@router.get("/statuses")
async def statuses():
    return await get_statuses()
