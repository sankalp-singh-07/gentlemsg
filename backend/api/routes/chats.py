import logging
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Request, UploadFile, File, Query
from sqlalchemy.ext.asyncio import AsyncSession

from db.database import get_db
from core.security import get_current_user
from core.limiter import limiter
from schemas.chat import ChatCreate
from schemas.message import MessageCreate, MessageUpdate
from services.chat_service import (
    get_or_create_chat,
    get_user_chats,
    get_chat_by_id,
    get_messages,
    send_message,
    edit_message,
    upload_media,
    get_chat_media,
    mark_chat_read,
    verify_chat_participant,
    soft_delete_message,
    search_messages,
    toggle_reaction,
    pin_chat,
    unpin_chat,
    _message_dict,
    _reply_previews,
)
from pydantic import BaseModel, Field
from websocket.manager import manager
from services.user_service import get_user_by_id

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/chats", tags=["chats"])


@router.get("/")
async def list_chats(
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Get current user's chat list with last messages and receiver profiles."""
    return await get_user_chats(current_user["id"], db)


@router.post("/")
async def create_chat(
    body: ChatCreate,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Create a chat between current user and receiver."""
    receiver = await get_user_by_id(body.receiver_id, db)
    if not receiver:
        raise HTTPException(status_code=404, detail="Receiver not found")

    chat = await get_or_create_chat(current_user["id"], body.receiver_id, db)
    return {
        "id": chat.id,
        "user1_id": chat.user1_id,
        "user2_id": chat.user2_id,
    }


@router.get("/{chat_id}/messages")
async def list_messages(
    chat_id: str,
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
    before_id: Optional[str] = Query(default=None),
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Get messages in a chat. Use before_id for older pages (cursor)."""
    if not await verify_chat_participant(chat_id, current_user["id"], db):
        raise HTTPException(status_code=403, detail="Not authorized to access this chat")

    return await get_messages(
        chat_id, db, limit=limit, offset=offset, before_id=before_id
    )


@router.get("/{chat_id}/messages/search")
async def search_chat_messages(
    chat_id: str,
    q: str = Query(..., min_length=2, max_length=200),
    limit: int = Query(default=50, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Search messages inside a chat."""
    if not await verify_chat_participant(chat_id, current_user["id"], db):
        raise HTTPException(status_code=403, detail="Not authorized to access this chat")

    results = await search_messages(chat_id, q, db, limit=limit)
    return {"messages": results, "query": q}


@router.get("/{chat_id}")
async def get_chat(
    chat_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Get a single chat by ID."""
    if not await verify_chat_participant(chat_id, current_user["id"], db):
        raise HTTPException(status_code=403, detail="Not authorized to access this chat")

    chat = await get_chat_by_id(chat_id, db)
    if not chat:
        raise HTTPException(status_code=404, detail="Chat not found")

    return {
        "id": chat.id,
        "user1_id": chat.user1_id,
        "user2_id": chat.user2_id,
        "last_message": chat.last_message,
        "last_message_type": chat.last_message_type,
        "last_message_at": chat.last_message_at,
        "is_read_by_user1": chat.is_read_by_user1,
        "is_read_by_user2": chat.is_read_by_user2,
        "last_read_message_id_user1": chat.last_read_message_id_user1,
        "last_read_message_id_user2": chat.last_read_message_id_user2,
        "created_at": chat.created_at,
    }


@router.post("/{chat_id}/messages")
@limiter.limit("60/minute")
async def create_message(
    request: Request,
    chat_id: str,
    body: MessageCreate,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Send a text message in a chat. Rate limited: 60/minute."""
    if not await verify_chat_participant(chat_id, current_user["id"], db):
        raise HTTPException(status_code=403, detail="Not authorized to access this chat")

    message = await send_message(
        chat_id=chat_id,
        sender_id=current_user["id"],
        content=body.content,
        msg_type=body.type,
        db=db,
        reply_to_id=body.reply_to_id,
    )

    chat = await get_chat_by_id(chat_id, db)
    previews = await _reply_previews([message], db)
    msg_data = {
        "event": "new_message",
        **_message_dict(
            message,
            chat,
            previews.get(message.reply_to_id) if message.reply_to_id else None,
        ),
    }
    await manager.broadcast_to_chat(chat_id, msg_data)

    if chat:
        receiver_id = (
            chat.user2_id if chat.user1_id == current_user["id"] else chat.user1_id
        )
        await manager.send_to_user(receiver_id, {"event": "chats_updated"})
        await manager.send_to_user(current_user["id"], {"event": "chats_updated"})

    return msg_data


@router.patch("/{chat_id}/messages/{message_id}")
async def patch_message(
    chat_id: str,
    message_id: str,
    body: MessageUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Edit own text message."""
    message = await edit_message(
        chat_id=chat_id,
        message_id=message_id,
        user_id=current_user["id"],
        content=body.content,
        db=db,
    )
    chat = await get_chat_by_id(chat_id, db)
    previews = await _reply_previews([message], db)
    event = {
        "event": "message_edited",
        **_message_dict(
            message,
            chat,
            previews.get(message.reply_to_id) if message.reply_to_id else None,
        ),
    }
    await manager.broadcast_to_chat(chat_id, event)
    return event


@router.delete("/{chat_id}/messages/{message_id}")
async def delete_message(
    chat_id: str,
    message_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Soft-delete a message (only the sender can delete)."""
    result = await soft_delete_message(
        chat_id=chat_id,
        message_id=message_id,
        user_id=current_user["id"],
        db=db,
    )

    await manager.broadcast_to_chat(
        chat_id,
        {
            "event": "message_deleted",
            "messageId": message_id,
        },
    )

    logger.info("Message %s soft-deleted by %s", message_id, current_user["id"])
    return result


@router.post("/{chat_id}/typing")
@limiter.limit("30/minute")
async def typing_indicator(
    request: Request,
    chat_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Send a typing indicator to the chat room via WebSocket."""
    if not await verify_chat_participant(chat_id, current_user["id"], db):
        raise HTTPException(status_code=403, detail="Not authorized to access this chat")

    await manager.broadcast_to_chat(
        chat_id,
        {
            "event": "typing",
            "userId": current_user["id"],
        },
    )
    return {"status": "ok"}


@router.put("/{chat_id}/read")
async def mark_read(
    chat_id: str,
    last_message_id: Optional[str] = Query(default=None),
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Mark a chat as read for the current user."""
    if not await verify_chat_participant(chat_id, current_user["id"], db):
        raise HTTPException(status_code=403, detail="Not authorized to access this chat")

    result = await mark_chat_read(
        chat_id, current_user["id"], db, last_message_id=last_message_id
    )
    if not result.get("ok"):
        raise HTTPException(status_code=404, detail="Chat not found")

    # Notify peer for read receipts
    chat = await get_chat_by_id(chat_id, db)
    if chat:
        peer = (
            chat.user2_id if chat.user1_id == current_user["id"] else chat.user1_id
        )
        await manager.broadcast_to_chat(
            chat_id,
            {
                "event": "messages_read",
                "userId": current_user["id"],
                "lastReadMessageId": result.get("lastReadMessageId"),
            },
        )
        await manager.send_to_user(peer, {"event": "chats_updated"})

    return {"message": "Chat marked as read", **result}


@router.post("/{chat_id}/media")
@limiter.limit("30/minute")
async def upload_chat_media(
    request: Request,
    chat_id: str,
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Upload media file and create a message for it."""
    if not await verify_chat_participant(chat_id, current_user["id"], db):
        raise HTTPException(status_code=403, detail="Not authorized to access this chat")

    result = await upload_media(
        chat_id=chat_id,
        sender_id=current_user["id"],
        file=file,
        db=db,
    )

    msg_data = {
        "event": "new_message",
        "id": result["message_id"],
        "senderId": current_user["id"],
        "message": result["url"],
        "type": result["type"],
        "sentAt": result.get("sent_at"),
        "replyToId": result.get("reply_to_id"),
        "editedAt": None,
        "replyTo": None,
    }
    await manager.broadcast_to_chat(chat_id, msg_data)

    chat = await get_chat_by_id(chat_id, db)
    if chat:
        receiver_id = (
            chat.user2_id if chat.user1_id == current_user["id"] else chat.user1_id
        )
        await manager.send_to_user(receiver_id, {"event": "chats_updated"})
        await manager.send_to_user(current_user["id"], {"event": "chats_updated"})

    return result


@router.get("/{chat_id}/media")
async def list_chat_media(
    chat_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """List all shared media in a chat."""
    if not await verify_chat_participant(chat_id, current_user["id"], db):
        raise HTTPException(status_code=403, detail="Not authorized to access this chat")

    return await get_chat_media(chat_id)


class ReactionBody(BaseModel):
    emoji: str = Field(..., min_length=1, max_length=16)


@router.post("/{chat_id}/messages/{message_id}/reactions")
async def react_to_message(
    chat_id: str,
    message_id: str,
    body: ReactionBody,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Toggle emoji reaction on a message."""
    result = await toggle_reaction(
        chat_id, message_id, current_user["id"], body.emoji, db
    )
    await manager.broadcast_to_chat(
        chat_id,
        {
            "event": "reaction_updated",
            "messageId": message_id,
            "reactions": result["reactions"],
            "userId": current_user["id"],
            "emoji": body.emoji,
            "action": result["action"],
        },
    )
    return result


@router.post("/{chat_id}/pin")
async def pin_chat_route(
    chat_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    return await pin_chat(current_user["id"], chat_id, db)


@router.delete("/{chat_id}/pin")
async def unpin_chat_route(
    chat_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    return await unpin_chat(current_user["id"], chat_id, db)


@router.get("/{chat_id}/files/{filename}")
async def download_chat_file(
    chat_id: str,
    filename: str,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Auth-gated download for a chat attachment."""
    import os
    from fastapi.responses import FileResponse
    from core.config import settings
    from utils import sanitize_filename

    if not await verify_chat_participant(chat_id, current_user["id"], db):
        raise HTTPException(status_code=403, detail="Not authorized to access this chat")

    safe_name = sanitize_filename(filename)
    if safe_name != filename or ".." in filename or "/" in filename or "\\" in filename:
        raise HTTPException(status_code=400, detail="Invalid filename")

    filepath = os.path.join(settings.UPLOAD_DIR, "chats", chat_id, safe_name)
    if not os.path.isfile(filepath):
        raise HTTPException(status_code=404, detail="File not found")

    return FileResponse(filepath)
