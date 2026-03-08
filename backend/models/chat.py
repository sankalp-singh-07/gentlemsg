import uuid
from datetime import datetime, timezone
from sqlalchemy import String, Boolean, DateTime, ForeignKey, Index, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column
from db.base import Base


class Chat(Base):
    __tablename__ = "chats"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user1_id: Mapped[str] = mapped_column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    user2_id: Mapped[str] = mapped_column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    last_message: Mapped[str] = mapped_column(String, default="Start Conversation")
    last_message_type: Mapped[str] = mapped_column(String, default="text")
    last_message_at: Mapped[datetime] = mapped_column(
        DateTime, default=lambda: datetime.now(timezone.utc)
    )
    last_message_sender_id: Mapped[str] = mapped_column(String, nullable=True)
    is_read_by_user1: Mapped[bool] = mapped_column(Boolean, default=True)
    is_read_by_user2: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=lambda: datetime.now(timezone.utc)
    )

    __table_args__ = (
        Index("idx_chat_user1", "user1_id"),
        Index("idx_chat_user2", "user2_id"),
    )


class Friendship(Base):
    __tablename__ = "friendships"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user1_id: Mapped[str] = mapped_column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    user2_id: Mapped[str] = mapped_column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=lambda: datetime.now(timezone.utc)
    )

    __table_args__ = (
        UniqueConstraint("user1_id", "user2_id", name="uq_friendship_pair"),
        Index("idx_friendship_user1", "user1_id"),
        Index("idx_friendship_user2", "user2_id"),
    )
