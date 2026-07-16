"""Group chat REST API."""

import logging
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Request, UploadFile, File, Query
from sqlalchemy.ext.asyncio import AsyncSession

from db.database import get_db
from core.security import get_current_user
from core.limiter import limiter
from schemas.group import (
    GroupCreate,
    GroupUpdate,
    GroupMemberAdd,
    GroupMemberRoleUpdate,
    GroupMessageCreate,
    GroupMessageUpdate,
)
from services import group_service as gs
from services.user_service import get_user_by_id
from websocket.manager import manager

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/groups", tags=["groups"])


@router.get("/")
async def list_groups(
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    return await gs.list_user_groups(current_user["id"], db)


@router.post("/")
@limiter.limit("20/minute")
async def create_group(
    request: Request,
    body: GroupCreate,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    group = await gs.create_group(
        owner_id=current_user["id"],
        name=body.name,
        description=body.description or "",
        member_ids=body.member_ids,
        db=db,
    )
    # Notify new members via presence
    for mid in body.member_ids:
        if mid != current_user["id"]:
            await manager.send_to_user(
                mid,
                {"event": "group_created", "group": group},
            )
    return group


@router.get("/{group_id}")
async def get_group(
    group_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    return await gs.get_group(group_id, current_user["id"], db)


@router.patch("/{group_id}")
async def update_group(
    group_id: str,
    body: GroupUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    data = body.model_dump(exclude_none=True)
    group = await gs.update_group(group_id, current_user["id"], data, db)
    await manager.broadcast_to_group(
        group_id, {"event": "group_updated", "group": group}
    )
    return group


@router.delete("/{group_id}")
async def delete_group(
    group_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    member_ids = await gs.get_member_user_ids(group_id, db)
    result = await gs.delete_group(group_id, current_user["id"], db)
    await manager.broadcast_to_users(
        member_ids, {"event": "group_deleted", "groupId": group_id}
    )
    return result


@router.get("/{group_id}/members")
async def list_members(
    group_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    return await gs.list_members(group_id, current_user["id"], db)


@router.post("/{group_id}/members")
async def add_members(
    group_id: str,
    body: GroupMemberAdd,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    result = await gs.add_members(
        group_id, current_user["id"], body.user_ids, db
    )
    await manager.broadcast_to_group(
        group_id, {"event": "members_updated", "groupId": group_id, **result}
    )
    for uid in result.get("added", []):
        await manager.send_to_user(
            uid, {"event": "group_added", "groupId": group_id}
        )
    return result


@router.delete("/{group_id}/members/{user_id}")
async def remove_member(
    group_id: str,
    user_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    result = await gs.remove_member(
        group_id, current_user["id"], user_id, db
    )
    await manager.broadcast_to_group(
        group_id, {"event": "member_removed", "groupId": group_id, "userId": user_id}
    )
    await manager.send_to_user(
        user_id, {"event": "group_removed", "groupId": group_id}
    )
    return result


@router.post("/{group_id}/leave")
async def leave_group(
    group_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    result = await gs.leave_group(group_id, current_user["id"], db)
    await manager.broadcast_to_group(
        group_id,
        {
            "event": "member_removed",
            "groupId": group_id,
            "userId": current_user["id"],
        },
    )
    return result


@router.patch("/{group_id}/members/{user_id}/role")
async def set_role(
    group_id: str,
    user_id: str,
    body: GroupMemberRoleUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    return await gs.set_member_role(
        group_id, current_user["id"], user_id, body.role, db
    )


@router.post("/{group_id}/avatar")
async def upload_avatar(
    group_id: str,
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    return await gs.update_group_avatar(
        group_id, current_user["id"], file, db
    )


@router.get("/{group_id}/messages")
async def list_messages(
    group_id: str,
    limit: int = Query(default=50, ge=1, le=200),
    before_id: Optional[str] = Query(default=None),
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    return await gs.get_messages(
        group_id, current_user["id"], db, limit=limit, before_id=before_id
    )


@router.post("/{group_id}/messages")
@limiter.limit("60/minute")
async def create_message(
    request: Request,
    group_id: str,
    body: GroupMessageCreate,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    msg = await gs.send_message(
        group_id=group_id,
        sender_id=current_user["id"],
        content=body.content,
        msg_type=body.type,
        db=db,
        reply_to_id=body.reply_to_id,
    )
    sender = await get_user_by_id(current_user["id"], db)
    payload = {
        "event": "new_message",
        **gs._message_dict(msg, sender),
    }
    await manager.broadcast_to_group(group_id, payload)

    # Notify members who aren't in the room
    member_ids = await gs.get_member_user_ids(group_id, db)
    await manager.broadcast_to_users(
        member_ids, {"event": "groups_updated", "groupId": group_id}
    )
    return payload


@router.patch("/{group_id}/messages/{message_id}")
async def edit_message(
    group_id: str,
    message_id: str,
    body: GroupMessageUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    msg = await gs.edit_message(
        group_id, message_id, current_user["id"], body.content, db
    )
    sender = await get_user_by_id(current_user["id"], db)
    payload = {"event": "message_edited", **gs._message_dict(msg, sender)}
    await manager.broadcast_to_group(group_id, payload)
    return payload


@router.delete("/{group_id}/messages/{message_id}")
async def delete_message(
    group_id: str,
    message_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    result = await gs.soft_delete_message(
        group_id, message_id, current_user["id"], db
    )
    await manager.broadcast_to_group(
        group_id, {"event": "message_deleted", "messageId": message_id}
    )
    return result


@router.post("/{group_id}/typing")
@limiter.limit("30/minute")
async def typing(
    request: Request,
    group_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    await gs.require_member(group_id, current_user["id"], db)
    await manager.broadcast_to_group(
        group_id, {"event": "typing", "userId": current_user["id"]}
    )
    return {"status": "ok"}
