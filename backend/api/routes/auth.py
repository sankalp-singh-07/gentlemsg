import logging

from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.responses import RedirectResponse
from sqlalchemy.ext.asyncio import AsyncSession
from starlette.responses import JSONResponse

from core.constants import ACCESS_TOKEN_TYPE
from db.database import get_db
from core.security import get_current_user, create_token, verify_refresh_token
from core.limiter import limiter
from services.auth_service import authenticate_with_google
from services.user_service import get_user_by_id, update_status
from core.config import settings

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/auth", tags=["auth"])

@router.get("/google/login")
async def google_login():
    """Redirect to Google's OAuth 2.0 consent screen."""
    google_auth_url = (
        f"https://accounts.google.com/o/oauth2/v2/auth?"
        f"client_id={settings.GOOGLE_CLIENT_ID}&"
        f"redirect_uri={settings.GOOGLE_REDIRECT_URI}&"
        f"response_type=code&"
        f"scope=openid profile email&"
        f"access_type=offline&"
        f"prompt=consent"
    )
    return RedirectResponse(google_auth_url)


@router.get("/google/callback")
async def google_callback(
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    """Handle Google OAuth callback, authenticate user, and redirect to frontend with token."""
    code = request.query_params.get("code")
    if not code:
        raise HTTPException(status_code=400, detail="Authorization code missing")

    try:
        result = await authenticate_with_google(code, db)
        # Deliver access token via query param for SPA localStorage; refresh stays httpOnly cookie
        access_token = result["access_token"]
        redirect_url = f"{settings.FRONTEND_URL}/auth/callback?token={access_token}"
        response = RedirectResponse(redirect_url)
        response.set_cookie(
            key="refresh_token",
            value=result["refresh_token"],
            httponly=True,
            secure=settings.is_production,
            samesite="lax",
            path="/",
            max_age=60 * 60 * 24 * 7,  # match refresh token lifetime
        )
        return response

    except Exception as e:
        logger.error(f"Google OAuth callback error: {str(e)}")
        return RedirectResponse(f"{settings.FRONTEND_URL}/?error=oauth_failed")


@router.post("/refresh")
@limiter.limit("30/minute")
async def refresh_access_token(request: Request):

    refresh_token = request.cookies.get("refresh_token")

    if not refresh_token:
        raise HTTPException(status_code=401, detail="Missing refresh token")

    payload = verify_refresh_token(refresh_token)

    new_access_token = create_token({
        "sub": payload["sub"],
        "email": payload["email"]
    }, ACCESS_TOKEN_TYPE)

    return {"access_token": new_access_token}

@router.post("/logout")
async def logout(
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Set user offline on logout."""
    await update_status(current_user["id"], False, db)
    logger.info(f"User {current_user['id']} logged out")
    response = JSONResponse({"message": "Logged out successfully"})
    response.delete_cookie(
        "refresh_token",
        path="/",
        samesite="lax",
        secure=settings.is_production,
    )
    return response


@router.get("/me")
async def get_me(
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
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