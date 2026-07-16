"""Call log helpers for 1:1 WebRTC calls."""

from datetime import datetime, timezone
from sqlalchemy import select, or_, desc
from sqlalchemy.ext.asyncio import AsyncSession

from models.call_log import CallLog
from models.user import User


async def create_call_log(
    db: AsyncSession,
    *,
    call_id: str,
    caller_id: str,
    callee_id: str,
    call_type: str = "audio",
) -> CallLog:
    log = CallLog(
        id=call_id,
        caller_id=caller_id,
        callee_id=callee_id,
        call_type=call_type if call_type in ("audio", "video") else "audio",
        status="ringing",
        started_at=datetime.now(timezone.utc).replace(tzinfo=None),
    )
    db.add(log)
    await db.flush()
    return log


async def update_call_status(
    db: AsyncSession,
    call_id: str,
    status: str,
    *,
    duration_seconds: int | None = None,
) -> CallLog | None:
    result = await db.execute(select(CallLog).where(CallLog.id == call_id))
    log = result.scalar_one_or_none()
    if not log:
        return None
    log.status = status
    if status in ("ended", "rejected", "missed", "failed"):
        log.ended_at = datetime.now(timezone.utc).replace(tzinfo=None)
        if duration_seconds is not None:
            log.duration_seconds = max(0, duration_seconds)
        elif log.started_at and log.ended_at:
            log.duration_seconds = int((log.ended_at - log.started_at).total_seconds())
    if status == "accepted":
        pass
    await db.flush()
    return log


async def list_call_logs(
    user_id: str,
    db: AsyncSession,
    limit: int = 50,
) -> list[dict]:
    result = await db.execute(
        select(CallLog)
        .where(or_(CallLog.caller_id == user_id, CallLog.callee_id == user_id))
        .order_by(desc(CallLog.started_at))
        .limit(limit)
    )
    logs = list(result.scalars().all())
    if not logs:
        return []

    user_ids = set()
    for l in logs:
        user_ids.add(l.caller_id)
        user_ids.add(l.callee_id)
    users_result = await db.execute(select(User).where(User.id.in_(user_ids)))
    users = {u.id: u for u in users_result.scalars().all()}

    out = []
    for l in logs:
        peer_id = l.callee_id if l.caller_id == user_id else l.caller_id
        peer = users.get(peer_id)
        out.append({
            "id": l.id,
            "callerId": l.caller_id,
            "calleeId": l.callee_id,
            "callType": l.call_type,
            "status": l.status,
            "startedAt": l.started_at.isoformat() if l.started_at else None,
            "endedAt": l.ended_at.isoformat() if l.ended_at else None,
            "durationSeconds": l.duration_seconds or 0,
            "direction": "outgoing" if l.caller_id == user_id else "incoming",
            "peerId": peer_id,
            "peerName": peer.name if peer else "",
            "peerPhotoURL": peer.photo_url if peer else "",
        })
    return out
