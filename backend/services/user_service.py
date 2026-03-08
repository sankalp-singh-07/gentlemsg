import os
import uuid
from datetime import datetime, timezone

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_

from models.user import User
from core.config import settings
from utils import validate_avatar, sanitize_filename


async def get_user_by_id(user_id: str, db: AsyncSession) -> User | None:
    result = await db.execute(select(User).where(User.id == user_id))
    return result.scalar_one_or_none()


async def search_users(username: str, db: AsyncSession) -> list[User]:
    result = await db.execute(
        select(User).where(User.user_name == username)
    )
    return list(result.scalars().all())


async def update_profile(user_id: str, data: dict, db: AsyncSession) -> User | None:
    user = await get_user_by_id(user_id, db)
    if not user:
        return None

    if "user_name" in data and data["user_name"] is not None:
        user.user_name = data["user_name"]
    if "name" in data and data["name"] is not None:
        user.name = data["name"]

    await db.flush()
    return user


async def update_status(user_id: str, is_online: bool, db: AsyncSession) -> User | None:
    user = await get_user_by_id(user_id, db)
    if not user:
        return None

    user.is_online = is_online
    user.last_active = datetime.now(timezone.utc)
    await db.flush()
    return user


async def update_avatar(user_id: str, file, db: AsyncSession) -> str | None:
    user = await get_user_by_id(user_id, db)
    if not user:
        return None

    # Validate file (images only, 2MB max)
    content = await validate_avatar(file)

    # Create uploads directory
    upload_dir = os.path.join(settings.UPLOAD_DIR, "profile_pictures")
    os.makedirs(upload_dir, exist_ok=True)

    # Generate sanitized filename
    safe_name = sanitize_filename(file.filename) if file.filename else "avatar.png"
    ext = os.path.splitext(safe_name)[1] or ".png"
    filename = f"{user_id}_{uuid.uuid4().hex[:8]}{ext}"
    filepath = os.path.join(upload_dir, filename)

    with open(filepath, "wb") as f:
        f.write(content)

    # Update user photo URL (relative path for serving)
    photo_url = f"/uploads/profile_pictures/{filename}"
    user.photo_url = photo_url
    await db.flush()

    return photo_url


async def delete_user_account(user_id: str, db: AsyncSession) -> bool:
    """Delete a user account and let CASCADE handle related records."""
    user = await get_user_by_id(user_id, db)
    if not user:
        return False
        
    await db.delete(user)
    await db.flush()
    return True


async def export_user_data(user_id: str, db: AsyncSession) -> dict | None:
    """Export all user data in JSON format for GDPR compliance."""
    user = await get_user_by_id(user_id, db)
    if not user:
        return None
        
    # Get all chats where user is participant
    from models.chat import Chat
    from models.message import Message
    from models.friend_request import FriendRequest
    from models.blocked_user import BlockedUser
    
    chats_result = await db.execute(
        select(Chat).where(or_(Chat.user1_id == user_id, Chat.user2_id == user_id))
    )
    chats = chats_result.scalars().all()
    chat_ids = [c.id for c in chats]
    
    # Get messages
    messages = []
    if chat_ids:
        msgs_result = await db.execute(
            select(Message).where(Message.chat_id.in_(chat_ids))
        )
        for m in msgs_result.scalars().all():
            messages.append({
                "id": m.id,
                "chat_id": m.chat_id,
                "sender_id": m.sender_id,
                "content": m.content,
                "type": m.type,
                "sent_at": m.sent_at.isoformat() if m.sent_at else None
            })
            
    # Get friend requests
    freqs_result = await db.execute(
        select(FriendRequest).where(or_(FriendRequest.sender_id == user_id, FriendRequest.receiver_id == user_id))
    )
    friend_requests = [{
        "id": fr.id,
        "sender_id": fr.sender_id, 
        "receiver_id": fr.receiver_id,
        "status": fr.status
    } for fr in freqs_result.scalars().all()]
    
    # Get blocked users
    blocks_result = await db.execute(select(BlockedUser).where(BlockedUser.blocker_id == user_id))
    blocks = [{"blocked_id": b.blocked_id, "chat_id": b.chat_id} for b in blocks_result.scalars().all()]

    return {
        "profile": {
            "id": user.id,
            "name": user.name,
            "user_name": user.user_name,
            "email": user.email,
            "photo_url": user.photo_url,
            "created_at": user.created_at.isoformat() if user.created_at else None,
            "last_active": user.last_active.isoformat() if user.last_active else None
        },
        "chats": [{"id": c.id, "created_at": c.created_at.isoformat()} for c in chats],
        "messages": messages,
        "friend_requests": friend_requests,
        "blocked_users": blocks
    }
