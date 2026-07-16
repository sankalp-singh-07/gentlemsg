from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from models.notification import Notification
from models.user import User


async def get_notifications(
    user_id: str,
    db: AsyncSession,
    limit: int = 50,
    offset: int = 0,
) -> list[dict]:
    """Get notifications for a user with sender profile info and pagination.
    Uses batch fetch to avoid N+1 queries.
    """
    result = await db.execute(
        select(Notification)
        .where(Notification.user_id == user_id)
        .order_by(Notification.created_at.desc())
        .limit(limit)
        .offset(offset)
    )
    notifications = result.scalars().all()

    if not notifications:
        return []

    # Batch fetch all sender profiles
    sender_ids = set(n.from_user_id for n in notifications)
    senders_result = await db.execute(select(User).where(User.id.in_(sender_ids)))
    senders_map = {u.id: u for u in senders_result.scalars().all()}

    notif_list = []
    for notif in notifications:
        sender = senders_map.get(notif.from_user_id)

        notif_list.append({
            "id": notif.id,
            "type": notif.type,
            "from": notif.from_user_id,
            "to": notif.user_id,
            "createdAt": int(notif.created_at.timestamp() * 1000) if notif.created_at else None,
            "userName": sender.user_name if sender else "",
            "name": sender.name if sender else "",
            "photoURL": sender.photo_url if sender else "",
        })

    return notif_list


async def delete_notification(notification_id: str, user_id: str, db: AsyncSession) -> bool:
    """Delete a notification by ID."""
    result = await db.execute(
        select(Notification).where(
            Notification.id == notification_id,
            Notification.user_id == user_id,
        )
    )
    notification = result.scalar_one_or_none()

    if not notification:
        return False

    await db.delete(notification)
    await db.flush()
    return True
