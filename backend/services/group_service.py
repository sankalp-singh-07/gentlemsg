"""Group chat business logic."""

from __future__ import annotations

import os
import uuid
from datetime import datetime, timezone
from typing import Optional

from fastapi import HTTPException
from sqlalchemy import select, desc, or_
from sqlalchemy.ext.asyncio import AsyncSession

from models.group import Group, GroupMember, GroupMessage
from models.user import User
from core.config import settings


ROLE_OWNER = "owner"
ROLE_ADMIN = "admin"
ROLE_MEMBER = "member"


async def _get_membership(
    group_id: str, user_id: str, db: AsyncSession
) -> GroupMember | None:
    result = await db.execute(
        select(GroupMember).where(
            GroupMember.group_id == group_id,
            GroupMember.user_id == user_id,
        )
    )
    return result.scalar_one_or_none()


async def require_member(group_id: str, user_id: str, db: AsyncSession) -> GroupMember:
    m = await _get_membership(group_id, user_id, db)
    if not m:
        raise HTTPException(status_code=403, detail="Not a group member")
    return m


async def require_admin(group_id: str, user_id: str, db: AsyncSession) -> GroupMember:
    m = await require_member(group_id, user_id, db)
    if m.role not in (ROLE_OWNER, ROLE_ADMIN):
        raise HTTPException(status_code=403, detail="Admin privileges required")
    return m


async def require_owner(group_id: str, user_id: str, db: AsyncSession) -> GroupMember:
    m = await require_member(group_id, user_id, db)
    if m.role != ROLE_OWNER:
        raise HTTPException(status_code=403, detail="Owner privileges required")
    return m


def _group_dict(group: Group, member_count: int = 0, my_role: str | None = None) -> dict:
    return {
        "id": group.id,
        "name": group.name,
        "description": group.description or "",
        "avatarURL": group.avatar_url or "",
        "ownerId": group.owner_id,
        "lastMessage": group.last_message or "",
        "lastMessageAt": group.last_message_at.isoformat() if group.last_message_at else None,
        "createdAt": group.created_at.isoformat() if group.created_at else None,
        "memberCount": member_count,
        "myRole": my_role,
    }


def _message_dict(msg: GroupMessage, sender: User | None = None) -> dict:
    return {
        "id": msg.id,
        "groupId": msg.group_id,
        "senderId": msg.sender_id,
        "senderName": sender.name if sender else "",
        "senderPhotoURL": sender.photo_url if sender else "",
        "message": msg.content,
        "type": msg.type,
        "sentAt": msg.sent_at.isoformat() if msg.sent_at else None,
        "replyToId": msg.reply_to_id,
        "editedAt": msg.edited_at.isoformat() if msg.edited_at else None,
    }


async def create_group(
    owner_id: str,
    name: str,
    description: str,
    member_ids: list[str],
    db: AsyncSession,
) -> dict:
    group = Group(
        name=name.strip(),
        description=(description or "").strip(),
        owner_id=owner_id,
        last_message="Group created",
        last_message_at=datetime.now(timezone.utc).replace(tzinfo=None),
    )
    db.add(group)
    await db.flush()

    # Owner membership
    db.add(
        GroupMember(
            group_id=group.id,
            user_id=owner_id,
            role=ROLE_OWNER,
        )
    )

    # Add unique members (must be friends for portfolio simplicity? allow any existing user)
    unique_ids = []
    for mid in member_ids:
        if mid and mid != owner_id and mid not in unique_ids:
            unique_ids.append(mid)

    valid: set[str] = set()
    if unique_ids:
        users_result = await db.execute(select(User).where(User.id.in_(unique_ids)))
        valid = {u.id for u in users_result.scalars().all()}
        for mid in unique_ids:
            if mid in valid:
                db.add(
                    GroupMember(
                        group_id=group.id,
                        user_id=mid,
                        role=ROLE_MEMBER,
                    )
                )

    await db.flush()
    count = 1 + len(valid)
    return _group_dict(group, member_count=count, my_role=ROLE_OWNER)


