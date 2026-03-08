from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_, and_

from models.user import User
from models.friend_request import FriendRequest
from models.chat import Chat, Friendship
from models.blocked_user import BlockedUser
from models.notification import Notification
from services.chat_service import get_or_create_chat
from websocket.manager import manager


async def send_request(sender_id: str, receiver_id: str, db: AsyncSession) -> FriendRequest:
    """Send a friend request with full validation."""
    from fastapi import HTTPException
    from services.email_service import send_friend_request_email

    # Prevent self-request
    if sender_id == receiver_id:
        raise HTTPException(status_code=400, detail="Cannot send a friend request to yourself")

    # Check receiver exists
    receiver_result = await db.execute(select(User).where(User.id == receiver_id))
    receiver_user = receiver_result.scalar_one_or_none()
    if not receiver_user:
        raise HTTPException(status_code=404, detail="User not found")

    # Check not already friends
    existing_friendship = await db.execute(
        select(Friendship).where(
            or_(
                and_(Friendship.user1_id == sender_id, Friendship.user2_id == receiver_id),
                and_(Friendship.user1_id == receiver_id, Friendship.user2_id == sender_id),
            )
        )
    )
    if existing_friendship.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Already friends with this user")

    # Check not blocked (either direction)
    blocked = await db.execute(
        select(BlockedUser).where(
            or_(
                and_(BlockedUser.blocker_id == sender_id, BlockedUser.blocked_id == receiver_id),
                and_(BlockedUser.blocker_id == receiver_id, BlockedUser.blocked_id == sender_id),
            )
        )
    )
    if blocked.scalar_one_or_none():
        raise HTTPException(status_code=403, detail="Cannot send request to a blocked user")

    # Check no duplicate pending request
    result = await db.execute(
        select(FriendRequest).where(
            and_(
                FriendRequest.sender_id == sender_id,
                FriendRequest.receiver_id == receiver_id,
                FriendRequest.status == "pending",
            )
        )
    )
    existing = result.scalar_one_or_none()
    if existing:
        return existing

    request = FriendRequest(
        sender_id=sender_id,
        receiver_id=receiver_id,
        status="pending",
    )
    db.add(request)
    await db.flush()

    # Push real-time notification
    sender_result = await db.execute(select(User).where(User.id == sender_id))
    sender = sender_result.scalar_one_or_none()

    if sender:
        await manager.send_to_user(receiver_id, {
            "event": "friend_request",
            "data": {
                "id": request.id,
                "senderId": sender_id,
                "senderName": sender.name,
                "senderPhotoURL": sender.photo_url,
                "status": "pending",
            },
        })

    # Send email notification
    if receiver_user and sender:
        await send_friend_request_email(receiver_user.email, sender.name)

    return request


async def get_requests(user_id: str, db: AsyncSession) -> list[dict]:
    """Get all pending friend requests involving the user.
    Uses batch fetch to avoid N+1 queries.
    """
    result = await db.execute(
        select(FriendRequest).where(
            and_(
                or_(
                    FriendRequest.sender_id == user_id,
                    FriendRequest.receiver_id == user_id,
                ),
                FriendRequest.status == "pending",
            )
        )
    )
    requests = result.scalars().all()

    if not requests:
        return []

    # Collect all user IDs and batch-fetch
    user_ids = set()
    for req in requests:
        user_ids.add(req.sender_id)
        user_ids.add(req.receiver_id)

    users_result = await db.execute(select(User).where(User.id.in_(user_ids)))
    users_map = {u.id: u for u in users_result.scalars().all()}

    request_list = []
    for req in requests:
        sender = users_map.get(req.sender_id)
        receiver = users_map.get(req.receiver_id)

        request_list.append({
            "id": req.id,
            "senderId": req.sender_id,
            "receiverId": req.receiver_id,
            "status": req.status,
            "createdAt": req.created_at.isoformat(),
            "senderName": sender.name if sender else "",
            "senderPhotoURL": sender.photo_url if sender else "",
            "receiverName": receiver.name if receiver else "",
            "receiverPhotoURL": receiver.photo_url if receiver else "",
        })

    return request_list


async def accept_request(user_id: str, sender_id: str, db: AsyncSession) -> dict:
    """Accept a friend request: update status, create friendship, create chat, notify sender."""
    # Find and update the request
    result = await db.execute(
        select(FriendRequest).where(
            and_(
                FriendRequest.sender_id == sender_id,
                FriendRequest.receiver_id == user_id,
                FriendRequest.status == "pending",
            )
        )
    )
    request = result.scalar_one_or_none()
    if not request:
        return {"error": "Request not found"}

    request.status = "accepted"

    # Create friendship
    friendship = Friendship(user1_id=user_id, user2_id=sender_id)
    db.add(friendship)

    # Create chat
    chat = await get_or_create_chat(user_id, sender_id, db)

    # Create notification for sender
    notification = Notification(
        user_id=sender_id,
        from_user_id=user_id,
        type="accepted",
    )
    db.add(notification)

    await db.flush()

    # Push real-time notification to sender via WebSocket
    accepter_result = await db.execute(select(User).where(User.id == user_id))
    accepter = accepter_result.scalar_one_or_none()
    if accepter:
        await manager.send_to_user(sender_id, {
            "event": "request_accepted",
            "data": {
                "senderId": sender_id,
                "chatId": chat.id,
                "acceptedByName": accepter.name,
                "acceptedByPhotoURL": accepter.photo_url,
            },
        })

    return {"senderId": sender_id, "chatId": chat.id}


