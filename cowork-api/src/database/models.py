"""SQLAlchemy ORM models for the coworking space platform.

Tables:
  users          — Authentication & profile
  members        — Extended member info (company, plan, Stripe)
  spaces         — Physical spaces (hot desk, dedicated, office, meeting room)
  bookings       — Time-slot reservations
  subscriptions  — Stripe monthly plans
  occupancy_logs — Check-in/out for AI occupancy forecasting
  invoices       — Payment records
"""

import enum
from datetime import datetime, timezone

from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    Enum,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.orm import DeclarativeBase, relationship


class Base(DeclarativeBase):
    """Base class for all models."""


# ---------------------------------------------------------------------------
# Enums
# ---------------------------------------------------------------------------

class UserRole(str, enum.Enum):
    MEMBER = "member"
    ADMIN = "admin"
    SUPER_ADMIN = "super_admin"


class SpaceType(str, enum.Enum):
    HOT_DESK = "hot_desk"
    DEDICATED_DESK = "dedicated_desk"
    PRIVATE_OFFICE = "private_office"
    MEETING_ROOM = "meeting_room"


class BookingStatus(str, enum.Enum):
    PENDING = "pending"
    CONFIRMED = "confirmed"
    CHECKED_IN = "checked_in"
    COMPLETED = "completed"
    CANCELLED = "cancelled"
    NO_SHOW = "no_show"


class SubscriptionStatus(str, enum.Enum):
    ACTIVE = "active"
    PAST_DUE = "past_due"
    CANCELLED = "cancelled"
    TRIALING = "trialing"


class InvoiceStatus(str, enum.Enum):
    DRAFT = "draft"
    OPEN = "open"
    PAID = "paid"
    VOID = "void"
    UNCOLLECTIBLE = "uncollectible"


# ---------------------------------------------------------------------------
# Models
# ---------------------------------------------------------------------------

def _utcnow():
    return datetime.now(timezone.utc)


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, autoincrement=True)
    email = Column(String(255), unique=True, nullable=False, index=True)
    hashed_password = Column(String(255), nullable=False)
    full_name = Column(String(255), nullable=False)
    role = Column(Enum(UserRole), default=UserRole.MEMBER, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    avatar_url = Column(String(512), nullable=True)
    created_at = Column(DateTime(timezone=True), default=_utcnow, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=_utcnow, onupdate=_utcnow)

    member = relationship("Member", back_populates="user", uselist=False)
    bookings = relationship("Booking", back_populates="user")


class Member(Base):
    __tablename__ = "members"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False)
    phone = Column(String(30), nullable=True)
    company = Column(String(255), nullable=True)
    plan_type = Column(Enum(SpaceType), nullable=True)
    stripe_customer_id = Column(String(255), nullable=True, unique=True)
    notes = Column(Text, nullable=True)
    joined_at = Column(DateTime(timezone=True), default=_utcnow)

    user = relationship("User", back_populates="member")
    subscriptions = relationship("Subscription", back_populates="member")


class Space(Base):
    __tablename__ = "spaces"

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(255), nullable=False)
    space_type = Column(Enum(SpaceType), nullable=False)
    capacity = Column(Integer, default=1, nullable=False)
    floor = Column(Integer, nullable=True)
    amenities = Column(Text, nullable=True)  # JSON-encoded list
    hourly_rate_usd = Column(Float, nullable=True)
    daily_rate_usd = Column(Float, nullable=True)
    monthly_rate_usd = Column(Float, nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), default=_utcnow)

    bookings = relationship("Booking", back_populates="space")
    occupancy_logs = relationship("OccupancyLog", back_populates="space")


class Booking(Base):
    __tablename__ = "bookings"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    space_id = Column(Integer, ForeignKey("spaces.id", ondelete="CASCADE"), nullable=False)
    start_time = Column(DateTime(timezone=True), nullable=False)
    end_time = Column(DateTime(timezone=True), nullable=False)
    status = Column(Enum(BookingStatus), default=BookingStatus.PENDING, nullable=False)
    check_in_time = Column(DateTime(timezone=True), nullable=True)
    check_out_time = Column(DateTime(timezone=True), nullable=True)
    amount_usd = Column(Float, nullable=True)
    stripe_payment_id = Column(String(255), nullable=True)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=_utcnow)
    updated_at = Column(DateTime(timezone=True), default=_utcnow, onupdate=_utcnow)

    user = relationship("User", back_populates="bookings")
    space = relationship("Space", back_populates="bookings")

    __table_args__ = (
        UniqueConstraint("space_id", "start_time", name="uq_space_start"),
    )


class Subscription(Base):
    __tablename__ = "subscriptions"

    id = Column(Integer, primary_key=True, autoincrement=True)
    member_id = Column(Integer, ForeignKey("members.id", ondelete="CASCADE"), nullable=False)
    plan_type = Column(Enum(SpaceType), nullable=False)
    stripe_subscription_id = Column(String(255), nullable=True, unique=True)
    status = Column(Enum(SubscriptionStatus), default=SubscriptionStatus.ACTIVE, nullable=False)
    current_period_start = Column(DateTime(timezone=True), nullable=True)
    current_period_end = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), default=_utcnow)

    member = relationship("Member", back_populates="subscriptions")


class OccupancyLog(Base):
    __tablename__ = "occupancy_logs"

    id = Column(Integer, primary_key=True, autoincrement=True)
    space_id = Column(Integer, ForeignKey("spaces.id", ondelete="CASCADE"), nullable=False)
    occupied_at = Column(DateTime(timezone=True), nullable=False)
    vacated_at = Column(DateTime(timezone=True), nullable=True)

    space = relationship("Space", back_populates="occupancy_logs")


class Invoice(Base):
    __tablename__ = "invoices"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    booking_id = Column(Integer, ForeignKey("bookings.id", ondelete="SET NULL"), nullable=True)
    amount_usd = Column(Float, nullable=False)
    status = Column(Enum(InvoiceStatus), default=InvoiceStatus.DRAFT, nullable=False)
    stripe_invoice_id = Column(String(255), nullable=True)
    description = Column(Text, nullable=True)
    issued_at = Column(DateTime(timezone=True), default=_utcnow)
    paid_at = Column(DateTime(timezone=True), nullable=True)
