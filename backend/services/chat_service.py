import os
import uuid
from datetime import datetime, timezone
from typing import Optional

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_, and_

from models.chat import Chat
from models.message import Message
from models.user import User
from models.blocked_user import BlockedUser
from core.config import settings
from fastapi import HTTPException
from better_profanity import profanity

# Load default swearing words
profanity.load_censor_words()


async def verify_chat_participant(chat_id: str, user_id: str, db: AsyncSession) -> bool:
    """Verify that user is a participant in the chat."""
    result = await db.execute(select(Chat).where(Chat.id == chat_id))
    chat = result.scalar_one_or_none()
    
    if not chat:
        return False
    
    return user_id in (chat.user1_id, chat.user2_id)



async def get_or_create_chat(user1_id: str, user2_id: str, db: AsyncSession) -> Chat:
    """Get existing chat between two users or create a new one."""
    result = await db.execute(
        select(Chat).where(
            or_(
                and_(Chat.user1_id == user1_id, Chat.user2_id == user2_id),
                and_(Chat.user1_id == user2_id, Chat.user2_id == user1_id),
            )
        )
    )
    chat = result.scalar_one_or_none()

    if not chat:
        chat = Chat(
            user1_id=user1_id,
            user2_id=user2_id,
        )
        db.add(chat)
        await db.flush()

    return chat


async def get_user_chats(user_id: str, db: AsyncSession) -> list[dict]:
    """Get all chats for a user with last message and receiver profile info.
    Uses JOINs to avoid N+1 queries.
    """
    # Fetch all chats where user is a participant
    result = await db.execute(
        select(Chat).where(
            or_(Chat.user1_id == user_id, Chat.user2_id == user_id)
        )
    )
    chats = result.scalars().all()

    if not chats:
        return []

    # Collect all receiver IDs and batch-fetch them
    receiver_ids = set()
    for chat in chats:
        receiver_id = chat.user2_id if chat.user1_id == user_id else chat.user1_id
        receiver_ids.add(receiver_id)

    # Batch fetch all receiver profiles in one query
    receiver_result = await db.execute(
        select(User).where(User.id.in_(receiver_ids))
    )
    receivers_map = {u.id: u for u in receiver_result.scalars().all()}

    chat_list = []
    for chat in chats:
        receiver_id = chat.user2_id if chat.user1_id == user_id else chat.user1_id
        receiver = receivers_map.get(receiver_id)

        if receiver:
            # Determine isSeen for the current user
            if chat.user1_id == user_id:
                is_seen = chat.is_read_by_user1
            else:
                is_seen = chat.is_read_by_user2

            chat_list.append({
                "chatId": chat.id,
                "receiverId": receiver_id,
                "senderId": user_id,
                "receiverName": receiver.name,
                "receiverPhotoURL": receiver.photo_url,
                "receiverUserName": receiver.user_name,
                "receiverIsOnline": receiver.is_online,
                "lastMessage": chat.last_message or "Start Conversation",
                "type": chat.last_message_type or "text",
                "sentAt": chat.last_message_at.isoformat() if chat.last_message_at else None,
                "isSeen": is_seen,
            })

    # Sort by last message time (newest first)
    chat_list.sort(key=lambda x: x.get("sentAt") or "", reverse=True)
    return chat_list


async def get_messages(
    chat_id: str,
    db: AsyncSession,
    limit: int = 50,
    offset: int = 0,
) -> list[dict]:
    """Get messages in a chat with pagination. Resolves receiverId from the chat."""
    # Fetch the chat to know both user IDs
    chat_result = await db.execute(select(Chat).where(Chat.id == chat_id))
    chat = chat_result.scalar_one_or_none()

    result = await db.execute(
        select(Message)
        .where(Message.chat_id == chat_id)
        .order_by(Message.sent_at.asc())
        .limit(limit)
        .offset(offset)
    )
    messages = result.scalars().all()

    return [
        {
            "id": msg.id,
            "senderId": msg.sender_id,
            "message": msg.content,
            "type": msg.type,
            "sentAt": msg.sent_at.isoformat(),
            "receiverId": (
                chat.user2_id if msg.sender_id == chat.user1_id else chat.user1_id
            ) if chat else "",
        }
        for msg in messages
    ]


