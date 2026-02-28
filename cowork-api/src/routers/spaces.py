"""Space management endpoints — CRUD and availability."""

from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.database.connection import get_db
from src.database.models import Booking, BookingStatus, Space, SpaceType, User
from src.routers.auth import get_current_user, require_admin
from src.schemas.space import SpaceCreate, SpaceResponse

router = APIRouter(prefix="/spaces", tags=["spaces"])


@router.get("/", response_model=list[SpaceResponse])
async def list_spaces(
    db: AsyncSession = Depends(get_db),
    space_type: str | None = Query(None),
    active_only: bool = Query(True),
):
    """List all spaces with optional type filter."""
    stmt = select(Space).order_by(Space.name)
    if active_only:
        stmt = stmt.where(Space.is_active == True)
    if space_type:
        stmt = stmt.where(Space.space_type == space_type)

    result = await db.execute(stmt)
    return result.scalars().all()


@router.get("/types")
async def list_space_types():
    """Return all available space types."""
    return [{"value": t.value, "label": t.value.replace("_", " ").title()} for t in SpaceType]


@router.get("/{space_id}", response_model=SpaceResponse)
async def get_space(space_id: int, db: AsyncSession = Depends(get_db)):
    """Get space details."""
    space = await db.get(Space, space_id)
    if not space:
        raise HTTPException(404, "Space not found")
    return space


@router.post("/", response_model=SpaceResponse, status_code=201)
async def create_space(
    body: SpaceCreate,
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Create a new space (admin only)."""
    space = Space(**body.model_dump())
    db.add(space)
    await db.commit()
    await db.refresh(space)
    return space


@router.patch("/{space_id}", response_model=SpaceResponse)
async def update_space(
    space_id: int,
    body: SpaceCreate,
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Update a space (admin only)."""
    space = await db.get(Space, space_id)
    if not space:
        raise HTTPException(404, "Space not found")

    for key, value in body.model_dump(exclude_unset=True).items():
        setattr(space, key, value)

    await db.commit()
    await db.refresh(space)
    return space


@router.delete("/{space_id}", status_code=204)
async def delete_space(
    space_id: int,
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Soft-delete a space (admin only)."""
    space = await db.get(Space, space_id)
    if not space:
        raise HTTPException(404, "Space not found")
    space.is_active = False
    await db.commit()


@router.get("/{space_id}/availability")
async def check_availability(
    space_id: int,
    date: str = Query(..., description="YYYY-MM-DD"),
    db: AsyncSession = Depends(get_db),
):
    """Check which hours are booked for a space on a given date."""
    space = await db.get(Space, space_id)
    if not space:
        raise HTTPException(404, "Space not found")

    target_date = datetime.strptime(date, "%Y-%m-%d").date()
    day_start = datetime.combine(target_date, datetime.min.time())
    day_end = datetime.combine(target_date, datetime.max.time())

    result = await db.execute(
        select(Booking).where(
            Booking.space_id == space_id,
            Booking.status.in_([BookingStatus.CONFIRMED, BookingStatus.CHECKED_IN]),
            Booking.start_time < day_end,
            Booking.end_time > day_start,
        ).order_by(Booking.start_time)
    )
    bookings = result.scalars().all()

    booked_slots = [
        {
            "start": b.start_time.isoformat(),
            "end": b.end_time.isoformat(),
            "status": b.status.value,
        }
        for b in bookings
    ]

    return {
        "space_id": space_id,
        "date": date,
        "booked_slots": booked_slots,
        "total_bookings": len(booked_slots),
    }
