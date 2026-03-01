"""
COWORK.ARMY v7.0 — Settings API Routes
"""
import os
from pathlib import Path
from fastapi import APIRouter, Form
from ..agents.autonomous import autonomous_loop

router = APIRouter(prefix="/api", tags=["settings"])


@router.get("/info")
async def server_info():
    from ..database import get_db
    db = get_db()
    agents = await db.get_all_agents()
    departments = await db.get_all_departments()
    loop_status = await autonomous_loop.status()
    return {
        "name": "COWORK.ARMY",
        "version": "7.0",
        "mode": "monorepo",
        "agents": len(agents),
        "departments": len(departments),
        "autonomous": loop_status["running"],
        "autonomous_ticks": loop_status["tick_count"],
    }


@router.get("/settings/api-key-status")
async def api_key_status():
    key = os.environ.get("ANTHROPIC_API_KEY", "")
    if not key:
        env_file = Path(__file__).parent.parent / ".env"
        if env_file.exists():
            for line in env_file.read_text().splitlines():
                if line.startswith("ANTHROPIC_API_KEY="):
                    key = line.split("=", 1)[1].strip().strip('"')
    return {"has_key": bool(key), "key_prefix": key[:12] + "..." if key else ""}


@router.post("/settings/api-key")
async def save_api_key(api_key: str = Form(...)):
    env_file = Path(__file__).parent.parent / ".env"
    lines = []
    if env_file.exists():
        lines = [l for l in env_file.read_text().splitlines()
                 if not l.startswith("ANTHROPIC_API_KEY=")]
    lines.append(f"ANTHROPIC_API_KEY={api_key}")
    env_file.write_text("\n".join(lines) + "\n")
    os.environ["ANTHROPIC_API_KEY"] = api_key
    return {"status": "saved"}
