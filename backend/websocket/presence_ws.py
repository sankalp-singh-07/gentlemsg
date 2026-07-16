import asyncio
from datetime import datetime, timezone

from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_, and_

from websocket.manager import manager
from core.security import verify_ws_token
from db.database import async_session
from models.user import User
from models.chat import Friendship

router = APIRouter()

# Heartbeat: if no ping received within this many seconds, close connection
HEARTBEAT_TIMEOUT = 90  # 3 missed pings at 30s interval


@router.websocket("/ws/presence/{user_id}")
async def presence_websocket(
    websocket: WebSocket,
    user_id: str,
    token: str = Query(default=None),
):
    """WebSocket endpoint for user presence (online/offline status).

    Clients connect with JWT: /ws/presence/{user_id}?token=xxx
    The connection itself signals the user is online.
    On disconnect, the user is marked offline.
    Includes heartbeat timeout: connection is closed if no ping within 90s.
    """
    # Verify JWT token
    if not token:
        await websocket.close(code=4001, reason="Missing authentication token")
        return

    user = verify_ws_token(token)
    if not user or user["id"] != user_id:
        await websocket.close(code=4001, reason="Invalid token or user mismatch")
        return

    await manager.connect_user(user_id, websocket)

    # Set user online in DB
    async with async_session() as session:
        result = await session.execute(select(User).where(User.id == user_id))
        db_user = result.scalar_one_or_none()
        if db_user:
            db_user.is_online = True
            db_user.last_active = datetime.now(timezone.utc)
            await session.commit()
            
            # Fetch user friends to notify them
            friends_result = await session.execute(
                select(Friendship).where(
                    or_(Friendship.user1_id == user_id, Friendship.user2_id == user_id)
                )
            )
            friends = friends_result.scalars().all()
            friend_ids = [f.user2_id if f.user1_id == user_id else f.user1_id for f in friends]
            
            # Broadcast to friends
            await manager.broadcast_to_users(friend_ids, {
                "event": "user_online",
                "userId": user_id
            })

    try:
        while True:
            # Wait for data with a heartbeat timeout
            try:
                data = await asyncio.wait_for(
                    websocket.receive_text(),
                    timeout=HEARTBEAT_TIMEOUT,
                )
            except asyncio.TimeoutError:
                # No ping received within timeout — close stale connection
                await websocket.close(code=1000, reason="Heartbeat timeout")
                break

            # Keep-alive pings
            if data == "ping":
                await websocket.send_text("pong")
    except WebSocketDisconnect:
        pass
    finally:
        await manager.disconnect_user(user_id, websocket)

        # Only set offline if no other connections (tabs/devices) are open for this user
        if user_id not in manager.user_connections:
            # Set user offline in DB
            async with async_session() as session:
                result = await session.execute(select(User).where(User.id == user_id))
                db_user = result.scalar_one_or_none()
                if db_user:
                    db_user.is_online = False
                    db_user.last_active = datetime.now(timezone.utc)
                    await session.commit()
                    
                    # Fetch user friends to notify them
                    friends_result = await session.execute(
                        select(Friendship).where(
                            or_(Friendship.user1_id == user_id, Friendship.user2_id == user_id)
                        )
                    )
                    friends = friends_result.scalars().all()
                    friend_ids = [f.user2_id if f.user1_id == user_id else f.user1_id for f in friends]
                    
                    # Broadcast to friends
                    await manager.broadcast_to_users(friend_ids, {
                        "event": "user_offline",
                        "userId": user_id
                    })
