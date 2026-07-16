import uuid
from datetime import datetime, timezone
from sqlalchemy import String, DateTime, ForeignKey, Index
from sqlalchemy.orm import Mapped, mapped_column
from db.base import Base


class FriendRequest(Base):
    __tablename__ = "friend_requests"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    sender_id: Mapped[str] = mapped_column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    receiver_id: Mapped[str] = mapped_column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    status: Mapped[str] = mapped_column(String, default="pending")  # pending, accepted, rejected
    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=lambda: datetime.now(timezone.utc).replace(tzinfo=None)
    )

    __table_args__ = (
        Index("idx_fr_sender", "sender_id"),
        Index("idx_fr_receiver", "receiver_id"),
        Index("idx_fr_status", "status"),
    )
