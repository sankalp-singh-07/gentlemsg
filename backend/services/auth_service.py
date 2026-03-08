from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from datetime import datetime, timezone

from models.user import User
from core.security import create_access_token, verify_google_token


async def authenticate_with_google(token: str, db: AsyncSession) -> dict:
    """Verify Google token, create or update user, return JWT + user data."""
    google_data = verify_google_token(token)

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
        user_name = google_data["name"].split(" ")[0].lower() if google_data["name"] else ""
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
    access_token = create_access_token(
        data={"sub": user.id, "email": user.email}
    )

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": {
            "id": user.id,
            "name": user.name,
            "email": user.email,
            "photoURL": user.photo_url,
            "userName": user.user_name,
        },
    }
