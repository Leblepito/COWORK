"""Initial COWORK.ARMY v7.0 schema — 4 departments, 13 agents

Revision ID: 001_initial_v7
Revises: None
Create Date: 2026-03-01
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = "001_initial_v7"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ── Departments ──
    op.create_table(
        "departments",
        sa.Column("id", sa.String(50), primary_key=True),
        sa.Column("name", sa.String(100), nullable=False),
        sa.Column("icon", sa.String(10), nullable=False, server_default="📁"),
        sa.Column("color", sa.String(20), nullable=False, server_default="#818cf8"),
        sa.Column("scene_type", sa.String(50), nullable=False, server_default="default"),
        sa.Column("description", sa.Text, nullable=True),
    )

    # ── Agents ──
    op.create_table(
        "agents",
        sa.Column("id", sa.String(50), primary_key=True),
        sa.Column("department_id", sa.String(50), sa.ForeignKey("departments.id"), nullable=True),
        sa.Column("name", sa.String(100), nullable=False),
        sa.Column("icon", sa.String(10), nullable=False, server_default="🤖"),
        sa.Column("tier", sa.String(20), nullable=False, server_default="WORKER"),
        sa.Column("color", sa.String(20), nullable=False, server_default="#64748b"),
        sa.Column("domain", sa.String(200), nullable=True),
        sa.Column("description", sa.Text, nullable=True),
        sa.Column("skills", sa.JSON, nullable=True),
        sa.Column("rules", sa.JSON, nullable=True),
        sa.Column("triggers", sa.JSON, nullable=True),
        sa.Column("system_prompt", sa.Text, nullable=True),
        sa.Column("workspace_dir", sa.String(100), nullable=True),
        sa.Column("is_base", sa.Boolean, nullable=False, server_default=sa.text("true")),
        sa.Column("created_at", sa.TIMESTAMP(timezone=True), server_default=sa.text("now()")),
        sa.Column("updated_at", sa.TIMESTAMP(timezone=True), server_default=sa.text("now()")),
    )
    op.create_index("ix_agents_department_id", "agents", ["department_id"])

    # ── Tasks ──
    op.create_table(
        "tasks",
        sa.Column("id", sa.String(50), primary_key=True),
        sa.Column("title", sa.String(200), nullable=False),
        sa.Column("description", sa.Text, nullable=True),
        sa.Column("department_id", sa.String(50), sa.ForeignKey("departments.id"), nullable=True),
        sa.Column("assigned_to", sa.String(50), sa.ForeignKey("agents.id"), nullable=True),
        sa.Column("priority", sa.String(20), nullable=False, server_default="medium"),
        sa.Column("status", sa.String(20), nullable=False, server_default="pending"),
        sa.Column("created_by", sa.String(50), nullable=True),
        sa.Column("created_at", sa.TIMESTAMP(timezone=True), server_default=sa.text("now()")),
        sa.Column("updated_at", sa.TIMESTAMP(timezone=True), server_default=sa.text("now()")),
        sa.Column("log", sa.JSON, nullable=True),
    )
    op.create_index("ix_tasks_status", "tasks", ["status"])
    op.create_index("ix_tasks_assigned_to", "tasks", ["assigned_to"])
    op.create_index("ix_tasks_department_id", "tasks", ["department_id"])

    # ── Events ──
    op.create_table(
        "events",
        sa.Column("id", sa.Integer, primary_key=True, autoincrement=True),
        sa.Column("timestamp", sa.TIMESTAMP(timezone=True), server_default=sa.text("now()")),
        sa.Column("department_id", sa.String(50), nullable=True),
        sa.Column("agent_id", sa.String(50), nullable=True),
        sa.Column("message", sa.Text, nullable=True),
        sa.Column("type", sa.String(30), nullable=False, server_default="info"),
    )
    op.create_index("ix_events_timestamp", "events", ["timestamp"])
    op.create_index("ix_events_department_id", "events", ["department_id"])

    # ── Cargo Logs ──
    op.create_table(
        "cargo_logs",
        sa.Column("id", sa.Integer, primary_key=True, autoincrement=True),
        sa.Column("timestamp", sa.TIMESTAMP(timezone=True), server_default=sa.text("now()")),
        sa.Column("filename", sa.String(255), nullable=True),
        sa.Column("file_type", sa.String(50), nullable=True),
        sa.Column("file_size", sa.Integer, nullable=True),
        sa.Column("analysis", sa.JSON, nullable=True),
        sa.Column("source_department_id", sa.String(50), nullable=True),
        sa.Column("target_department_id", sa.String(50), nullable=True),
        sa.Column("target_agent_id", sa.String(50), nullable=True),
        sa.Column("status", sa.String(30), nullable=False, server_default="analyzing"),
        sa.Column("prompt_generated", sa.Text, nullable=True),
    )
    op.create_index("ix_cargo_logs_timestamp", "cargo_logs", ["timestamp"])
    op.create_index("ix_cargo_logs_target_agent_id", "cargo_logs", ["target_agent_id"])


def downgrade() -> None:
    op.drop_table("cargo_logs")
    op.drop_table("events")
    op.drop_table("tasks")
    op.drop_table("agents")
    op.drop_table("departments")
