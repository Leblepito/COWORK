"""Add social auth fields to users table

Revision ID: 004
Revises: 003
"""
from alembic import op
import sqlalchemy as sa

revision = "004"
down_revision = "003"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column("users", sa.Column("auth_provider", sa.String(30), server_default="", nullable=False))
    op.add_column("users", sa.Column("auth_provider_id", sa.String(255), server_default="", nullable=False))
    op.create_index("ix_users_provider", "users", ["auth_provider", "auth_provider_id"])
    # Allow empty password_hash for social login users
    op.alter_column("users", "password_hash", nullable=False, server_default="")


def downgrade():
    op.drop_index("ix_users_provider", table_name="users")
    op.drop_column("users", "auth_provider_id")
    op.drop_column("users", "auth_provider")