async def list_user_groups(user_id: str, db: AsyncSession) -> list[dict]:
    result = await db.execute(
        select(GroupMember).where(GroupMember.user_id == user_id)
    )
    memberships = list(result.scalars().all())
    if not memberships:
        return []

    group_ids = [m.group_id for m in memberships]
    role_map = {m.group_id: m.role for m in memberships}

    groups_result = await db.execute(select(Group).where(Group.id.in_(group_ids)))
    groups = list(groups_result.scalars().all())

    # member counts
    all_members = await db.execute(
        select(GroupMember).where(GroupMember.group_id.in_(group_ids))
    )
    counts: dict[str, int] = {}
    for m in all_members.scalars().all():
        counts[m.group_id] = counts.get(m.group_id, 0) + 1

    items = [
        _group_dict(g, member_count=counts.get(g.id, 0), my_role=role_map.get(g.id))
        for g in groups
    ]
    items.sort(key=lambda x: x.get("lastMessageAt") or "", reverse=True)
    return items


async def get_group(group_id: str, user_id: str, db: AsyncSession) -> dict:
    membership = await require_member(group_id, user_id, db)
    result = await db.execute(select(Group).where(Group.id == group_id))
    group = result.scalar_one_or_none()
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")

    count_result = await db.execute(
        select(GroupMember).where(GroupMember.group_id == group_id)
    )
    count = len(list(count_result.scalars().all()))
    return _group_dict(group, member_count=count, my_role=membership.role)


async def update_group(
    group_id: str,
    user_id: str,
    data: dict,
    db: AsyncSession,
) -> dict:
    await require_admin(group_id, user_id, db)
    result = await db.execute(select(Group).where(Group.id == group_id))
    group = result.scalar_one_or_none()
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")

    if data.get("name") is not None:
        group.name = data["name"].strip()
    if data.get("description") is not None:
        group.description = data["description"].strip()

    await db.flush()
    return await get_group(group_id, user_id, db)


async def delete_group(group_id: str, user_id: str, db: AsyncSession) -> dict:
    await require_owner(group_id, user_id, db)
    result = await db.execute(select(Group).where(Group.id == group_id))
    group = result.scalar_one_or_none()
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")

    # cascade deletes members + messages via FK
    await db.delete(group)
    await db.flush()
    return {"message": "Group deleted", "groupId": group_id}


async def list_members(group_id: str, user_id: str, db: AsyncSession) -> list[dict]:
    await require_member(group_id, user_id, db)
    result = await db.execute(
        select(GroupMember).where(GroupMember.group_id == group_id)
    )
    members = list(result.scalars().all())
    user_ids = [m.user_id for m in members]
    users_result = await db.execute(select(User).where(User.id.in_(user_ids)))
    users_map = {u.id: u for u in users_result.scalars().all()}

    out = []
    for m in members:
        u = users_map.get(m.user_id)
        out.append({
            "userId": m.user_id,
            "role": m.role,
            "joinedAt": m.joined_at.isoformat() if m.joined_at else None,
            "name": u.name if u else "",
            "userName": u.user_name if u else "",
            "photoURL": u.photo_url if u else "",
            "isOnline": u.is_online if u else False,
        })
    # owner first, then admin, then member
    order = {ROLE_OWNER: 0, ROLE_ADMIN: 1, ROLE_MEMBER: 2}
    out.sort(key=lambda x: (order.get(x["role"], 9), x["name"].lower()))
    return out


