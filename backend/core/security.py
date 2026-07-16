from datetime import datetime, timedelta, timezone
from typing import Optional

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt
from google.oauth2 import id_token
from google.auth.transport import requests as google_requests

from core.config import settings
from core.constants import ACCESS_TOKEN_TYPE, REFRESH_TOKEN_TYPE

security_scheme = HTTPBearer()

#Create tokens
def create_token(data: dict, token_type: str, expires_delta: Optional[timedelta] = None) -> str:
    payload = data.copy()
    expires = datetime.now(timezone.utc) + (
            expires_delta
            or timedelta(
        minutes=(
            settings.JWT_EXPIRATION_MINUTES_ACCESS
            if token_type == ACCESS_TOKEN_TYPE
            else settings.JWT_EXPIRATION_MINUTES_REFRESH
        )
    )
    )
    payload.update({
        "exp": expires,
        "type": token_type,
        "iat": datetime.now(timezone.utc)
    })

    return jwt.encode(payload, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)


#Verify access token
def verify_access_token(token: str) -> dict:
    try:
        payload = jwt.decode(token, settings.JWT_SECRET, algorithms=[settings.JWT_ALGORITHM])

        if payload.get("type") != ACCESS_TOKEN_TYPE:
            raise HTTPException(status_code=401, detail="Invalid access token")

        return payload

    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

#Verify refresh token
def verify_refresh_token(token: str) -> dict:
    try:
        payload = jwt.decode(token, settings.JWT_SECRET, algorithms=[settings.JWT_ALGORITHM])

        if payload.get("type") != REFRESH_TOKEN_TYPE:
            raise HTTPException(status_code=401, detail="Invalid refresh token")

        return payload

    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid or expired refresh token")

def verify_google_token(token: str) -> dict:
    try:
        info = id_token.verify_oauth2_token(
            token,
            google_requests.Request(),
            settings.GOOGLE_CLIENT_ID,
        )
        return {
            "google_id": info["sub"],
            "email": info.get("email", ""),
            "name": info.get("name", ""),
            "photo_url": info.get("picture", ""),
        }
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid Google token: {str(e)}",
        )


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security_scheme),
) -> dict:
    payload = verify_access_token(credentials.credentials)
    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid access token payload",
        )
    return {"id": user_id, "email": payload.get("email", "")}



def verify_ws_token(token: str) -> Optional[dict]:
    try:
        payload = jwt.decode(
            token,
            settings.JWT_SECRET,
            algorithms=[settings.JWT_ALGORITHM],
        )

        if payload.get("type") != ACCESS_TOKEN_TYPE:
            return None

        user_id = payload.get("sub")
        if not user_id:
            return None

        return {"id": user_id, "email": payload.get("email", "")}

    except JWTError:
        return None