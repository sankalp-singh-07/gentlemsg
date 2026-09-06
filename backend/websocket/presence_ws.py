"""Presence WebSocket + WebRTC call signaling relay.

Clients send JSON with event + toUserId for call signaling.
Server stamps fromUserId and forwards to the target user's presence connections.
"""

import asyncio
import json
import logging
from datetime import datetime, timezone

from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query
from sqlalchemy import select, or_

from websocket.manager import manager
from websocket.auth import authenticate_websocket
from db.database import async_session
from models.user import User
from models.chat import Friendship
from models.call_log import CallLog
from services.call_service import create_call_log, update_call_status

logger = logging.getLogger(__name__)
router = APIRouter()

HEARTBEAT_TIMEOUT = 90

CALL_EVENTS = {
    "call_invite",
    "call_accept",
    "call_reject",
    "call_end",
    "call_busy",
    "webrtc_offer",
    "webrtc_answer",
    "webrtc_ice",
}

GROUP_CALL_EVENTS = {
    "group_call_invite",
    "group_call_join",
    "group_call_leave",
    "group_call_end",
    "group_call_reject",
}


async def _handle_call_signal(user_id: str, payload: dict) -> None:
    event = payload.get("event")
    to_user_id = payload.get("toUserId")
    if not event or not to_user_id or event not in CALL_EVENTS:
        return
    if to_user_id == user_id:
        return

    out = {
        "event": event,
        "callId": payload.get("callId"),
        "fromUserId": user_id,
        "toUserId": to_user_id,
        "callType": payload.get("callType") if payload.get("callType") in ("audio", "video") else "audio",
        "fromName": payload.get("fromName") or "",
        "fromPhotoURL": payload.get("fromPhotoURL") or "",
        "groupId": payload.get("groupId") or None,
    }

    if event == "webrtc_offer":
        out["sdp"] = payload.get("sdp")
    elif event == "webrtc_answer":
        out["sdp"] = payload.get("sdp")
    elif event == "webrtc_ice":
        out["candidate"] = payload.get("candidate")

    call_id = out.get("callId")
    if call_id and event in (
        "call_invite",
        "call_accept",
        "call_reject",
        "call_end",
        "call_busy",
    ):
        try:
            async with async_session() as session:
                if event == "call_invite":
                    result = await session.execute(
                        select(User).where(User.id == user_id)
                    )
                    caller = result.scalar_one_or_none()
                    if caller:
                        out["fromName"] = caller.name or out["fromName"]
                        out["fromPhotoURL"] = caller.photo_url or out["fromPhotoURL"]
                    existing = await session.execute(
                        select(CallLog).where(CallLog.id == call_id)
                    )
                    if not existing.scalar_one_or_none():
                        await create_call_log(
                            session,
                            call_id=call_id,
                            caller_id=user_id,
                            callee_id=to_user_id,
                            call_type=out["callType"],
                        )
                    await session.commit()
                else:
                    status_map = {
                        "call_accept": "accepted",
                        "call_reject": "rejected",
                        "call_end": "ended",
                        "call_busy": "missed",
                    }
                    await update_call_status(
                        session,
                        call_id,
                        status_map.get(event, "ended"),
                        duration_seconds=payload.get("durationSeconds"),
                    )
                    await session.commit()
        except Exception as e:
            logger.warning("call log update failed: %s", e, exc_info=True)

    delivered = to_user_id in manager.user_connections
    await manager.send_to_user(to_user_id, out)

    if event == "call_invite" and not delivered:
        await manager.send_to_user(
            user_id,
            {
                "event": "call_peer_unavailable",
                "callId": call_id,
                "toUserId": to_user_id,
            },
        )