async def add_members(
    group_id: str,
    actor_id: str,
    user_ids: list[str],
    db: AsyncSession,
) -> dict:
    await require_admin(group_id, actor_id, db)

    existing = await db.execute(
        select(GroupMember).where(GroupMember.group_id == group_id)
    )
    already = {m.user_id for m in existing.scalars().all()}

    users_result = await db.execute(select(User).where(User.id.in_(user_ids)))
    valid = {u.id for u in users_result.scalars().all()}

    added = []
    for uid in user_ids:
        if uid in already or uid not in valid:
            continue
        db.add(
            GroupMember(group_id=group_id, user_id=uid, role=ROLE_MEMBER)
        )
        added.append(uid)

    await db.flush()
    return {"added": added, "groupId": group_id}


async def remove_member(
    group_id: str,
    actor_id: str,
    target_id: str,
    db: AsyncSession,
) -> dict:
    actor = await require_admin(group_id, actor_id, db)
    target = await _get_membership(group_id, target_id, db)
    if not target:
        raise HTTPException(status_code=404, detail="Member not found")

    if target.role == ROLE_OWNER:
        raise HTTPException(status_code=400, detail="Cannot remove the group owner")

    # Admins cannot remove other admins unless actor is owner
    if target.role == ROLE_ADMIN and actor.role != ROLE_OWNER:
        raise HTTPException(status_code=403, detail="Only owner can remove admins")

    await db.delete(target)
    await db.flush()
    return {"removed": target_id, "groupId": group_id}


async def leave_group(group_id: str, user_id: str, db: AsyncSession) -> dict:
    membership = await require_member(group_id, user_id, db)
    if membership.role == ROLE_OWNER:
        raise HTTPException(
            status_code=400,
            detail="Owner cannot leave; transfer ownership or delete the group",
        )
    await db.delete(membership)
    await db.flush()
    return {"message": "Left group", "groupId": group_id}


async def set_member_role(
    group_id: str,
    actor_id: str,
    target_id: str,
    role: str,
    db: AsyncSession,
) -> dict:
    await require_owner(group_id, actor_id, db)
    if role not in (ROLE_ADMIN, ROLE_MEMBER):
        raise HTTPException(status_code=400, detail="Invalid role")
    target = await _get_membership(group_id, target_id, db)
    if not target:
        raise HTTPException(status_code=404, detail="Member not found")
    if target.role == ROLE_OWNER:
        raise HTTPException(status_code=400, detail="Cannot change owner role")
    target.role = role
    await db.flush()
    return {"userId": target_id, "role": role}


async def get_messages(
    group_id: str,
    user_id: str,
    db: AsyncSession,
    limit: int = 50,
    before_id: Optional[str] = None,
) -> dict:
    await require_member(group_id, user_id, db)

    query = select(GroupMessage).where(
        GroupMessage.group_id == group_id,
        GroupMessage.is_deleted == False,  # noqa: E712
    )

    if before_id:
        anchor = await db.execute(
            select(GroupMessage).where(
                GroupMessage.id == before_id,
                GroupMessage.group_id == group_id,
            )
        )
        a = anchor.scalar_one_or_none()
        if a and a.sent_at:
            result = await db.execute(
                query.where(GroupMessage.sent_at < a.sent_at)
                .order_by(desc(GroupMessage.sent_at))
                .limit(limit)
            )
            messages = list(reversed(result.scalars().all()))
        else:
            messages = []
    else:
        result = await db.execute(
            query.order_by(desc(GroupMessage.sent_at)).limit(limit)
        )
        messages = list(reversed(result.scalars().all()))

    sender_ids = {m.sender_id for m in messages}
    senders_map: dict[str, User] = {}
    if sender_ids:
        sr = await db.execute(select(User).where(User.id.in_(sender_ids)))
        senders_map = {u.id: u for u in sr.scalars().all()}

    return {
        "messages": [_message_dict(m, senders_map.get(m.sender_id)) for m in messages],
        "hasMore": len(messages) == limit,
    }


