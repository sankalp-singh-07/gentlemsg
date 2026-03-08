from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.ext.asyncio import AsyncSession

from db.database import get_db
from core.security import get_current_user
from schemas.user import UserProfileUpdate, UserStatusUpdate
from services.user_service import (
    search_users,
    get_user_by_id,
    update_profile,
    update_status,
    update_avatar,
    delete_user_account,
    export_user_data,
)

router = APIRouter(prefix="/users", tags=["users"])


@router.get("/search")
async def search(
    username: str,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Search users by username."""
    users = await search_users(username, db)
    return [
        {
            "uid": u.id,
            "id": u.id,
            "name": u.name,
            "email": u.email,
            "photoURL": u.photo_url,
            "userName": u.user_name,
        }
        for u in users
        if u.id != current_user["id"]
    ]


@router.get("/{user_id}")
async def get_user(
    user_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Get a user's profile by ID."""
    user = await get_user_by_id(user_id, db)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return {
        "id": user.id,
        "name": user.name,
        "email": user.email,
        "photoURL": user.photo_url,
        "userName": user.user_name,
        "isOnline": user.is_online,
        "lastActive": user.last_active.isoformat() if user.last_active else None,
    }


@router.patch("/me/profile")
async def update_user_profile(
    body: UserProfileUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Update current user's name and/or username."""
    user = await update_profile(current_user["id"], body.model_dump(exclude_none=True), db)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return {
        "id": user.id,
        "name": user.name,
        "userName": user.user_name,
        "email": user.email,
        "photoURL": user.photo_url,
    }


@router.patch("/me/status")
async def update_user_status(
    body: UserStatusUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Update current user's online status."""
    user = await update_status(current_user["id"], body.is_online, db)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return {"isOnline": user.is_online}


@router.post("/me/avatar")
async def upload_avatar(
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Upload a new profile picture."""
    photo_url = await update_avatar(current_user["id"], file, db)
    if not photo_url:
        raise HTTPException(status_code=404, detail="User not found")
    return {"photoURL": photo_url}


@router.delete("/me")
async def delete_account(
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Delete current user's account and all associated data."""
    success = await delete_user_account(current_user["id"], db)
    if not success:
        raise HTTPException(status_code=404, detail="User not found")
    return {"message": "Account successfully deleted"}


@router.get("/me/export")
async def export_data(
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Export all user data (GDPR compliance)."""
    data = await export_user_data(current_user["id"], db)
    if not data:
        raise HTTPException(status_code=404, detail="User not found")
    return data
