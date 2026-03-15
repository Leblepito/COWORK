"""
COWORK.ARMY — SQLAlchemy ORM Models (agents, tasks, events, llm_usage, task_history)
"""
from datetime import datetime, timezone
from sqlalchemy import String, Boolean, Text, Integer, Index, JSON, DateTime, Numeric
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column

TIMESTAMPTZ = DateTime(timezone=True)


def _utcnow():
    return datetime.now(timezone.utc)


class Base(DeclarativeBase):
    pass


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
    created_at: Mapped[datetime] = mapped_column(TIMESTAMPTZ, default=_utcnow, index=True)
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
    agent_id: Mapped[str] = mapped_column(String(100), default="", index=True)
    message: Mapped[str] = mapped_column(Text, default="")
    type: Mapped[str] = mapped_column(String(30), default="info")

    __table_args__ = (
        Index("ix_events_timestamp", "timestamp"),
    )


class LlmUsage(Base):
    __tablename__ = "llm_usage"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    agent_id: Mapped[str] = mapped_column(String(100), nullable=True)
    provider: Mapped[str] = mapped_column(String(30), nullable=False)
    model: Mapped[str] = mapped_column(String(100), nullable=False)
    input_tokens: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    output_tokens: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    cost_usd: Mapped[float] = mapped_column(Numeric(10, 6), nullable=False, default=0)
    timestamp: Mapped[datetime] = mapped_column(TIMESTAMPTZ, default=_utcnow)

    __table_args__ = (
        Index("ix_llm_usage_agent_ts", "agent_id", "timestamp"),
        Index("ix_llm_usage_ts", "timestamp"),
    )


class TaskHistory(Base):
    __tablename__ = "task_history"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    task_id: Mapped[str] = mapped_column(String(100), nullable=False)
    old_status: Mapped[str] = mapped_column(String(30), nullable=True)
    new_status: Mapped[str] = mapped_column(String(30), nullable=False)
    changed_by: Mapped[str] = mapped_column(String(100), default="system")
    changed_at: Mapped[datetime] = mapped_column(TIMESTAMPTZ, default=_utcnow)

    __table_args__ = (
        Index("ix_task_history_task", "task_id"),
        Index("ix_task_history_ts", "changed_at"),
    )
