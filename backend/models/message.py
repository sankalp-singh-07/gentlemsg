import uuid
from datetime import datetime, timezone
from sqlalchemy import String, DateTime, ForeignKey, Text, Index, Boolean
from sqlalchemy.orm import Mapped, mapped_column
from db.base import Base


class Message(Base):
    __tablename__ = "messages"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    chat_id: Mapped[str] = mapped_column(
        String, ForeignKey("chats.id", ondelete="CASCADE"), nullable=False
    )
    sender_id: Mapped[str] = mapped_column(
        String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    content: Mapped[str] = mapped_column(Text, nullable=False)
    type: Mapped[str] = mapped_column(String, default="text")  # text, image, video, document
    sent_at: Mapped[datetime] = mapped_column(
        DateTime, default=lambda: datetime.now(timezone.utc).replace(tzinfo=None)
    )
    is_deleted: Mapped[bool] = mapped_column(Boolean, default=False, server_default="0")
    # Nullable columns: avoid PEP604 unions for SQLAlchemy 2.0 + Python 3.14
    reply_to_id = mapped_column(
        String, ForeignKey("messages.id", ondelete="SET NULL"), nullable=True
    )
    edited_at = mapped_column(DateTime, nullable=True)

    __table_args__ = (
        Index("idx_message_chat_id", "chat_id"),
        Index("idx_message_sender_id", "sender_id"),
        Index("idx_message_chat_sent", "chat_id", "sent_at"),
    )