async def send_message(
    chat_id: str,
    sender_id: str,
    content: str,
    msg_type: str,
    db: AsyncSession,
) -> Message:
    """Send a message and update chat's last message + isSeen flags."""
    # Check if sender is blocked
    blocked_check = await db.execute(
        select(BlockedUser).where(
            BlockedUser.chat_id == chat_id,
            or_(
                BlockedUser.blocker_id == sender_id,
                BlockedUser.blocked_id == sender_id
            )
        )
    )
    if blocked_check.scalar_one_or_none():
        raise HTTPException(status_code=403, detail="Cannot send message - user is blocked")

    # Moderate content (censor profanity)
    if msg_type == "text":
        content = profanity.censor(content)

    message = Message(
        chat_id=chat_id,
        sender_id=sender_id,
        content=content,
        type=msg_type,
        sent_at=datetime.now(timezone.utc),
    )
    db.add(message)

    # Update chat's last message metadata and isSeen
    result = await db.execute(select(Chat).where(Chat.id == chat_id))
    chat = result.scalar_one_or_none()
    if chat:
        chat.last_message = content if msg_type == "text" else "[File]"
        chat.last_message_type = msg_type
        chat.last_message_at = datetime.now(timezone.utc)
        chat.last_message_sender_id = sender_id

        # Mark as read for sender, unread for receiver
        if chat.user1_id == sender_id:
            chat.is_read_by_user1 = True
            chat.is_read_by_user2 = False
        else:
            chat.is_read_by_user2 = True
            chat.is_read_by_user1 = False

    await db.flush()
    return message


async def mark_chat_read(chat_id: str, user_id: str, db: AsyncSession) -> bool:
    """Mark a chat as read for the given user."""
    result = await db.execute(select(Chat).where(Chat.id == chat_id))
    chat = result.scalar_one_or_none()
    if not chat:
        return False

    if chat.user1_id == user_id:
        chat.is_read_by_user1 = True
    elif chat.user2_id == user_id:
        chat.is_read_by_user2 = True
    else:
        return False

    await db.flush()
    return True


async def upload_media(
    chat_id: str,
    sender_id: str,
    file,
    db: AsyncSession,
) -> dict:
    """Upload a media file and create a message for it.
    Validates file type, size, and sanitizes filename.
    """
    from utils import validate_upload, sanitize_filename

    # Validate file (type, size, non-empty)
    content = await validate_upload(file)

    upload_dir = os.path.join(settings.UPLOAD_DIR, "chats", chat_id)
    os.makedirs(upload_dir, exist_ok=True)

    # Sanitize and generate unique filename
    safe_name = sanitize_filename(file.filename) if file.filename else "file"
    ext = os.path.splitext(safe_name)[1] or ""
    filename = f"{int(datetime.now(timezone.utc).timestamp())}_{uuid.uuid4().hex[:8]}{ext}"
    filepath = os.path.join(upload_dir, filename)

    with open(filepath, "wb") as f:
        f.write(content)

    file_url = f"/uploads/chats/{chat_id}/{filename}"

    # Determine file type from validated content-type
    content_type = file.content_type or ""
    if "image" in content_type:
        msg_type = "image"
    elif "video" in content_type:
        msg_type = "video"
    elif "pdf" in content_type:
        msg_type = "document"
    else:
        msg_type = "document"

    # Create the message
    message = await send_message(
        chat_id=chat_id,
        sender_id=sender_id,
        content=file_url,
        msg_type=msg_type,
        db=db,
    )

    return {
        "url": file_url,
        "type": msg_type,
        "message_id": message.id,
    }


async def get_chat_media(chat_id: str) -> list[dict]:
    """List all media files in a chat's upload directory."""
    media_dir = os.path.join(settings.UPLOAD_DIR, "chats", chat_id)
    media_list = []

    if not os.path.exists(media_dir):
        return media_list

    for filename in os.listdir(media_dir):
        filepath = os.path.join(media_dir, filename)
        if not os.path.isfile(filepath):
            continue

        ext = os.path.splitext(filename)[1].lower()
        if ext in [".jpg", ".jpeg", ".png", ".gif", ".webp"]:
            content_type = f"image/{ext[1:]}"
        elif ext in [".mp4", ".webm", ".mov"]:
            content_type = f"video/{ext[1:]}"
        elif ext == ".pdf":
            content_type = "application/pdf"
        else:
            content_type = "application/octet-stream"

        media_list.append({
            "url": f"/uploads/chats/{chat_id}/{filename}",
            "contentType": content_type,
            "filename": filename,
        })

    return media_list
