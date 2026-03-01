"""
COWORK.ARMY v7.0 — SQLAlchemy ORM Models
Tables: departments, agents, tasks, events, cargo_logs
"""
from datetime import datetime, timezone
from sqlalchemy import (
    String, Text, Boolean, Integer, JSON, Index,
    ForeignKey, func, TIMESTAMP,
)
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column

# Timezone-aware timestamp type
TIMESTAMPTZ = TIMESTAMP(timezone=True)


class Base(DeclarativeBase):
    pass


class Department(Base):
    __tablename__ = "departments"

    id: Mapped[str] = mapped_column(String(50), primary_key=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    icon: Mapped[str] = mapped_column(String(10), default="🏢")
    color: Mapped[str] = mapped_column(String(20), default="#64748b")
    scene_type: Mapped[str] = mapped_column(String(50), nullable=False)
    description: Mapped[str] = mapped_column(Text, default="")


class Agent(Base):
    __tablename__ = "agents"

    id: Mapped[str] = mapped_column(String(50), primary_key=True)
    department_id: Mapped[str | None] = mapped_column(
        String(50), ForeignKey("departments.id", ondelete="SET NULL"), nullable=True
    )
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    icon: Mapped[str] = mapped_column(String(10), default="🤖")
    tier: Mapped[str] = mapped_column(String(20), default="WORKER")
    color: Mapped[str] = mapped_column(String(20), default="#64748b")
    domain: Mapped[str] = mapped_column(String(200), default="")
    description: Mapped[str] = mapped_column(Text, default="")
    skills: Mapped[list] = mapped_column(JSON, default=list)
    rules: Mapped[list] = mapped_column(JSON, default=list)
    triggers: Mapped[list] = mapped_column(JSON, default=list)
    system_prompt: Mapped[str] = mapped_column(Text, default="")
    workspace_dir: Mapped[str] = mapped_column(String(200), default="")
    is_base: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(
        TIMESTAMPTZ, server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        TIMESTAMPTZ, server_default=func.now(), onupdate=func.now()
    )

    __table_args__ = (
        Index("ix_agents_department", "department_id"),
    )


class Task(Base):
    __tablename__ = "tasks"

    id: Mapped[str] = mapped_column(String(50), primary_key=True)
    title: Mapped[str] = mapped_column(String(300), nullable=False)
    description: Mapped[str] = mapped_column(Text, default="")
    department_id: Mapped[str | None] = mapped_column(
        String(50), ForeignKey("departments.id", ondelete="SET NULL"), nullable=True
    )
    assigned_to: Mapped[str] = mapped_column(
        String(50), ForeignKey("agents.id", ondelete="CASCADE"), nullable=False
    )
    priority: Mapped[str] = mapped_column(String(20), default="medium")
    status: Mapped[str] = mapped_column(String(20), default="pending")
    created_by: Mapped[str] = mapped_column(String(100), default="user")
    created_at: Mapped[datetime] = mapped_column(
        TIMESTAMPTZ, server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        TIMESTAMPTZ, server_default=func.now(), onupdate=func.now()
    )
    log: Mapped[list] = mapped_column(JSON, default=list)

    __table_args__ = (
        Index("ix_tasks_status", "status"),
        Index("ix_tasks_assigned", "assigned_to"),
        Index("ix_tasks_department", "department_id"),
    )


class Event(Base):
    __tablename__ = "events"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    timestamp: Mapped[datetime] = mapped_column(
        TIMESTAMPTZ, server_default=func.now()
    )
    department_id: Mapped[str | None] = mapped_column(String(50), nullable=True)
    agent_id: Mapped[str] = mapped_column(String(50), nullable=False)
    message: Mapped[str] = mapped_column(Text, nullable=False)
    type: Mapped[str] = mapped_column(String(30), default="info")

    __table_args__ = (
        Index("ix_events_timestamp", "timestamp"),
        Index("ix_events_department", "department_id"),
    )


class CargoLog(Base):
    __tablename__ = "cargo_logs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    timestamp: Mapped[datetime] = mapped_column(
        TIMESTAMPTZ, server_default=func.now()
    )
    filename: Mapped[str] = mapped_column(String(500), default="")
    file_type: Mapped[str] = mapped_column(String(50), default="")
    file_size: Mapped[int] = mapped_column(Integer, default=0)
    analysis: Mapped[dict] = mapped_column(JSON, default=dict)
    source_department_id: Mapped[str | None] = mapped_column(String(50), nullable=True)
    target_department_id: Mapped[str] = mapped_column(String(50), nullable=False)
    target_agent_id: Mapped[str] = mapped_column(String(50), nullable=False)
    status: Mapped[str] = mapped_column(String(20), default="analyzing")
    prompt_generated: Mapped[str] = mapped_column(Text, default="")

    __table_args__ = (
        Index("ix_cargo_timestamp", "timestamp"),
        Index("ix_cargo_target_agent", "target_agent_id"),
    )
