"""Add users table and owner_id to agents

Revision ID: 003
Revises: 002
Create Date: 2026-03-15
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import TIMESTAMP

revision = "003"
down_revision = "002"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "users",
        sa.Column("id", sa.String(100), primary_key=True),
        sa.Column("email", sa.String(255), nullable=False, unique=True),
        sa.Column("password_hash", sa.String(255), nullable=False),
        sa.Column("name", sa.String(200), nullable=False),
        sa.Column("company", sa.String(200), server_default=""),
        sa.Column("avatar", sa.String(10), server_default="👤"),
        sa.Column("plan", sa.String(30), server_default="free"),
        sa.Column("max_agents", sa.Integer, server_default="5"),
        sa.Column("is_active", sa.Boolean, server_default=sa.text("true")),
        sa.Column("created_at", TIMESTAMP(timezone=True), server_default=sa.text("now()")),
        sa.Column("updated_at", TIMESTAMP(timezone=True), server_default=sa.text("now()")),
    )
    op.create_index("ix_users_email", "users", ["email"], unique=True)

    op.add_column("agents", sa.Column("owner_id", sa.String(100), server_default=""))
    op.create_index("ix_agents_owner_id", "agents", ["owner_id"])


def downgrade() -> None:
    op.drop_index("ix_agents_owner_id", table_name="agents")
    op.drop_column("agents", "owner_id")
    op.drop_index("ix_users_email", table_name="users")
    op.drop_table("users")
