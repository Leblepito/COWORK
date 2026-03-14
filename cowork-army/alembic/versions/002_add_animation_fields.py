"""add animation fields to agents and events

Revision ID: 002
Revises: 001
Create Date: 2026-03-14
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "002"
down_revision: Union[str, None] = "001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Agent animation fields
    op.add_column("agents", sa.Column("mood", sa.String(30), server_default="neutral"))
    op.add_column("agents", sa.Column("energy", sa.Integer, server_default="100"))
    op.add_column("agents", sa.Column("animation_state", sa.JSON, server_default="{}"))

    # Event animation data
    op.add_column("events", sa.Column("animation_data", sa.JSON, server_default="{}"))


def downgrade() -> None:
    op.drop_column("events", "animation_data")
    op.drop_column("agents", "animation_state")
    op.drop_column("agents", "energy")
    op.drop_column("agents", "mood")
