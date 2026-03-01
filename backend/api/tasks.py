"""
COWORK.ARMY v7.0 — Task API Routes
"""
from datetime import datetime
from fastapi import APIRouter, Form
from ..database import get_db

router = APIRouter(prefix="/api/tasks", tags=["tasks"])


@router.get("")
async def list_tasks(department_id: str | None = None, limit: int = 100):
    db = get_db()
    return await db.list_tasks(limit=limit, department_id=department_id)


@router.post("")
async def create_task(
    title: str = Form(...),
    description: str = Form(""),
    assigned_to: str = Form(...),
    priority: str = Form("medium"),
    department_id: str = Form(""),
):
    db = get_db()
    task_id = f"task-{datetime.now().strftime('%Y%m%d%H%M%S')}"
    return await db.create_task(
        task_id=task_id,
        title=title,
        desc=description,
        assigned_to=assigned_to,
        priority=priority,
        created_by="user",
        status="pending",
        log=[{"action": "created", "by": "user", "at": datetime.now().isoformat()}],
        department_id=department_id or None,
    )
