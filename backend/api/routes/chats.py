import logging

from fastapi import APIRouter, Depends, HTTPException, Request, UploadFile, File, Query
from sqlalchemy.ext.asyncio import AsyncSession

from db.database import get_db
from core.security import get_current_user
from core.limiter import limiter
from schemas.chat import ChatCreate
from schemas.message import MessageCreate
from services.chat_service import (
    get_or_create_chat,
    get_user_chats,
    get_chat_by_id,
    get_messages,
    send_message,
    upload_media,
    get_chat_media,
    mark_chat_read,
    verify_chat_participant,
    soft_delete_message,
)
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
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Get messages in a chat with pagination."""
    if not await verify_chat_participant(chat_id, current_user["id"], db):
        raise HTTPException(status_code=403, detail="Not authorized to access this chat")

    messages = await get_messages(chat_id, db, limit=limit, offset=offset)
    return {"messages": messages}


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
    )

    # Broadcast via WebSocket to chat room
    msg_data = {
        "event": "new_message",
        "id": message.id,
        "senderId": message.sender_id,
        "message": message.content,
        "type": message.type,
        "sentAt": message.sent_at.isoformat(),
    }
    await manager.broadcast_to_chat(chat_id, msg_data)

    chat = await get_chat_by_id(chat_id, db)
    if chat:
        receiver_id = chat.user2_id if chat.user1_id == current_user["id"] else chat.user1_id
        await manager.send_to_user(receiver_id, {"event": "chats_updated"})
        await manager.send_to_user(current_user["id"], {"event": "chats_updated"})

    return msg_data


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

    await manager.broadcast_to_chat(chat_id, {
        "event": "message_deleted",
        "messageId": message_id,
    })

    logger.info(f"Message {message_id} soft-deleted by {current_user['id']}")
    return result


@router.post("/{chat_id}/typing")
@limiter.limit("30/minute")
async def typing_indicator(
    request: Request,
    chat_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Send a typing indicator to the chat room via WebSocket. Rate limited: 30/minute."""
    if not await verify_chat_participant(chat_id, current_user["id"], db):
        raise HTTPException(status_code=403, detail="Not authorized to access this chat")

    await manager.broadcast_to_chat(chat_id, {
        "event": "typing",
        "userId": current_user["id"],
    })
    return {"status": "ok"}


@router.put("/{chat_id}/read")
async def mark_read(
    chat_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Mark a chat as read for the current user."""
    if not await verify_chat_participant(chat_id, current_user["id"], db):
        raise HTTPException(status_code=403, detail="Not authorized to access this chat")

    success = await mark_chat_read(chat_id, current_user["id"], db)
    if not success:
        raise HTTPException(status_code=404, detail="Chat not found")
    return {"message": "Chat marked as read"}


@router.post("/{chat_id}/media")
@limiter.limit("30/minute")
async def upload_chat_media(
    request: Request,
    chat_id: str,
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Upload media file and create a message for it. Rate limited: 30/minute."""
    if not await verify_chat_participant(chat_id, current_user["id"], db):
        raise HTTPException(status_code=403, detail="Not authorized to access this chat")

    result = await upload_media(
        chat_id=chat_id,
        sender_id=current_user["id"],
        file=file,
        db=db,
    )

    # Broadcast via WebSocket
    msg_data = {
        "event": "new_message",
        "id": result["message_id"],
        "senderId": current_user["id"],
        "message": result["url"],
        "type": result["type"],
        "sentAt": result.get("sent_at"),
    }
    await manager.broadcast_to_chat(chat_id, msg_data)

    chat = await get_chat_by_id(chat_id, db)
    if chat:
        receiver_id = chat.user2_id if chat.user1_id == current_user["id"] else chat.user1_id
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


@router.get("/{chat_id}/files/{filename}")
async def download_chat_file(
    chat_id: str,
    filename: str,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Auth-gated download for a chat attachment (participant only).

    Prefer this over public /uploads when SERVE_UPLOADS_PUBLIC is false.
    """
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
