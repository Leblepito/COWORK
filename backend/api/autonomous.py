"""
COWORK.ARMY v7.0 — Autonomous Loop API Routes
"""
from fastapi import APIRouter
from ..database import get_db
from ..agents.autonomous import autonomous_loop

router = APIRouter(prefix="/api/autonomous", tags=["autonomous"])


@router.post("/start")
async def start():
    await autonomous_loop.start()
    return {"status": "started"}


@router.post("/stop")
async def stop():
    await autonomous_loop.stop()
    return {"status": "stopped"}


@router.get("/status")
async def status():
    return await autonomous_loop.status()


@router.get("/events")
async def events(limit: int = 50, since: str = "", department_id: str | None = None):
    db = get_db()
    return await db.get_events(limit=limit, since=since, department_id=department_id)
