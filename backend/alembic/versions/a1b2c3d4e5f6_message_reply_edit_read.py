"""Add reply_to, edited_at, last_read_message_id columns

Revision ID: a1b2c3d4e5f6
Revises: ed0c94181ced
Create Date: 2026-07-16

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "a1b2c3d4e5f6"
down_revision: Union[str, Sequence[str], None] = "ed0c94181ced"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    with op.batch_alter_table("messages") as batch:
        batch.add_column(sa.Column("reply_to_id", sa.String(), nullable=True))
        batch.add_column(sa.Column("edited_at", sa.DateTime(), nullable=True))
        batch.create_foreign_key(
            "fk_messages_reply_to",
            "messages",
            ["reply_to_id"],
            ["id"],
            ondelete="SET NULL",
        )

    with op.batch_alter_table("chats") as batch:
        batch.add_column(sa.Column("last_read_message_id_user1", sa.String(), nullable=True))
        batch.add_column(sa.Column("last_read_message_id_user2", sa.String(), nullable=True))


def downgrade() -> None:
    with op.batch_alter_table("chats") as batch:
        batch.drop_column("last_read_message_id_user2")
        batch.drop_column("last_read_message_id_user1")

    with op.batch_alter_table("messages") as batch:
        batch.drop_constraint("fk_messages_reply_to", type_="foreignkey")
        batch.drop_column("edited_at")
        batch.drop_column("reply_to_id")
