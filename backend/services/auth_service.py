from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from datetime import datetime, timezone

from core.constants import ACCESS_TOKEN_TYPE, REFRESH_TOKEN_TYPE
from models.user import User
from core.security import create_token, verify_google_token

import httpx
from fastapi import HTTPException
from core.config import settings

async def authenticate_with_google(code: str, db: AsyncSession) -> dict:
    """Exchange Google auth code for tokens, create or update user, return JWT + user data."""
    token_url = "https://oauth2.googleapis.com/token"
    token_data = {
        "code": code,
        "client_id": settings.GOOGLE_CLIENT_ID,
        "client_secret": settings.GOOGLE_CLIENT_SECRET,
        "redirect_uri": settings.GOOGLE_REDIRECT_URI,
        "grant_type": "authorization_code",
    }
    
    async with httpx.AsyncClient() as client:
        # 1. Exchange code for Google tokens
        response = await client.post(token_url, data=token_data)
        if response.status_code != 200:
            raise HTTPException(status_code=400, detail="Failed to exchange authorization code")
        
        tokens = response.json()
        id_token_str = tokens.get("id_token")
        
        if not id_token_str:
             raise HTTPException(status_code=400, detail="Google authentication failed")

        # 2. Verify Google Token
        google_data = verify_google_token(id_token_str)

    # Check if user already exists
    result = await db.execute(
        select(User).where(User.google_id == google_data["google_id"])
    )
    user = result.scalar_one_or_none()

    if user:
        # Update existing user
        user.is_online = True
        user.last_active = datetime.now(timezone.utc)
        await db.flush()
    else:
        # Create new user
        from services.user_service import generate_unique_username
        base_name = google_data["name"].split(" ")[0].lower() if google_data["name"] else "user"
        user_name = await generate_unique_username(base_name, db)
        
        user = User(
            google_id=google_data["google_id"],
            name=google_data["name"],
            email=google_data["email"],
            photo_url=google_data["photo_url"],
            user_name=user_name,
            is_online=True,
            last_active=datetime.now(timezone.utc),
        )
        db.add(user)
        await db.flush()

    # Create JWT
    access_token = create_token(
        data={"sub": user.id, "email": user.email},
        token_type=ACCESS_TOKEN_TYPE
    )

    refresh_token = create_token(
        data={"sub": user.id, "email": user.email},
        token_type=REFRESH_TOKEN_TYPE
    )

    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
        "user": {
            "id": user.id,
            "name": user.name,
            "email": user.email,
            "photoURL": user.photo_url,
            "userName": user.user_name,
        },
    }
