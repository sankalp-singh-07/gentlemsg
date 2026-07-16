"""Call history REST API. Signaling is WebSocket-only via presence channel."""

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from db.database import get_db
from core.security import get_current_user
from services.call_service import list_call_logs

router = APIRouter(prefix="/calls", tags=["calls"])


@router.get("/")
async def get_call_history(
    limit: int = Query(default=50, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    return await list_call_logs(current_user["id"], db, limit=limit)
