"""
COWORK.ARMY — SQLAlchemy ORM Models (agents, tasks, events)
"""
from datetime import datetime, timezone
from sqlalchemy import String, Boolean, Text, Integer, Index, JSON, DateTime
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column

TIMESTAMPTZ = DateTime(timezone=True)


def _utcnow():
    return datetime.now(timezone.utc)


class Base(DeclarativeBase):
    pass


class User(Base):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(String(100), primary_key=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    company: Mapped[str] = mapped_column(String(200), default="")
    avatar: Mapped[str] = mapped_column(String(10), default="👤")
    plan: Mapped[str] = mapped_column(String(30), default="free")
    max_agents: Mapped[int] = mapped_column(Integer, default=5)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(TIMESTAMPTZ, default=_utcnow)
    updated_at: Mapped[datetime] = mapped_column(TIMESTAMPTZ, default=_utcnow, onupdate=_utcnow)

    __table_args__ = (
        Index("ix_users_email", "email", unique=True),
    )


class Agent(Base):
    __tablename__ = "agents"

    id: Mapped[str] = mapped_column(String(100), primary_key=True)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    icon: Mapped[str] = mapped_column(String(10), default="🤖")
    tier: Mapped[str] = mapped_column(String(20), default="WORKER")
    color: Mapped[str] = mapped_column(String(20), default="#64748b")
    domain: Mapped[str] = mapped_column(String(500), default="")
    description: Mapped[str] = mapped_column(Text, default="")
    skills: Mapped[list] = mapped_column(JSON, default=list)
    rules: Mapped[list] = mapped_column(JSON, default=list)
    triggers: Mapped[list] = mapped_column(JSON, default=list)
    system_prompt: Mapped[str] = mapped_column(Text, default="")
    workspace_dir: Mapped[str] = mapped_column(String(200), default="")
    is_base: Mapped[bool] = mapped_column(Boolean, default=False)
    owner_id: Mapped[str] = mapped_column(String(100), default="", index=True)
    mood: Mapped[str] = mapped_column(String(30), default="neutral")
    energy: Mapped[int] = mapped_column(Integer, default=100)
    animation_state: Mapped[dict] = mapped_column(JSON, default=dict)
    created_at: Mapped[datetime] = mapped_column(TIMESTAMPTZ, default=_utcnow)
    updated_at: Mapped[datetime] = mapped_column(TIMESTAMPTZ, default=_utcnow, onupdate=_utcnow)


class Task(Base):
    __tablename__ = "tasks"

    id: Mapped[str] = mapped_column(String(100), primary_key=True)
    title: Mapped[str] = mapped_column(String(500), nullable=False)
    description: Mapped[str] = mapped_column(Text, default="")
    assigned_to: Mapped[str] = mapped_column(String(100), default="")
    priority: Mapped[str] = mapped_column(String(20), default="normal")
    status: Mapped[str] = mapped_column(String(30), default="pending")
    created_by: Mapped[str] = mapped_column(String(100), default="user")
    created_at: Mapped[datetime] = mapped_column(TIMESTAMPTZ, default=_utcnow)
    updated_at: Mapped[datetime] = mapped_column(TIMESTAMPTZ, default=_utcnow, onupdate=_utcnow)
    log: Mapped[list] = mapped_column(JSON, default=list)

    __table_args__ = (
        Index("ix_tasks_status", "status"),
        Index("ix_tasks_assigned_to", "assigned_to"),
    )


class Event(Base):
    __tablename__ = "events"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    timestamp: Mapped[datetime] = mapped_column(TIMESTAMPTZ, default=_utcnow)
    agent_id: Mapped[str] = mapped_column(String(100), default="")
    message: Mapped[str] = mapped_column(Text, default="")
    type: Mapped[str] = mapped_column(String(30), default="info")
    animation_data: Mapped[dict] = mapped_column(JSON, default=dict)

    __table_args__ = (
        Index("ix_events_timestamp", "timestamp"),
    )
