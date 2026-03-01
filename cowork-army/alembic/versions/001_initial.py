"""initial tables

Revision ID: 001
Revises:
Create Date: 2026-02-28
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

TIMESTAMPTZ = sa.TIMESTAMP(timezone=True)

revision: str = "001"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "agents",
        sa.Column("id", sa.String(100), primary_key=True),
        sa.Column("name", sa.String(200), nullable=False),
        sa.Column("icon", sa.String(10), server_default="🤖"),
        sa.Column("tier", sa.String(20), server_default="WORKER"),
        sa.Column("color", sa.String(20), server_default="#64748b"),
        sa.Column("domain", sa.String(500), server_default=""),
        sa.Column("description", sa.Text, server_default=""),
        sa.Column("skills", sa.JSON, server_default="[]"),
        sa.Column("rules", sa.JSON, server_default="[]"),
        sa.Column("triggers", sa.JSON, server_default="[]"),
        sa.Column("system_prompt", sa.Text, server_default=""),
        sa.Column("workspace_dir", sa.String(200), server_default=""),
        sa.Column("is_base", sa.Boolean, server_default="false"),
        sa.Column("created_at", TIMESTAMPTZ, server_default=sa.text("now()")),
        sa.Column("updated_at", TIMESTAMPTZ, server_default=sa.text("now()")),
    )

    op.create_table(
        "tasks",
        sa.Column("id", sa.String(100), primary_key=True),
        sa.Column("title", sa.String(500), nullable=False),
        sa.Column("description", sa.Text, server_default=""),
        sa.Column("assigned_to", sa.String(100), server_default=""),
        sa.Column("priority", sa.String(20), server_default="normal"),
        sa.Column("status", sa.String(30), server_default="pending"),
        sa.Column("created_by", sa.String(100), server_default="user"),
        sa.Column("created_at", TIMESTAMPTZ, server_default=sa.text("now()")),
        sa.Column("updated_at", TIMESTAMPTZ, server_default=sa.text("now()")),
        sa.Column("log", sa.JSON, server_default="[]"),
    )
    op.create_index("ix_tasks_status", "tasks", ["status"])
    op.create_index("ix_tasks_assigned_to", "tasks", ["assigned_to"])

    op.create_table(
        "events",
        sa.Column("id", sa.Integer, primary_key=True, autoincrement=True),
        sa.Column("timestamp", TIMESTAMPTZ, server_default=sa.text("now()")),
        sa.Column("agent_id", sa.String(100), server_default=""),
        sa.Column("message", sa.Text, server_default=""),
        sa.Column("type", sa.String(30), server_default="info"),
    )
    op.create_index("ix_events_timestamp", "events", ["timestamp"])


def downgrade() -> None:
    op.drop_table("events")
    op.drop_table("tasks")
    op.drop_table("agents")