async def _handle_group_call_signal(user_id: str, payload: dict) -> None:
    """Relay group-call events to every other member; WebRTC stays pairwise."""
    event = payload.get("event")
    group_id = payload.get("groupId")
    call_id = payload.get("callId")
    if event not in GROUP_CALL_EVENTS or not group_id or not call_id:
        return

    from services.group_service import get_member_user_ids
    from models.group import Group

    async with async_session() as session:
        member_ids = await get_member_user_ids(group_id, session)
        if user_id not in member_ids:
            return

        group_name = ""
        group_avatar = ""
        gr = await session.execute(select(Group).where(Group.id == group_id))
        group = gr.scalar_one_or_none()
        if group:
            group_name = group.name or ""
            group_avatar = group.avatar_url or ""

        caller_name = payload.get("fromName") or ""
        caller_photo = payload.get("fromPhotoURL") or ""
        if event == "group_call_invite":
            ures = await session.execute(select(User).where(User.id == user_id))
            caller = ures.scalar_one_or_none()
            if caller:
                caller_name = caller.name or caller_name
                caller_photo = caller.photo_url or caller_photo
            existing = await session.execute(
                select(CallLog).where(CallLog.id == call_id)
            )
            if not existing.scalar_one_or_none():
                await create_call_log(
                    session,
                    call_id=call_id,
                    caller_id=user_id,
                    callee_id=group_id,
                    call_type=payload.get("callType")
                    if payload.get("callType") in ("audio", "video")
                    else "audio",
                    group_id=group_id,
                )
            await session.commit()
        elif event == "group_call_end":
            await update_call_status(
                session,
                call_id,
                "ended",
                duration_seconds=payload.get("durationSeconds"),
            )
            await session.commit()
        elif event == "group_call_reject":
            # Only mark missed if still ringing (no one joined)
            log_row = await session.execute(
                select(CallLog).where(CallLog.id == call_id)
            )
            log = log_row.scalar_one_or_none()
            if log and log.status == "ringing":
                # Keep ringing — other members may still join
                pass
            await session.commit()

    call_type = (
        payload.get("callType")
        if payload.get("callType") in ("audio", "video")
        else "audio"
    )
    out = {
        "event": event,
        "callId": call_id,
        "groupId": group_id,
        "groupName": group_name,
        "groupAvatarURL": group_avatar,
        "fromUserId": user_id,
        "fromName": caller_name,
        "fromPhotoURL": caller_photo,
        "callType": call_type,
        "durationSeconds": payload.get("durationSeconds"),
        "memberIds": member_ids,
    }

    others = [mid for mid in member_ids if mid != user_id]
    if event == "group_call_invite":
        online = [mid for mid in others if mid in manager.user_connections]
        await manager.broadcast_to_users(others, out)
        if not online:
            await manager.send_to_user(
                user_id,
                {
                    "event": "call_peer_unavailable",
                    "callId": call_id,
                    "groupId": group_id,
                },
            )
        return

    await manager.broadcast_to_users(others, out)


@router.websocket("/ws/presence/{user_id}")
async def presence_websocket(
    websocket: WebSocket,
    user_id: str,
    token: str = Query(default=None),
):
    user = await authenticate_websocket(
        websocket, token, expected_user_id=user_id
    )
    if not user:
        return

    await manager.connect_user(user_id, websocket)

    async with async_session() as session:
        result = await session.execute(select(User).where(User.id == user_id))
        db_user = result.scalar_one_or_none()
        if db_user:
            db_user.is_online = True
            db_user.last_active = datetime.now(timezone.utc).replace(tzinfo=None)
            await session.commit()

            friends_result = await session.execute(
                select(Friendship).where(
                    or_(Friendship.user1_id == user_id, Friendship.user2_id == user_id)
                )
            )
            friends = friends_result.scalars().all()
            friend_ids = [
                f.user2_id if f.user1_id == user_id else f.user1_id for f in friends
            ]
            await manager.broadcast_to_users(
                friend_ids, {"event": "user_online", "userId": user_id}
            )

    try:
        while True:
            try:
                data = await asyncio.wait_for(
                    websocket.receive_text(),
                    timeout=HEARTBEAT_TIMEOUT,
                )
            except asyncio.TimeoutError:
                await websocket.close(code=1000, reason="Heartbeat timeout")
                break

            if data == "ping":
                await websocket.send_text("pong")
                continue

            try:
                payload = json.loads(data)
            except json.JSONDecodeError:
                continue

            if isinstance(payload, dict):
                ev = payload.get("event")
                if ev in GROUP_CALL_EVENTS:
                    await _handle_group_call_signal(user_id, payload)
                elif ev in CALL_EVENTS:
                    await _handle_call_signal(user_id, payload)
    except WebSocketDisconnect:
        pass
    finally:
        await manager.disconnect_user(user_id, websocket)

        if user_id not in manager.user_connections:
            async with async_session() as session:
                result = await session.execute(select(User).where(User.id == user_id))
                db_user = result.scalar_one_or_none()
                if db_user:
                    db_user.is_online = False
                    db_user.last_active = datetime.now(timezone.utc).replace(
                        tzinfo=None
                    )
                    await session.commit()

                    friends_result = await session.execute(
                        select(Friendship).where(
                            or_(
                                Friendship.user1_id == user_id,
                                Friendship.user2_id == user_id,
                            )
                        )
                    )
                    friends = friends_result.scalars().all()
                    friend_ids = [
                        f.user2_id if f.user1_id == user_id else f.user1_id
                        for f in friends
                    ]
                    await manager.broadcast_to_users(
                        friend_ids, {"event": "user_offline", "userId": user_id}
                    )
