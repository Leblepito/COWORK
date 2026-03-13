"""Agent World tables — AgentMessage, AgentWorldModel, AgentEpisode, SharedKnowledge, CascadeChain

Revision ID: 002_agent_world
Revises: 001_initial_v7
Create Date: 2026-03-14
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB

revision: str = "002_agent_world"
down_revision: Union[str, None] = "001_initial_v7"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ── AgentMessages ──
    op.create_table(
        "agent_messages",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("from_agent", sa.String(100), nullable=False),
        sa.Column("to_agent", sa.String(100), nullable=False),
        sa.Column("message_type", sa.String(50), nullable=False),
        sa.Column("priority", sa.String(20), nullable=False, server_default="MEDIUM"),
        sa.Column("payload", JSONB, nullable=True, server_default="{}"),
        sa.Column("thread_id", sa.String(36), nullable=True),
        sa.Column("cascade_id", sa.String(36), nullable=True),
        sa.Column("status", sa.String(20), nullable=False, server_default="SENT"),
        sa.Column("created_at", sa.TIMESTAMP(timezone=True), server_default=sa.text("now()")),
        sa.Column("completed_at", sa.TIMESTAMP(timezone=True), nullable=True),
    )
    op.create_index("ix_agent_messages_from", "agent_messages", ["from_agent"])
    op.create_index("ix_agent_messages_to", "agent_messages", ["to_agent"])
    op.create_index("ix_agent_messages_cascade", "agent_messages", ["cascade_id"])
    op.create_index("ix_agent_messages_created", "agent_messages", ["created_at"])

    # ── AgentWorldModels ──
    op.create_table(
        "agent_world_models",
        sa.Column("agent_id", sa.String(100), primary_key=True),
        sa.Column("expertise_score", sa.Float, nullable=False, server_default="0.5"),
        sa.Column("trust_network", JSONB, nullable=True, server_default="{}"),
        sa.Column("energy_level", sa.Float, nullable=False, server_default="1.0"),
        sa.Column("current_task", sa.String(255), nullable=True),
        sa.Column("idle_timeout_seconds", sa.Integer, nullable=False, server_default="300"),
        sa.Column("updated_at", sa.TIMESTAMP(timezone=True), server_default=sa.text("now()")),
    )

    # ── AgentEpisodes ──
    op.create_table(
        "agent_episodes",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("agent_id", sa.String(100), nullable=False),
        sa.Column("task_summary", sa.Text, nullable=True),
        sa.Column("outcome", sa.String(20), nullable=True),
        sa.Column("duration_seconds", sa.Integer, nullable=True),
        sa.Column("created_at", sa.TIMESTAMP(timezone=True), server_default=sa.text("now()")),
    )
    op.create_index("ix_agent_episodes_agent", "agent_episodes", ["agent_id"])
    op.create_index("ix_agent_episodes_created", "agent_episodes", ["created_at"])

    # ── SharedKnowledge ──
    op.create_table(
        "shared_knowledge",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("author_agent", sa.String(100), nullable=False),
        sa.Column("category", sa.String(100), nullable=False),
        sa.Column("content", sa.Text, nullable=False),
        sa.Column("relevance_score", sa.Float, nullable=False, server_default="0.5"),
        sa.Column("created_at", sa.TIMESTAMP(timezone=True), server_default=sa.text("now()")),
    )
    op.create_index("ix_shared_knowledge_category", "shared_knowledge", ["category"])
    op.create_index("ix_shared_knowledge_author", "shared_knowledge", ["author_agent"])

    # ── CascadeChains ──
    op.create_table(
        "cascade_chains",
        sa.Column("cascade_id", sa.String(36), primary_key=True),
        sa.Column("trigger_source", sa.String(100), nullable=False),
        sa.Column("trigger_summary", sa.Text, nullable=True),
        sa.Column("affected_departments", JSONB, nullable=True, server_default="[]"),
        sa.Column("depth", sa.Integer, nullable=False, server_default="0"),
        sa.Column("started_at", sa.TIMESTAMP(timezone=True), server_default=sa.text("now()")),
        sa.Column("completed_at", sa.TIMESTAMP(timezone=True), nullable=True),
    )
    op.create_index("ix_cascade_chains_started", "cascade_chains", ["started_at"])


def downgrade() -> None:
    op.drop_table("cascade_chains")
    op.drop_table("shared_knowledge")
    op.drop_table("agent_episodes")
    op.drop_table("agent_world_models")
    op.drop_table("agent_messages")
