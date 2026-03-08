from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession

from db.database import get_db
from core.security import get_current_user
from services.notification_service import get_notifications, delete_notification

router = APIRouter(prefix="/notifications", tags=["notifications"])


@router.get("")
async def list_notifications(
    limit: int = Query(default=50, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Get notifications for the current user with pagination."""
    return await get_notifications(current_user["id"], db, limit=limit, offset=offset)


@router.delete("/{notification_id}")
async def remove_notification(
    notification_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Delete a notification."""
    deleted = await delete_notification(notification_id, current_user["id"], db)
    if not deleted:
        raise HTTPException(status_code=404, detail="Notification not found")
    return {"message": "Notification deleted"}
