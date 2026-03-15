"""
COWORK.ARMY — Usage & Cost Tracking API Routes
"""
from fastapi import APIRouter
from ..database import get_db
from ..cost_tracking import get_budget_status

router = APIRouter(prefix="/api/usage", tags=["usage"])


@router.get("/summary")
async def usage_summary(period: str = "day"):
    db = get_db()
    return await db.get_usage_summary(period)


@router.get("/budget")
async def usage_budget():
    db = get_db()
    daily = await db.get_daily_spend()
    return get_budget_status(daily)


@router.get("/by-agent/{agent_id}")
async def usage_by_agent(agent_id: str):
    db = get_db()
    return await db.get_usage_by_agent(agent_id)
