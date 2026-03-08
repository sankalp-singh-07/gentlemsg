import logging

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.ext.asyncio import AsyncSession
from slowapi.util import get_remote_address

from db.database import get_db
from core.security import get_current_user
from core.limiter import limiter
from schemas.friend import FriendRequestCreate
from services.friend_service import (
    send_request,
    get_requests,
    accept_request,
    reject_request,
    cancel_request,
    get_friends,
    unfriend,
    block_user,
    unblock_user,
    get_blocked_users,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/friends", tags=["friends"])


@router.get("/")
async def list_friends(
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Get current user's friends list with profiles."""
    return await get_friends(current_user["id"], db)


@router.delete("/{friend_id}")
async def remove_friend(
    friend_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Remove a friend (unfriend)."""
    result = await unfriend(current_user["id"], friend_id, db)
    if "error" in result:
        raise HTTPException(status_code=404, detail=result["error"])
    return result


@router.post("/requests")
@limiter.limit("20/minute")
async def create_request(
    request: Request,
    body: FriendRequestCreate,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Send a friend request. Rate limited: 20/minute."""
    fr = await send_request(current_user["id"], body.receiver_id, db)
    logger.info(f"Friend request: {current_user['id']} → {body.receiver_id}")
    return {
        "id": fr.id,
        "senderId": fr.sender_id,
        "receiverId": fr.receiver_id,
        "status": fr.status,
        "createdAt": fr.created_at.isoformat(),
    }


@router.get("/requests")
async def list_requests(
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Get pending friend requests."""
    return await get_requests(current_user["id"], db)


@router.post("/requests/{sender_id}/accept")
async def accept(
    sender_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Accept a friend request."""
    result = await accept_request(current_user["id"], sender_id, db)
    if "error" in result:
        raise HTTPException(status_code=404, detail=result["error"])
    return result


@router.post("/requests/{sender_id}/reject")
async def reject(
    sender_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Reject a friend request."""
    result = await reject_request(current_user["id"], sender_id, db)
    if "error" in result:
        raise HTTPException(status_code=404, detail=result["error"])
    return result


@router.delete("/requests/{receiver_id}")
async def cancel(
    receiver_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Cancel a pending friend request you sent."""
    result = await cancel_request(current_user["id"], receiver_id, db)
    if "error" in result:
        raise HTTPException(status_code=404, detail=result["error"])
    return result


@router.post("/block/{chat_id}")
async def block(
    chat_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Block a user in a chat."""
    result = await block_user(current_user["id"], chat_id, db)
    if "error" in result:
        raise HTTPException(status_code=404, detail=result["error"])
    return result


@router.delete("/block/{chat_id}")
async def unblock(
    chat_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Unblock a user in a chat."""
    result = await unblock_user(current_user["id"], chat_id, db)
    if "error" in result:
        raise HTTPException(status_code=404, detail=result["error"])
    return result


@router.get("/blocked")
async def list_blocked(
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Get blocked users map (keyed by chat_id)."""
    return await get_blocked_users(current_user["id"], db)
