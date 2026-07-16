"""WebSocket for group chat rooms."""

import json
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query
from sqlalchemy import select

from websocket.manager import manager
from websocket.auth import authenticate_websocket
from db.database import async_session
from models.group import GroupMember

router = APIRouter()


@router.websocket("/ws/group/{group_id}")
async def group_websocket(
    websocket: WebSocket,
    group_id: str,
    token: str = Query(default=None),
):
    user = await authenticate_websocket(websocket, token)
    if not user:
        return

    async with async_session() as session:
        result = await session.execute(
            select(GroupMember).where(
                GroupMember.group_id == group_id,
                GroupMember.user_id == user["id"],
            )
        )
        if not result.scalar_one_or_none():
            await websocket.close(code=4003, reason="Not a group member")
            return

    await manager.connect_group(group_id, websocket)
    try:
        while True:
            data = await websocket.receive_text()
            if data == "ping":
                await websocket.send_text("pong")
                continue
            try:
                msg = json.loads(data)
            except json.JSONDecodeError:
                continue
            if isinstance(msg, dict) and msg.get("event") == "typing":
                await manager.broadcast_to_group(
                    group_id,
                    {"event": "typing", "userId": user["id"]},
                )
    except WebSocketDisconnect:
        await manager.disconnect_group(group_id, websocket)
