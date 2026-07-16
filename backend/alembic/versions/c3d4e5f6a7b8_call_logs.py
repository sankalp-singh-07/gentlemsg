"""Add call_logs table

Revision ID: c3d4e5f6a7b8
Revises: b2c3d4e5f6a7
Create Date: 2026-07-16
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "c3d4e5f6a7b8"
down_revision: Union[str, Sequence[str], None] = "b2c3d4e5f6a7"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "call_logs",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("caller_id", sa.String(), nullable=False),
        sa.Column("callee_id", sa.String(), nullable=False),
        sa.Column("call_type", sa.String(), nullable=True),
        sa.Column("status", sa.String(), nullable=True),
        sa.Column("started_at", sa.DateTime(), nullable=True),
        sa.Column("ended_at", sa.DateTime(), nullable=True),
        sa.Column("duration_seconds", sa.Integer(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("idx_call_caller", "call_logs", ["caller_id"])
    op.create_index("idx_call_callee", "call_logs", ["callee_id"])
    op.create_index("idx_call_started", "call_logs", ["started_at"])


def downgrade() -> None:
    op.drop_table("call_logs")
