import uuid
from datetime import datetime, timezone
from sqlalchemy import String, DateTime, Integer, Index
from sqlalchemy.orm import Mapped, mapped_column
from db.base import Base


class CallLog(Base):
    """1:1 call history (group calls later can reuse with group_id)."""

    __tablename__ = "call_logs"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    caller_id: Mapped[str] = mapped_column(String, nullable=False, index=True)
    callee_id: Mapped[str] = mapped_column(String, nullable=False, index=True)
    # Set for group calls (callee_id stores group_id as well for unique row)
    group_id = mapped_column(String, nullable=True, index=True)
    # audio | video
    call_type: Mapped[str] = mapped_column(String, default="audio")
    # ringing | accepted | rejected | missed | ended | failed
    status: Mapped[str] = mapped_column(String, default="ringing")
    started_at: Mapped[datetime] = mapped_column(
        DateTime, default=lambda: datetime.now(timezone.utc).replace(tzinfo=None)
    )
    ended_at = mapped_column(DateTime, nullable=True)
    duration_seconds: Mapped[int] = mapped_column(Integer, default=0)

    __table_args__ = (
        Index("idx_call_caller", "caller_id"),
        Index("idx_call_callee", "callee_id"),
        Index("idx_call_started", "started_at"),
    )
