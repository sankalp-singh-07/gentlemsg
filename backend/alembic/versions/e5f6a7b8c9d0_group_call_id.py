"""Add group_id to call_logs for group voice/video calls

Revision ID: e5f6a7b8c9d0
Revises: d4e5f6a7b8c9
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = "e5f6a7b8c9d0"
down_revision: Union[str, Sequence[str], None] = "d4e5f6a7b8c9"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("call_logs", sa.Column("group_id", sa.String(), nullable=True))
    op.create_index("idx_call_group", "call_logs", ["group_id"])


def downgrade() -> None:
    op.drop_index("idx_call_group", table_name="call_logs")
    op.drop_column("call_logs", "group_id")
