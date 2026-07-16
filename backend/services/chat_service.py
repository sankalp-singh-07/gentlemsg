import os
import uuid
from datetime import datetime, timezone
from typing import Optional

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_, and_, desc

from models.chat import Chat
from models.message import Message
from models.user import User
from models.blocked_user import BlockedUser
from core.config import settings
from fastapi import HTTPException


async def verify_chat_participant(chat_id: str, user_id: str, db: AsyncSession) -> bool:
    """Verify that user is a participant in the chat."""
    result = await db.execute(select(Chat).where(Chat.id == chat_id))
    chat = result.scalar_one_or_none()

    if not chat:
        return False

    return user_id in (chat.user1_id, chat.user2_id)


async def get_chat_by_id(chat_id: str, db: AsyncSession) -> Chat:
    """Get a specific chat by ID."""
    result = await db.execute(select(Chat).where(Chat.id == chat_id))
    return result.scalar_one_or_none()


def _ordered_pair(a: str, b: str) -> tuple[str, str]:
    """Return (user1_id, user2_id) with lexicographic order for unique pair constraint."""
    return (a, b) if a < b else (b, a)


def _message_dict(
    msg: Message,
    chat: Optional[Chat] = None,
    reply_preview: Optional[dict] = None,
) -> dict:
    receiver_id = ""
    if chat:
        receiver_id = (
            chat.user2_id if msg.sender_id == chat.user1_id else chat.user1_id
        )
    return {
        "id": msg.id,
        "senderId": msg.sender_id,
        "message": msg.content,
        "type": msg.type,
        "sentAt": msg.sent_at.isoformat() if msg.sent_at else None,
        "receiverId": receiver_id,
        "replyToId": msg.reply_to_id,
        "editedAt": msg.edited_at.isoformat() if msg.edited_at else None,
        "replyTo": reply_preview,
    }


async def get_or_create_chat(user1_id: str, user2_id: str, db: AsyncSession) -> Chat:
    """Get existing chat between two users or create a new one."""
    if user1_id == user2_id:
        raise HTTPException(status_code=400, detail="Cannot create a chat with yourself")

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
        ordered_u1, ordered_u2 = _ordered_pair(user1_id, user2_id)
        chat = Chat(
            user1_id=ordered_u1,
            user2_id=ordered_u2,
        )
        db.add(chat)
        await db.flush()

    return chat


async def get_user_chats(user_id: str, db: AsyncSession) -> list[dict]:
    """Get all chats for a user with last message and receiver profile info."""
    result = await db.execute(
        select(Chat).where(
            or_(Chat.user1_id == user_id, Chat.user2_id == user_id)
        )
    )
    chats = result.scalars().all()

    if not chats:
        return []

    receiver_ids = set()
    for chat in chats:
        receiver_id = chat.user2_id if chat.user1_id == user_id else chat.user1_id
        receiver_ids.add(receiver_id)

    receiver_result = await db.execute(
        select(User).where(User.id.in_(receiver_ids))
    )
    receivers_map = {u.id: u for u in receiver_result.scalars().all()}

    chat_list = []
    for chat in chats:
        receiver_id = chat.user2_id if chat.user1_id == user_id else chat.user1_id
        receiver = receivers_map.get(receiver_id)

        if receiver:
            if chat.user1_id == user_id:
                is_seen = chat.is_read_by_user1
                last_read_id = chat.last_read_message_id_user1
            else:
                is_seen = chat.is_read_by_user2
                last_read_id = chat.last_read_message_id_user2

            chat_list.append({
                "chatId": chat.id,
                "receiverId": receiver_id,
                "senderId": user_id,
                "receiverName": receiver.name,
                "receiverPhotoURL": receiver.photo_url,
                "receiverUserName": receiver.user_name,
                "receiverIsOnline": receiver.is_online,
                "receiverLastActive": (
                    receiver.last_active.isoformat() if receiver.last_active else None
                ),
                "lastMessage": chat.last_message or "Start Conversation",
                "type": chat.last_message_type or "text",
                "sentAt": chat.last_message_at.isoformat() if chat.last_message_at else None,
                "isSeen": is_seen,
                "lastReadMessageId": last_read_id,
            })

    chat_list.sort(key=lambda x: x.get("sentAt") or "", reverse=True)
    return chat_list


async def _reply_previews(
    messages: list[Message],
    db: AsyncSession,
) -> dict[str, dict]:
    """Batch-load parent messages for reply previews."""
    reply_ids = {m.reply_to_id for m in messages if m.reply_to_id}
    if not reply_ids:
        return {}

    result = await db.execute(select(Message).where(Message.id.in_(reply_ids)))
    parents = result.scalars().all()
    previews = {}
    for p in parents:
        preview_text = p.content
        if p.is_deleted:
            preview_text = "Deleted message"
        elif p.type != "text":
            preview_text = f"[{p.type}]"
        elif len(preview_text) > 80:
            preview_text = preview_text[:80] + "…"
        previews[p.id] = {
            "id": p.id,
            "senderId": p.sender_id,
            "message": preview_text,
            "type": p.type,
            "isDeleted": p.is_deleted,
        }
    return previews


