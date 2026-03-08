import logging

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.ext.asyncio import AsyncSession
from slowapi import Limiter
from slowapi.util import get_remote_address

from db.database import get_db
from core.security import get_current_user, create_access_token, verify_token
from core.limiter import limiter
from schemas.auth import GoogleAuthRequest, TokenResponse
from services.auth_service import authenticate_with_google
from services.user_service import get_user_by_id, update_status

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/google", response_model=TokenResponse)
@limiter.limit("10/minute")
async def google_login(
    request: Request,
    body: GoogleAuthRequest,
    db: AsyncSession = Depends(get_db),
):
    """Authenticate with Google OAuth. Rate limited: 10/minute."""
    logger.info(f"Google login attempt from {get_remote_address(request)}")
    result = await authenticate_with_google(body.token, db)
    return result


@router.post("/refresh")
@limiter.limit("30/minute")
async def refresh_token(
    request: Request,
    current_user: dict = Depends(get_current_user),
):
    """Refresh JWT token. Rate limited: 30/minute."""
    new_token = create_access_token(
        data={"sub": current_user["id"], "email": current_user["email"]}
    )
    return {"access_token": new_token, "token_type": "bearer"}


@router.post("/logout")
async def logout(
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Set user offline on logout."""
    await update_status(current_user["id"], False, db)
    logger.info(f"User {current_user['id']} logged out")
    return {"message": "Logged out successfully"}


@router.get("/me")
async def get_me(
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get the current authenticated user's profile."""
    user = await get_user_by_id(current_user["id"], db)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return {
        "id": user.id,
        "name": user.name,
        "email": user.email,
        "photoURL": user.photo_url,
        "userName": user.user_name,
        "isOnline": user.is_online,
    }