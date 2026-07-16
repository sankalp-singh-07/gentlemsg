import os
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, APIRouter
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded

from core.config import settings
from core.limiter import limiter
from core.exceptions import register_exception_handlers
from db.base import Base
from db.database import engine

# Import all models so they register with Base.metadata
import models  # noqa: F401

# Import route modules
from api.routes import auth, users, chats, friends, notifications, search, groups, calls

# Import WebSocket route modules
from websocket import chat_ws, presence_ws, group_ws

# ── Logging ──────────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)-8s | %(name)s | %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger("gentlemsg")

# Create uploads directories at import time (StaticFiles requires directory to exist)
os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
os.makedirs(os.path.join(settings.UPLOAD_DIR, "profile_pictures"), exist_ok=True)
os.makedirs(os.path.join(settings.UPLOAD_DIR, "chats"), exist_ok=True)
os.makedirs(os.path.join(settings.UPLOAD_DIR, "groups"), exist_ok=True)


def _ensure_sqlite_columns(connection) -> None:
    """Add Phase-3 columns on existing SQLite DBs (create_all does not alter)."""
    from sqlalchemy import text, inspect

    inspector = inspect(connection)
    tables = inspector.get_table_names()

    def cols(table: str) -> set[str]:
        if table not in tables:
            return set()
        return {c["name"] for c in inspector.get_columns(table)}

    msg_cols = cols("messages")
    if msg_cols:
        if "reply_to_id" not in msg_cols:
            connection.execute(text("ALTER TABLE messages ADD COLUMN reply_to_id VARCHAR"))
        if "edited_at" not in msg_cols:
            connection.execute(text("ALTER TABLE messages ADD COLUMN edited_at DATETIME"))

    chat_cols = cols("chats")
    if chat_cols:
        if "last_read_message_id_user1" not in chat_cols:
            connection.execute(
                text("ALTER TABLE chats ADD COLUMN last_read_message_id_user1 VARCHAR")
            )
        if "last_read_message_id_user2" not in chat_cols:
            connection.execute(
                text("ALTER TABLE chats ADD COLUMN last_read_message_id_user2 VARCHAR")
            )


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Starting GentleMSG API...")
    logger.info("Database: %s", settings.database_dialect)
    logger.info("Environment: %s", settings.ENVIRONMENT)

    # Dev convenience: ensure tables exist. Prefer `alembic upgrade head` in production.
    if settings.AUTO_CREATE_TABLES:
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
            if settings.database_dialect == "sqlite":
                await conn.run_sync(_ensure_sqlite_columns)
        logger.info("Database tables ready (create_all)")
    else:
        logger.info("AUTO_CREATE_TABLES=false — use Alembic migrations")

    yield

    logger.info("Shutting down GentleMSG API...")
    await engine.dispose()


tags_metadata = [
    {"name": "auth", "description": "Authentication and user login"},
    {"name": "users", "description": "User profiles and GDPR data management"},
    {"name": "friends", "description": "Friend requests and connections"},
    {"name": "chats", "description": "Messaging and media uploads"},
    {"name": "notifications", "description": "Push notification tracking"},
    {"name": "search", "description": "Global search across users and chats"},
    {"name": "groups", "description": "Group chat management and messaging"},
    {"name": "calls", "description": "Call history (signaling is WebSocket)"},
]

app = FastAPI(
    title="GentleMSG API",
    description="Backend API for GentleMSG messaging application.",
    version="1.2.0",
    openapi_tags=tags_metadata,
    lifespan=lifespan,
    contact={
        "name": "GentleMSG Support",
        "email": "support@gentlemsg.com",
    },
)

# Register rate limiter
app.state.limiter = limiter  # type: ignore
app.add_exception_handler(
    RateLimitExceeded,
    lambda request, exc: _rate_limit_exceeded_handler(request, exc),
)

# Consistent JSON error envelope
register_exception_handlers(app)

# CORS middleware
# allow_headers=["*"] avoids Starlette 400 preflight when the browser requests
# extra headers (e.g. cache-control). Origins still restricted via env.
_cors_origins = settings.cors_origins_list
# Local dev: accept both localhost and 127.0.0.1 for the Vite ports
if not settings.is_production:
    for extra in (
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:5174",
        "http://127.0.0.1:5174",
    ):
        if extra not in _cors_origins:
            _cors_origins.append(extra)

app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS", "HEAD"],
    allow_headers=["*"],
    expose_headers=["*"],
)

# Static uploads: public only when explicitly enabled (default true in development)
if settings.SERVE_UPLOADS_PUBLIC:
    app.mount("/uploads", StaticFiles(directory=settings.UPLOAD_DIR), name="uploads")
    if settings.is_production:
        logger.warning(
            "SERVE_UPLOADS_PUBLIC=true in production — prefer auth-gated "
            "GET /api/v1/chats/{chat_id}/files/{filename}"
        )
else:
    logger.info("Public /uploads disabled; use auth-gated chat file endpoint")

# API v1 Router
api_v1_router = APIRouter(prefix="/api/v1")
api_v1_router.include_router(auth.router)
api_v1_router.include_router(users.router)
api_v1_router.include_router(friends.router)
api_v1_router.include_router(chats.router)
api_v1_router.include_router(notifications.router)
api_v1_router.include_router(search.router)
api_v1_router.include_router(groups.router)
api_v1_router.include_router(calls.router)

app.include_router(api_v1_router)

# WebSocket routers (in-memory ConnectionManager — single process only)
app.include_router(chat_ws.router)
app.include_router(presence_ws.router)
app.include_router(group_ws.router)


@app.get("/")
async def root():
    return {"message": "GentleMSG is running!", "version": "1.2.0"}


@app.get("/health")
async def health_check():
    from datetime import datetime, timezone

    return {
        "status": "healthy",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "environment": settings.ENVIRONMENT,
        "database": settings.database_dialect,
    }
