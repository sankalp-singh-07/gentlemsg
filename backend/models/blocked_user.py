import uuid
from datetime import datetime, timezone
from sqlalchemy import String, DateTime, ForeignKey, Index
from sqlalchemy.orm import Mapped, mapped_column
from db.base import Base


class BlockedUser(Base):
    __tablename__ = "blocked_users"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    blocker_id: Mapped[str] = mapped_column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    blocked_id: Mapped[str] = mapped_column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    chat_id: Mapped[str] = mapped_column(String, ForeignKey("chats.id", ondelete="CASCADE"), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=lambda: datetime.now(timezone.utc).replace(tzinfo=None)
    )

    __table_args__ = (
        Index("idx_blocked_blocker", "blocker_id"),
        Index("idx_blocked_chat", "chat_id"),
    )