async def get_messages(
    chat_id: str,
    db: AsyncSession,
    limit: int = 50,
    offset: int = 0,
    before_id: Optional[str] = None,
) -> dict:
    """Get messages with optional cursor pagination (before_id = load older)."""
    chat_result = await db.execute(select(Chat).where(Chat.id == chat_id))
    chat = chat_result.scalar_one_or_none()

    query = select(Message).where(
        Message.chat_id == chat_id,
        Message.is_deleted == False,  # noqa: E712
    )

    if before_id:
        anchor = await db.execute(
            select(Message).where(Message.id == before_id, Message.chat_id == chat_id)
        )
        anchor_msg = anchor.scalar_one_or_none()
        if anchor_msg and anchor_msg.sent_at:
            query = query.where(Message.sent_at < anchor_msg.sent_at)
            query = query.order_by(desc(Message.sent_at)).limit(limit)
            result = await db.execute(query)
            messages = list(reversed(result.scalars().all()))
        else:
            messages = []
    else:
        # Latest page: last `limit` messages in chronological order
        # Use offset for simple pagination, or take last N
        if offset > 0:
            result = await db.execute(
                query.order_by(Message.sent_at.asc()).limit(limit).offset(offset)
            )
            messages = list(result.scalars().all())
        else:
            # Fetch newest first then reverse for natural reading order
            result = await db.execute(
                query.order_by(desc(Message.sent_at)).limit(limit)
            )
            messages = list(reversed(result.scalars().all()))

    previews = await _reply_previews(messages, db)
    payload = [
        _message_dict(m, chat, previews.get(m.reply_to_id) if m.reply_to_id else None)
        for m in messages
    ]

    last_read = None
    if chat:
        # last read of the *other* user (for delivery/read receipts on own messages)
        # and of current viewer is returned separately by mark_read
        last_read = {
            "user1": chat.last_read_message_id_user1,
            "user2": chat.last_read_message_id_user2,
            "user1Id": chat.user1_id,
            "user2Id": chat.user2_id,
        }

    has_more = len(messages) == limit
    return {
        "messages": payload,
        "hasMore": has_more,
        "lastRead": last_read,
    }


async def search_messages(
    chat_id: str,
    query: str,
    db: AsyncSession,
    limit: int = 50,
) -> list[dict]:
    """Search text messages inside a chat (case-insensitive contains)."""
    q = (query or "").strip()
    if len(q) < 2:
        return []

    chat = await get_chat_by_id(chat_id, db)
    result = await db.execute(
        select(Message)
        .where(
            Message.chat_id == chat_id,
            Message.is_deleted == False,  # noqa: E712
            Message.type == "text",
            Message.content.ilike(f"%{q}%"),
        )
        .order_by(desc(Message.sent_at))
        .limit(limit)
    )
    messages = result.scalars().all()
    return [_message_dict(m, chat) for m in messages]


async def send_message(
    chat_id: str,
    sender_id: str,
    content: str,
    msg_type: str,
    db: AsyncSession,
    reply_to_id: Optional[str] = None,
) -> Message:
    """Send a message and update chat's last message + isSeen flags."""
    blocked_check = await db.execute(
        select(BlockedUser).where(
            BlockedUser.chat_id == chat_id,
            or_(
                BlockedUser.blocker_id == sender_id,
                BlockedUser.blocked_id == sender_id,
            ),
        )
    )
    if blocked_check.scalar_one_or_none():
        raise HTTPException(status_code=403, detail="Cannot send message - user is blocked")

    if reply_to_id:
        parent = await db.execute(
            select(Message).where(
                Message.id == reply_to_id,
                Message.chat_id == chat_id,
            )
        )
        if not parent.scalar_one_or_none():
            raise HTTPException(status_code=400, detail="Reply target not found in this chat")

    message = Message(
        chat_id=chat_id,
        sender_id=sender_id,
        content=content,
        type=msg_type,
        reply_to_id=reply_to_id,
        sent_at=datetime.now(timezone.utc).replace(tzinfo=None),
    )
    db.add(message)

    result = await db.execute(select(Chat).where(Chat.id == chat_id))
    chat = result.scalar_one_or_none()
    if chat:
        preview = content if msg_type == "text" else f"[{msg_type.capitalize()}]"
        if msg_type == "text" and len(preview) > 200:
            preview = preview[:200]
        chat.last_message = preview
        chat.last_message_type = msg_type
        chat.last_message_at = datetime.now(timezone.utc).replace(tzinfo=None)
        chat.last_message_sender_id = sender_id

        if chat.user1_id == sender_id:
            chat.is_read_by_user1 = True
            chat.is_read_by_user2 = False
        else:
            chat.is_read_by_user2 = True
            chat.is_read_by_user1 = False

    await db.flush()
    return message


