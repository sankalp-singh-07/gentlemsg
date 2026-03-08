from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query
from websocket.manager import manager
from core.security import verify_ws_token
import json
from db.database import async_session
from sqlalchemy import select
from models.chat import Chat

router = APIRouter()


@router.websocket("/ws/chat/{chat_id}")
async def chat_websocket(
    websocket: WebSocket,
    chat_id: str,
    token: str = Query(default=None),
):
    """WebSocket endpoint for real-time chat messages.

    Clients connect with a JWT token as query param: /ws/chat/{chat_id}?token=xxx
    Messages are broadcast when sent via the REST API (POST /chats/{chat_id}/messages).
    """
    # Verify JWT token
    if not token:
        await websocket.close(code=4001, reason="Missing authentication token")
        return

    user = verify_ws_token(token)
    if not user:
        await websocket.close(code=4001, reason="Invalid or expired token")
        return

    # Verify chat membership
    async with async_session() as session:
        result = await session.execute(select(Chat).where(Chat.id == chat_id))
        chat = result.scalar_one_or_none()
        
        if not chat or user["id"] not in (chat.user1_id, chat.user2_id):
            await websocket.close(code=4003, reason="Not authorized for this chat")
            return

    await manager.connect_chat(chat_id, websocket)
    try:
        while True:
            # Keep connection alive, listen for client messages (pings, etc.)
            data = await websocket.receive_text()
            # Client can send messages directly via WS too
            if data == "ping":
                await websocket.send_text("pong")
            else:
                try:
                    msg = json.loads(data)
                    msg["senderId"] = user["id"]  # Ensure senderId from token
                    await manager.broadcast_to_chat(chat_id, msg)
                except json.JSONDecodeError:
                    pass
    except WebSocketDisconnect:
        await manager.disconnect_chat(chat_id, websocket)
