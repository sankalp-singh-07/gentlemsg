"""Global search across users and chats."""

from fastapi import APIRouter, Depends, Query, Request
from sqlalchemy.ext.asyncio import AsyncSession

from db.database import get_db
from core.security import get_current_user
from core.limiter import limiter
from services.user_service import global_search

router = APIRouter(prefix="/search", tags=["search"])


@router.get("/")
@limiter.limit("60/minute")
async def search_all(
    request: Request,
    q: str = Query(..., min_length=2, max_length=64),
    limit: int = Query(default=10, ge=1, le=30),
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Global search: users + chats (by peer name). Rate limited: 60/minute."""
    return await global_search(q, db, current_user["id"], limit=limit)