async def edit_message(
    chat_id: str,
    message_id: str,
    user_id: str,
    content: str,
    db: AsyncSession,
) -> Message:
    """Edit own text message."""
    if not await verify_chat_participant(chat_id, user_id, db):
        raise HTTPException(status_code=403, detail="Not authorized to access this chat")

    result = await db.execute(
        select(Message).where(
            Message.id == message_id,
            Message.chat_id == chat_id,
        )
    )
    message = result.scalar_one_or_none()
    if not message or message.is_deleted:
        raise HTTPException(status_code=404, detail="Message not found")
    if message.sender_id != user_id:
        raise HTTPException(status_code=403, detail="Can only edit your own messages")
    if message.type != "text":
        raise HTTPException(status_code=400, detail="Only text messages can be edited")

    message.content = content
    message.edited_at = datetime.now(timezone.utc).replace(tzinfo=None)

    # Update chat preview if this was the last message
    chat = await get_chat_by_id(chat_id, db)
    if chat and chat.last_message_sender_id == user_id:
        # Rough check: if last_message_at matches this message's sent_at, update preview
        if chat.last_message_at and message.sent_at and chat.last_message_at == message.sent_at:
            chat.last_message = content[:200] if len(content) > 200 else content

    await db.flush()
    return message


async def soft_delete_message(
    chat_id: str,
    message_id: str,
    user_id: str,
    db: AsyncSession,
) -> dict:
    """Soft-delete a message. Only the sender may delete."""
    if not await verify_chat_participant(chat_id, user_id, db):
        raise HTTPException(status_code=403, detail="Not authorized to access this chat")

    result = await db.execute(
        select(Message).where(
            Message.id == message_id,
            Message.chat_id == chat_id,
        )
    )
    message = result.scalar_one_or_none()

    if not message:
        raise HTTPException(status_code=404, detail="Message not found")

    if message.sender_id != user_id:
        raise HTTPException(status_code=403, detail="Can only delete your own messages")

    if message.is_deleted:
        return {"message": "Message already deleted", "messageId": message_id}

    message.is_deleted = True
    message.content = ""
    await db.flush()
    return {"message": "Message deleted", "messageId": message_id}


async def mark_chat_read(
    chat_id: str,
    user_id: str,
    db: AsyncSession,
    last_message_id: Optional[str] = None,
) -> dict:
    """Mark a chat as read for the given user; optionally set last_read_message_id."""
    result = await db.execute(select(Chat).where(Chat.id == chat_id))
    chat = result.scalar_one_or_none()
    if not chat:
        return {"ok": False}

    if user_id not in (chat.user1_id, chat.user2_id):
        return {"ok": False}

    # Default last message in chat
    if not last_message_id:
        latest = await db.execute(
            select(Message)
            .where(Message.chat_id == chat_id, Message.is_deleted == False)  # noqa: E712
            .order_by(desc(Message.sent_at))
            .limit(1)
        )
        latest_msg = latest.scalar_one_or_none()
        last_message_id = latest_msg.id if latest_msg else None

    if chat.user1_id == user_id:
        chat.is_read_by_user1 = True
        if last_message_id:
            chat.last_read_message_id_user1 = last_message_id
    else:
        chat.is_read_by_user2 = True
        if last_message_id:
            chat.last_read_message_id_user2 = last_message_id

    await db.flush()
    return {
        "ok": True,
        "lastReadMessageId": last_message_id,
        "userId": user_id,
    }


async def upload_media(
    chat_id: str,
    sender_id: str,
    file,
    db: AsyncSession,
    reply_to_id: Optional[str] = None,
) -> dict:
    """Upload a media file and create a message for it."""
    from utils import validate_upload, sanitize_filename

    content = await validate_upload(file)

    upload_dir = os.path.join(settings.UPLOAD_DIR, "chats", chat_id)
    os.makedirs(upload_dir, exist_ok=True)

    safe_name = sanitize_filename(file.filename) if file.filename else "file"
    ext = os.path.splitext(safe_name)[1] or ""
    filename = f"{int(datetime.now(timezone.utc).replace(tzinfo=None).timestamp())}_{uuid.uuid4().hex[:8]}{ext}"
    filepath = os.path.join(upload_dir, filename)

    with open(filepath, "wb") as f:
        f.write(content)

    file_url = f"/uploads/chats/{chat_id}/{filename}"

    content_type = file.content_type or ""
    if "image" in content_type:
        msg_type = "image"
    elif "video" in content_type:
        msg_type = "video"
    elif "pdf" in content_type:
        msg_type = "document"
    else:
        msg_type = "document"

    message = await send_message(
        chat_id=chat_id,
        sender_id=sender_id,
        content=file_url,
        msg_type=msg_type,
        db=db,
        reply_to_id=reply_to_id,
    )

    return {
        "url": file_url,
        "type": msg_type,
        "message_id": message.id,
        "sent_at": message.sent_at.isoformat() if message.sent_at else None,
        "reply_to_id": message.reply_to_id,
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
