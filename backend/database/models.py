"""
COWORK.ARMY v7.0 — SQLAlchemy ORM Models
Tables: departments, agents, tasks, events, cargo_logs
"""
from datetime import datetime, timezone
from sqlalchemy import (
    String, Text, Boolean, Integer, JSON, Index,
    ForeignKey, func, TIMESTAMP, Numeric,
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


# ─────────────────────────────────────────────────────────────────────────────
# AGENT WORLD — Yeni tablolar (Silicon Valley World özelliği)
# ─────────────────────────────────────────────────────────────────────────────

import uuid as _uuid
from sqlalchemy import Float


class AgentMessage(Base):
    """Agent'lar arası mesaj kaydı. AgentMessageBus tarafından yazılır."""
    __tablename__ = "agent_messages"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(_uuid.uuid4()))
    from_agent: Mapped[str] = mapped_column(String(100), nullable=False)
    to_agent: Mapped[str] = mapped_column(String(100), nullable=False)
    message_type: Mapped[str] = mapped_column(String(50), nullable=False)
    priority: Mapped[str] = mapped_column(String(20), default="MEDIUM")
    payload: Mapped[dict] = mapped_column(JSON, default=dict)
    thread_id: Mapped[str | None] = mapped_column(String(36), nullable=True)
    cascade_id: Mapped[str | None] = mapped_column(String(36), nullable=True)
    status: Mapped[str] = mapped_column(String(20), default="SENT")
    created_at: Mapped[datetime] = mapped_column(TIMESTAMPTZ, server_default=func.now())
    completed_at: Mapped[datetime | None] = mapped_column(TIMESTAMPTZ, nullable=True)

    __table_args__ = (
        Index("ix_agent_messages_from", "from_agent"),
        Index("ix_agent_messages_to", "to_agent"),
        Index("ix_agent_messages_cascade", "cascade_id"),
        Index("ix_agent_messages_created", "created_at"),
    )


class AgentWorldModel(Base):
    """Her agent'ın bilişsel durumu: uzmanlık, enerji, güven ağı."""
    __tablename__ = "agent_world_models"

    agent_id: Mapped[str] = mapped_column(String(100), primary_key=True)
    expertise_score: Mapped[float] = mapped_column(Float, default=0.5)
    trust_network: Mapped[dict] = mapped_column(JSON, default=dict)
    energy_level: Mapped[float] = mapped_column(Float, default=1.0)
    current_task: Mapped[str | None] = mapped_column(String(255), nullable=True)
    idle_timeout_seconds: Mapped[int] = mapped_column(Integer, default=300)
    updated_at: Mapped[datetime] = mapped_column(
        TIMESTAMPTZ, server_default=func.now(), onupdate=func.now()
    )


class AgentEpisode(Base):
    """Agent'ın tamamladığı görev geçmişi (episodik bellek)."""
    __tablename__ = "agent_episodes"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(_uuid.uuid4()))
    agent_id: Mapped[str] = mapped_column(String(100), nullable=False)
    task_summary: Mapped[str | None] = mapped_column(Text, nullable=True)
    outcome: Mapped[str | None] = mapped_column(String(20), nullable=True)  # SUCCESS / FAILED / PARTIAL
    duration_seconds: Mapped[int | None] = mapped_column(Integer, nullable=True)
    created_at: Mapped[datetime] = mapped_column(TIMESTAMPTZ, server_default=func.now())

    __table_args__ = (
        Index("ix_agent_episodes_agent", "agent_id"),
        Index("ix_agent_episodes_created", "created_at"),
    )


class SharedKnowledge(Base):
    """Agent'lar arası paylaşılan bilgi (semantik bellek)."""
    __tablename__ = "shared_knowledge"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(_uuid.uuid4()))
    author_agent: Mapped[str] = mapped_column(String(100), nullable=False)
    category: Mapped[str] = mapped_column(String(100), nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    relevance_score: Mapped[float] = mapped_column(Float, default=0.5)
    created_at: Mapped[datetime] = mapped_column(TIMESTAMPTZ, server_default=func.now())

    __table_args__ = (
        Index("ix_shared_knowledge_category", "category"),
        Index("ix_shared_knowledge_author", "author_agent"),
    )


class CascadeChain(Base):
    """Dış tetikleyiciden başlayan cascade zinciri kaydı."""
    __tablename__ = "cascade_chains"

    cascade_id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(_uuid.uuid4()))
    trigger_source: Mapped[str] = mapped_column(String(100), nullable=False)
    trigger_summary: Mapped[str | None] = mapped_column(Text, nullable=True)
    affected_departments: Mapped[list] = mapped_column(JSON, default=list)
    depth: Mapped[int] = mapped_column(Integer, default=0)
    started_at: Mapped[datetime] = mapped_column(TIMESTAMPTZ, server_default=func.now())
    completed_at: Mapped[datetime | None] = mapped_column(TIMESTAMPTZ, nullable=True)

    __table_args__ = (
        Index("ix_cascade_chains_started", "started_at"),
    )


# ─────────────────────────────────────────────────────────────────────────────
# COST TRACKING & TASK HISTORY — Optimization modules
# ─────────────────────────────────────────────────────────────────────────────

def _utcnow():
    return datetime.now(timezone.utc)


class LlmUsage(Base):
    __tablename__ = "llm_usage"
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    agent_id: Mapped[str] = mapped_column(String(100), nullable=True)
    provider: Mapped[str] = mapped_column(String(30), nullable=False)
    model: Mapped[str] = mapped_column(String(100), nullable=False)
    input_tokens: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    output_tokens: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    cost_usd = mapped_column(Numeric(10, 6), nullable=False, default=0)
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


# ─────────────────────────────────────────────────────────────────────────────
# USER AUTH — Login/Register system
# ─────────────────────────────────────────────────────────────────────────────

class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False, index=True)
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)
    name: Mapped[str] = mapped_column(String(255), nullable=False, default="")
    company: Mapped[str] = mapped_column(String(255), nullable=True, default="")
    avatar: Mapped[str] = mapped_column(String(512), nullable=True, default="")
    plan: Mapped[str] = mapped_column(String(50), default="free")
    max_agents: Mapped[int] = mapped_column(Integer, default=5)
    role: Mapped[str] = mapped_column(String(20), default="member")
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(TIMESTAMPTZ, default=_utcnow)
