"""Booking CRUD — create, list, update, cancel, check-in/out."""

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import and_, select
from sqlalchemy.ext.asyncio import AsyncSession

from src.database.connection import get_db
from src.database.models import Booking, BookingStatus, Space, User
from src.routers.auth import get_current_user, require_admin
from src.schemas.booking import BookingCreate, BookingResponse, BookingUpdate

router = APIRouter(prefix="/bookings", tags=["bookings"])


@router.post("/", response_model=BookingResponse, status_code=201)
async def create_booking(
    body: BookingCreate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Create a new booking (conflict check included)."""
    # Verify space exists
    space = await db.get(Space, body.space_id)
    if not space or not space.is_active:
        raise HTTPException(404, "Space not found or inactive")

    # Check time-slot conflict
    conflict = await db.execute(
        select(Booking).where(
            Booking.space_id == body.space_id,
            Booking.status.in_([BookingStatus.PENDING, BookingStatus.CONFIRMED, BookingStatus.CHECKED_IN]),
            Booking.start_time < body.end_time,
            Booking.end_time > body.start_time,
        )
    )
    if conflict.scalar_one_or_none():
        raise HTTPException(409, "Time slot already booked")

    # Calculate amount based on duration and hourly rate
    hours = (body.end_time - body.start_time).total_seconds() / 3600
    amount = round(hours * (space.hourly_rate_usd or 0), 2)

    booking = Booking(
        user_id=user.id,
        space_id=body.space_id,
        start_time=body.start_time,
        end_time=body.end_time,
        status=BookingStatus.CONFIRMED,
        amount_usd=amount,
        notes=body.notes,
    )
    db.add(booking)
    await db.commit()
    await db.refresh(booking)
    return booking


@router.get("/", response_model=list[BookingResponse])
async def list_bookings(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    status: str | None = Query(None),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
):
    """List current user's bookings (admin sees all)."""
    stmt = select(Booking).order_by(Booking.start_time.desc())

    if user.role.value == "member":
        stmt = stmt.where(Booking.user_id == user.id)

    if status:
        stmt = stmt.where(Booking.status == status)

    stmt = stmt.limit(limit).offset(offset)
    result = await db.execute(stmt)
    return result.scalars().all()


@router.get("/{booking_id}", response_model=BookingResponse)
async def get_booking(
    booking_id: int,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get a single booking (owner or admin)."""
    booking = await db.get(Booking, booking_id)
    if not booking:
        raise HTTPException(404, "Booking not found")
    if user.role.value == "member" and booking.user_id != user.id:
        raise HTTPException(403, "Not your booking")
    return booking


@router.patch("/{booking_id}", response_model=BookingResponse)
async def update_booking(
    booking_id: int,
    body: BookingUpdate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Update booking details (before check-in)."""
    booking = await db.get(Booking, booking_id)
    if not booking:
        raise HTTPException(404, "Booking not found")
    if user.role.value == "member" and booking.user_id != user.id:
        raise HTTPException(403, "Not your booking")
    if booking.status not in (BookingStatus.PENDING, BookingStatus.CONFIRMED):
        raise HTTPException(400, "Cannot modify a checked-in or completed booking")

    if body.start_time:
        booking.start_time = body.start_time
    if body.end_time:
        booking.end_time = body.end_time
    if body.notes is not None:
        booking.notes = body.notes

    await db.commit()
    await db.refresh(booking)
    return booking


@router.post("/{booking_id}/cancel", response_model=BookingResponse)
async def cancel_booking(
    booking_id: int,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Cancel a booking."""
    booking = await db.get(Booking, booking_id)
    if not booking:
        raise HTTPException(404, "Booking not found")
    if user.role.value == "member" and booking.user_id != user.id:
        raise HTTPException(403, "Not your booking")
    if booking.status in (BookingStatus.COMPLETED, BookingStatus.CANCELLED):
        raise HTTPException(400, f"Booking already {booking.status.value}")

    booking.status = BookingStatus.CANCELLED
    await db.commit()
    await db.refresh(booking)
    return booking


@router.post("/{booking_id}/checkin", response_model=BookingResponse)
async def checkin(
    booking_id: int,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Check in to a booking."""
    booking = await db.get(Booking, booking_id)
    if not booking:
        raise HTTPException(404, "Booking not found")
    if booking.user_id != user.id:
        raise HTTPException(403, "Not your booking")
    if booking.status != BookingStatus.CONFIRMED:
        raise HTTPException(400, f"Cannot check in — status is {booking.status.value}")

    booking.status = BookingStatus.CHECKED_IN
    booking.check_in_time = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(booking)
    return booking


@router.post("/{booking_id}/checkout", response_model=BookingResponse)
async def checkout(
    booking_id: int,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Check out from a booking."""
    booking = await db.get(Booking, booking_id)
    if not booking:
        raise HTTPException(404, "Booking not found")
    if booking.user_id != user.id:
        raise HTTPException(403, "Not your booking")
    if booking.status != BookingStatus.CHECKED_IN:
        raise HTTPException(400, f"Cannot check out — status is {booking.status.value}")

    booking.status = BookingStatus.COMPLETED
    booking.check_out_time = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(booking)
    return booking
