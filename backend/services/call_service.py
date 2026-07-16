"""Call log helpers for 1:1 WebRTC calls."""

import json
from datetime import datetime, timezone
from sqlalchemy import select, or_, desc
from sqlalchemy.ext.asyncio import AsyncSession

from models.call_log import CallLog
from models.user import User
from models.message import Message
from services.chat_service import get_or_create_chat, _message_dict
from websocket.manager import manager


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

    prev = log.status
    terminal = ("ended", "rejected", "missed", "failed")

    # Already terminal — only refresh duration if this is a real ended call
    if prev in terminal:
        if status == "ended" and duration_seconds is not None:
            log.duration_seconds = max(0, duration_seconds)
            await db.flush()
        return log

    # Ringing + end with 0 duration = missed / no answer
    if status == "ended" and prev == "ringing" and (duration_seconds or 0) == 0:
        status = "missed"

    log.status = status
    if status in terminal:
        log.ended_at = datetime.now(timezone.utc).replace(tzinfo=None)
        if duration_seconds is not None:
            log.duration_seconds = max(0, duration_seconds)
        elif log.started_at and log.ended_at:
            log.duration_seconds = int(
                (log.ended_at - log.started_at).total_seconds()
            )
    await db.flush()

    # Persist a system call row into the 1:1 chat thread (once)
    if status in terminal:
        try:
            await _insert_call_chat_message(db, log)
        except Exception:
            pass
    return log


async def _insert_call_chat_message(db: AsyncSession, log: CallLog) -> None:
    """Create a type=call message so both users see a call log in the thread."""
    chat = await get_or_create_chat(log.caller_id, log.callee_id, db)
    # Avoid duplicate system messages for the same call id
    existing = await db.execute(
        select(Message).where(
            Message.chat_id == chat.id,
            Message.type == "call",
            Message.content.contains(log.id),
        )
    )
    if existing.scalar_one_or_none():
        return

    payload = {
        "callId": log.id,
        "status": log.status,
        "callType": log.call_type,
        "durationSeconds": log.duration_seconds or 0,
        "callerId": log.caller_id,
        "calleeId": log.callee_id,
    }
    msg = Message(
        chat_id=chat.id,
        sender_id=log.caller_id,
        content=json.dumps(payload),
        type="call",
    )
    db.add(msg)
    chat.last_message = _call_preview_text(log)
    chat.last_message_type = "call"
    chat.last_message_at = datetime.now(timezone.utc).replace(tzinfo=None)
    # Unread for the peer who did not initiate the end action is hard to
    # know here — mark both as unread-ish for the non-caller on missed/rejected
    if log.status in ("missed", "rejected"):
        if chat.user1_id == log.callee_id:
            chat.is_read_by_user1 = False
        else:
            chat.is_read_by_user2 = False
    await db.flush()

    body = _message_dict(msg, chat)
    body["event"] = "new_message"
    await manager.broadcast_to_chat(chat.id, body)
    # Presence-side refresh so sidebar previews update even if chat WS is closed
    await manager.send_to_user(
        log.caller_id, {"event": "chats_updated", "chatId": chat.id}
    )
    await manager.send_to_user(
        log.callee_id, {"event": "chats_updated", "chatId": chat.id}
    )


def _call_preview_text(log: CallLog) -> str:
    kind = "Video" if log.call_type == "video" else "Voice"
    if log.status == "missed":
        return f"Missed {kind.lower()} call"
    if log.status == "rejected":
        return f"{kind} call declined"
    if log.status == "ended":
        secs = log.duration_seconds or 0
        if secs > 0:
            m, s = divmod(secs, 60)
            return f"{kind} call · {m}:{s:02d}"
        return f"{kind} call"
    return f"{kind} call"


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