async def reject_request(user_id: str, sender_id: str, db: AsyncSession) -> dict:
    """Reject a friend request and notify sender."""
    result = await db.execute(
        select(FriendRequest).where(
            and_(
                FriendRequest.sender_id == sender_id,
                FriendRequest.receiver_id == user_id,
                FriendRequest.status == "pending",
            )
        )
    )
    request = result.scalar_one_or_none()
    if not request:
        return {"error": "Request not found"}

    request.status = "rejected"

    # Create notification for sender
    notification = Notification(
        user_id=sender_id,
        from_user_id=user_id,
        type="rejected",
    )
    db.add(notification)

    await db.flush()

    # Push real-time notification to sender via WebSocket
    rejecter_result = await db.execute(select(User).where(User.id == user_id))
    rejecter = rejecter_result.scalar_one_or_none()
    if rejecter:
        await manager.send_to_user(sender_id, {
            "event": "request_rejected",
            "data": {
                "senderId": sender_id,
                "rejectedByName": rejecter.name,
            },
        })

    return {"senderId": sender_id}


async def cancel_request(user_id: str, receiver_id: str, db: AsyncSession) -> dict:
    """Cancel a pending friend request sent by the current user."""
    result = await db.execute(
        select(FriendRequest).where(
            and_(
                FriendRequest.sender_id == user_id,
                FriendRequest.receiver_id == receiver_id,
                FriendRequest.status == "pending",
            )
        )
    )
    request = result.scalar_one_or_none()
    if not request:
        return {"error": "Pending request not found"}

    await db.delete(request)
    await db.flush()

    return {"message": "Request cancelled", "receiverId": receiver_id}


async def get_friends(user_id: str, db: AsyncSession) -> list[dict]:
    """Get all friends for a user with their profiles.
    Uses batch fetch to avoid N+1 queries.
    """
    result = await db.execute(
        select(Friendship).where(
            or_(
                Friendship.user1_id == user_id,
                Friendship.user2_id == user_id,
            )
        )
    )
    friendships = result.scalars().all()

    if not friendships:
        return []

    # Collect friend IDs and batch-fetch
    friend_ids = set()
    for f in friendships:
        friend_id = f.user2_id if f.user1_id == user_id else f.user1_id
        friend_ids.add(friend_id)

    users_result = await db.execute(select(User).where(User.id.in_(friend_ids)))
    users_map = {u.id: u for u in users_result.scalars().all()} # To get a dict which key same as id to find that user fast

    friends = []
    for f in friendships:
        friend_id = f.user2_id if f.user1_id == user_id else f.user1_id
        user = users_map.get(friend_id)
        if user:
            friends.append({
                "id": user.id,
                "name": user.name,
                "email": user.email,
                "photoURL": user.photo_url,
                "userName": user.user_name,
                "isOnline": user.is_online,
            })

    return friends


async def unfriend(user_id: str, friend_id: str, db: AsyncSession) -> dict:
    """Remove a friendship between two users."""
    result = await db.execute(
        select(Friendship).where(
            or_(
                and_(Friendship.user1_id == user_id, Friendship.user2_id == friend_id),
                and_(Friendship.user1_id == friend_id, Friendship.user2_id == user_id),
            )
        )
    )
    friendship = result.scalar_one_or_none()
    if not friendship:
        return {"error": "Friendship not found"}

    await db.delete(friendship)
    await db.flush()

    return {"message": "Friend removed", "friendId": friend_id}


async def block_user(user_id: str, chat_id: str, db: AsyncSession) -> dict:
    """Block a user in a chat."""
    # Find the chat to determine the other user
    result = await db.execute(select(Chat).where(Chat.id == chat_id))
    chat = result.scalar_one_or_none()
    if not chat:
        return {"error": "Chat not found"}

    blocked_id = chat.user2_id if chat.user1_id == user_id else chat.user1_id

    # Check if already blocked
    existing = await db.execute(
        select(BlockedUser).where(
            and_(
                BlockedUser.blocker_id == user_id,
                BlockedUser.chat_id == chat_id,
            )
        )
    )
    if existing.scalar_one_or_none():
        return {"message": "Already blocked"}

    blocked = BlockedUser(
        blocker_id=user_id,
        blocked_id=blocked_id,
        chat_id=chat_id,
    )
    db.add(blocked)
    await db.flush()

    return {"message": "User blocked", "chatId": chat_id}


async def unblock_user(user_id: str, chat_id: str, db: AsyncSession) -> dict:
    """Unblock a user in a chat."""
    result = await db.execute(
        select(BlockedUser).where(
            and_(
                BlockedUser.blocker_id == user_id,
                BlockedUser.chat_id == chat_id,
            )
        )
    )
    blocked = result.scalar_one_or_none()
    if not blocked:
        return {"error": "Block not found"}

    await db.delete(blocked)
    await db.flush()

    return {"message": "User unblocked", "chatId": chat_id}


async def get_blocked_users(user_id: str, db: AsyncSession) -> dict:
    """Get all blocked users for a user, keyed by chat_id (matching frontend format)."""
    result = await db.execute(
        select(BlockedUser).where(
            or_(
                BlockedUser.blocker_id == user_id,
                BlockedUser.blocked_id == user_id,
            )
        )
    )
    blocked_list = result.scalars().all()

    blocked_map = {}
    for b in blocked_list:
        blocked_map[b.chat_id] = {
            "blockedUser": b.blocked_id,
            "blockedBy": b.blocker_id,
        }

    return blocked_map
