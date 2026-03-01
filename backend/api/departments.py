"""
COWORK.ARMY v7.0 — Department API Routes
"""
from fastapi import APIRouter
from ..database import get_db

router = APIRouter(prefix="/api/departments", tags=["departments"])


@router.get("")
async def list_departments():
    db = get_db()
    return await db.get_all_departments()


@router.get("/{dept_id}")
async def get_department(dept_id: str):
    db = get_db()
    dept = await db.get_department(dept_id)
    if not dept:
        return {"error": "Department not found"}
    agents = await db.get_all_agents(department_id=dept_id)
    return {**dept, "agents": agents}
