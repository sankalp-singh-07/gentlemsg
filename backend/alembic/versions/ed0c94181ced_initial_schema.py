"""Initial schema for GentleMsg (SQLite + Postgres/Neon compatible)

Revision ID: ed0c94181ced
Revises:
Create Date: 2026-03-08 16:39:40.181812

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "ed0c94181ced"
down_revision: Union[str, Sequence[str], None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "users",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("google_id", sa.String(), nullable=True),
        sa.Column("name", sa.String(), nullable=False),
        sa.Column("email", sa.String(), nullable=False),
        sa.Column("photo_url", sa.String(), nullable=True),
        sa.Column("user_name", sa.String(), nullable=True),
        sa.Column("is_online", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("last_active", sa.DateTime(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("email"),
        sa.UniqueConstraint("google_id"),
    )
    op.create_index("idx_users_user_name", "users", ["user_name"])

    op.create_table(
        "chats",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("user1_id", sa.String(), nullable=False),
        sa.Column("user2_id", sa.String(), nullable=False),
        sa.Column("last_message", sa.String(), nullable=True),
        sa.Column("last_message_type", sa.String(), nullable=True),
        sa.Column("last_message_at", sa.DateTime(), nullable=True),
        sa.Column("last_message_sender_id", sa.String(), nullable=True),
        sa.Column("is_read_by_user1", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("is_read_by_user2", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(["user1_id"], ["users.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["user2_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("user1_id", "user2_id", name="uq_chat_pair"),
    )
    op.create_index("idx_chat_user1", "chats", ["user1_id"])
    op.create_index("idx_chat_user2", "chats", ["user2_id"])
    op.create_index("idx_chat_last_message_at", "chats", ["last_message_at"])

    op.create_table(
        "friendships",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("user1_id", sa.String(), nullable=False),
        sa.Column("user2_id", sa.String(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(["user1_id"], ["users.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["user2_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("user1_id", "user2_id", name="uq_friendship_pair"),
    )
    op.create_index("idx_friendship_user1", "friendships", ["user1_id"])
    op.create_index("idx_friendship_user2", "friendships", ["user2_id"])

    op.create_table(
        "messages",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("chat_id", sa.String(), nullable=False),
        sa.Column("sender_id", sa.String(), nullable=False),
        sa.Column("content", sa.Text(), nullable=False),
        sa.Column("type", sa.String(), nullable=True),
        sa.Column("sent_at", sa.DateTime(), nullable=True),
        sa.Column("is_deleted", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.ForeignKeyConstraint(["chat_id"], ["chats.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["sender_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("idx_message_chat_id", "messages", ["chat_id"])
    op.create_index("idx_message_sender_id", "messages", ["sender_id"])
    op.create_index("idx_message_chat_sent", "messages", ["chat_id", "sent_at"])

    op.create_table(
        "friend_requests",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("sender_id", sa.String(), nullable=False),
        sa.Column("receiver_id", sa.String(), nullable=False),
        sa.Column("status", sa.String(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(["sender_id"], ["users.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["receiver_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("idx_fr_sender", "friend_requests", ["sender_id"])
    op.create_index("idx_fr_receiver", "friend_requests", ["receiver_id"])
    op.create_index("idx_fr_status", "friend_requests", ["status"])

    op.create_table(
        "notifications",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("user_id", sa.String(), nullable=False),
        sa.Column("from_user_id", sa.String(), nullable=False),
        sa.Column("type", sa.String(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["from_user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("idx_notif_user_id", "notifications", ["user_id"])

    op.create_table(
        "blocked_users",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("blocker_id", sa.String(), nullable=False),
        sa.Column("blocked_id", sa.String(), nullable=False),
        sa.Column("chat_id", sa.String(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(["blocker_id"], ["users.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["blocked_id"], ["users.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["chat_id"], ["chats.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("blocker_id", "blocked_id", name="uq_block_pair"),
    )
    op.create_index("idx_blocked_blocker", "blocked_users", ["blocker_id"])
    op.create_index("idx_blocked_chat", "blocked_users", ["chat_id"])


def downgrade() -> None:
    op.drop_table("blocked_users")
    op.drop_table("notifications")
    op.drop_table("friend_requests")
    op.drop_table("messages")
    op.drop_table("friendships")
    op.drop_table("chats")
    op.drop_table("users")
