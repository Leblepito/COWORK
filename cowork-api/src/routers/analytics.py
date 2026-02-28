"""Analytics endpoints — occupancy, revenue, member stats (admin only)."""

from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from src.database.connection import get_db
from src.database.models import Booking, BookingStatus, Member, Space, User
from src.routers.auth import require_admin

router = APIRouter(prefix="/analytics", tags=["analytics"])


@router.get("/occupancy")
async def occupancy_stats(
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
    days: int = Query(7, ge=1, le=90),
):
    """Daily occupancy rates for the last N days."""
    now = datetime.now(timezone.utc)
    since = now - timedelta(days=days)

    total_spaces = await db.scalar(
        select(func.count(Space.id)).where(Space.is_active == True)
    ) or 1

    bookings = await db.execute(
        select(
            func.date(Booking.start_time).label("day"),
            func.count(Booking.id).label("count"),
        )
        .where(
            Booking.start_time >= since,
            Booking.status.in_([
                BookingStatus.CONFIRMED,
                BookingStatus.CHECKED_IN,
                BookingStatus.COMPLETED,
            ]),
        )
        .group_by(func.date(Booking.start_time))
        .order_by(func.date(Booking.start_time))
    )

    daily = [
        {
            "date": str(row.day),
            "bookings": row.count,
            "occupancy_pct": round(min(row.count / total_spaces * 100, 100), 1),
        }
        for row in bookings
    ]

    return {"period_days": days, "total_spaces": total_spaces, "daily": daily}


@router.get("/revenue")
async def revenue_stats(
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
    days: int = Query(30, ge=1, le=365),
):
    """Revenue summary for the last N days."""
    since = datetime.now(timezone.utc) - timedelta(days=days)

    result = await db.execute(
        select(
            func.count(Booking.id).label("total_bookings"),
            func.coalesce(func.sum(Booking.amount_usd), 0).label("total_revenue"),
        ).where(
            Booking.created_at >= since,
            Booking.status.in_([BookingStatus.COMPLETED, BookingStatus.CONFIRMED]),
        )
    )
    row = result.one()

    return {
        "period_days": days,
        "total_bookings": row.total_bookings,
        "total_revenue_usd": round(float(row.total_revenue), 2),
        "avg_booking_usd": round(float(row.total_revenue) / max(row.total_bookings, 1), 2),
    }


@router.get("/members")
async def member_stats(
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Member growth and plan distribution."""
    total_members = await db.scalar(select(func.count(Member.id))) or 0
    total_active = await db.scalar(
        select(func.count(User.id)).where(User.is_active == True, User.role == "member")
    ) or 0

    plan_dist = await db.execute(
        select(Member.plan_type, func.count(Member.id))
        .group_by(Member.plan_type)
    )

    distribution = {str(row[0]): row[1] for row in plan_dist if row[0]}

    return {
        "total_members": total_members,
        "active_members": total_active,
        "plan_distribution": distribution,
    }