async def send_message(
    group_id: str,
    sender_id: str,
    content: str,
    msg_type: str,
    db: AsyncSession,
    reply_to_id: Optional[str] = None,
) -> GroupMessage:
    await require_member(group_id, sender_id, db)

    if reply_to_id:
        parent = await db.execute(
            select(GroupMessage).where(
                GroupMessage.id == reply_to_id,
                GroupMessage.group_id == group_id,
            )
        )
        if not parent.scalar_one_or_none():
            raise HTTPException(status_code=400, detail="Reply target not found")

    msg = GroupMessage(
        group_id=group_id,
        sender_id=sender_id,
        content=content,
        type=msg_type,
        reply_to_id=reply_to_id,
        sent_at=datetime.now(timezone.utc).replace(tzinfo=None),
    )
    db.add(msg)

    gr = await db.execute(select(Group).where(Group.id == group_id))
    group = gr.scalar_one_or_none()
    if group:
        preview = content if msg_type == "text" else f"[{msg_type.capitalize()}]"
        group.last_message = preview[:200]
        group.last_message_at = msg.sent_at

    await db.flush()
    return msg


async def edit_message(
    group_id: str,
    message_id: str,
    user_id: str,
    content: str,
    db: AsyncSession,
) -> GroupMessage:
    await require_member(group_id, user_id, db)
    result = await db.execute(
        select(GroupMessage).where(
            GroupMessage.id == message_id,
            GroupMessage.group_id == group_id,
        )
    )
    msg = result.scalar_one_or_none()
    if not msg or msg.is_deleted:
        raise HTTPException(status_code=404, detail="Message not found")
    if msg.sender_id != user_id:
        raise HTTPException(status_code=403, detail="Can only edit your own messages")
    if msg.type != "text":
        raise HTTPException(status_code=400, detail="Only text messages can be edited")

    msg.content = content
    msg.edited_at = datetime.now(timezone.utc).replace(tzinfo=None)
    await db.flush()
    return msg


async def soft_delete_message(
    group_id: str,
    message_id: str,
    user_id: str,
    db: AsyncSession,
) -> dict:
    membership = await require_member(group_id, user_id, db)
    result = await db.execute(
        select(GroupMessage).where(
            GroupMessage.id == message_id,
            GroupMessage.group_id == group_id,
        )
    )
    msg = result.scalar_one_or_none()
    if not msg:
        raise HTTPException(status_code=404, detail="Message not found")

    # Sender or admin/owner can delete
    if msg.sender_id != user_id and membership.role not in (ROLE_OWNER, ROLE_ADMIN):
        raise HTTPException(status_code=403, detail="Not allowed to delete this message")

    msg.is_deleted = True
    msg.content = ""
    await db.flush()
    return {"message": "Message deleted", "messageId": message_id}


async def update_group_avatar(
    group_id: str,
    user_id: str,
    file,
    db: AsyncSession,
) -> dict:
    await require_admin(group_id, user_id, db)
    from utils import validate_avatar, sanitize_filename

    content = await validate_avatar(file)
    upload_dir = os.path.join(settings.UPLOAD_DIR, "groups", group_id)
    os.makedirs(upload_dir, exist_ok=True)

    safe_name = sanitize_filename(file.filename) if file.filename else "avatar.png"
    ext = os.path.splitext(safe_name)[1] or ".png"
    filename = f"{uuid.uuid4().hex[:10]}{ext}"
    filepath = os.path.join(upload_dir, filename)

    with open(filepath, "wb") as f:
        f.write(content)

    url = f"{settings.API_BASE_URL.rstrip('/')}/uploads/groups/{group_id}/{filename}"
    result = await db.execute(select(Group).where(Group.id == group_id))
    group = result.scalar_one_or_none()
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")
    group.avatar_url = url
    await db.flush()
    return {"avatarURL": url}


async def get_member_user_ids(group_id: str, db: AsyncSession) -> list[str]:
    result = await db.execute(
        select(GroupMember.user_id).where(GroupMember.group_id == group_id)
    )
    return [row[0] for row in result.all()]
