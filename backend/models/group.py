import uuid
from datetime import datetime, timezone
from sqlalchemy import String, DateTime, ForeignKey, Text, Index, Boolean, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column
from db.base import Base


class Group(Base):
    __tablename__ = "groups"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    name: Mapped[str] = mapped_column(String, nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=True, default="")
    avatar_url: Mapped[str] = mapped_column(String, nullable=True, default="")
    owner_id: Mapped[str] = mapped_column(
        String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    last_message: Mapped[str] = mapped_column(String, default="Group created")
    last_message_at: Mapped[datetime] = mapped_column(
        DateTime, default=lambda: datetime.now(timezone.utc).replace(tzinfo=None)
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=lambda: datetime.now(timezone.utc).replace(tzinfo=None)
    )

    __table_args__ = (
        Index("idx_groups_owner", "owner_id"),
        Index("idx_groups_last_message_at", "last_message_at"),
    )


class GroupMember(Base):
    __tablename__ = "group_members"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    group_id: Mapped[str] = mapped_column(
        String, ForeignKey("groups.id", ondelete="CASCADE"), nullable=False
    )
    user_id: Mapped[str] = mapped_column(
        String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    # owner | admin | member
    role: Mapped[str] = mapped_column(String, default="member", nullable=False)
    joined_at: Mapped[datetime] = mapped_column(
        DateTime, default=lambda: datetime.now(timezone.utc).replace(tzinfo=None)
    )

    __table_args__ = (
        UniqueConstraint("group_id", "user_id", name="uq_group_member"),
        Index("idx_gm_group", "group_id"),
        Index("idx_gm_user", "user_id"),
    )


class GroupMessage(Base):
    __tablename__ = "group_messages"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    group_id: Mapped[str] = mapped_column(
        String, ForeignKey("groups.id", ondelete="CASCADE"), nullable=False
    )
    sender_id: Mapped[str] = mapped_column(
        String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    content: Mapped[str] = mapped_column(Text, nullable=False)
    type: Mapped[str] = mapped_column(String, default="text")
    sent_at: Mapped[datetime] = mapped_column(
        DateTime, default=lambda: datetime.now(timezone.utc).replace(tzinfo=None)
    )
    is_deleted: Mapped[bool] = mapped_column(Boolean, default=False, server_default="0")
    reply_to_id = mapped_column(
        String, ForeignKey("group_messages.id", ondelete="SET NULL"), nullable=True
    )
    edited_at = mapped_column(DateTime, nullable=True)

    __table_args__ = (
        Index("idx_gmsg_group", "group_id"),
        Index("idx_gmsg_group_sent", "group_id", "sent_at"),
    )
