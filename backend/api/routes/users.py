from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Request, Query
from sqlalchemy.ext.asyncio import AsyncSession

from db.database import get_db
from core.security import get_current_user
from core.limiter import limiter
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
@limiter.limit("60/minute")
async def search(
    request: Request,
    username: str = Query(..., min_length=1, max_length=64),
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Ranked user search by username/name. Rate limited: 60/minute. No emails."""
    return await search_users(
        username,
        db,
        current_user_id=current_user["id"],
        limit=20,
    )


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
    # Do not expose other users' email addresses
    return {
        "id": user.id,
        "name": user.name,
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
    from services.user_service import is_username_taken, generate_username_suggestions
    
    if body.user_name:
        is_taken = await is_username_taken(body.user_name, db, exclude_user_id=current_user["id"])
        if is_taken:
            suggestions = await generate_username_suggestions(body.user_name, db)
            raise HTTPException(
                status_code=409, 
                detail={
                    "message": "Username has already been taken.",
                    "suggestions": suggestions
                }
            )

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
