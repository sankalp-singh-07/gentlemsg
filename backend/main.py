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
from db.base import Base
from db.database import engine

# Import all models so they register with Base.metadata
from models.user import User
from models.chat import Chat, Friendship
from models.message import Message
from models.friend_request import FriendRequest
from models.notification import Notification
from models.blocked_user import BlockedUser

# Import route modules
from api.routes import auth, users, chats, friends, notifications

# Import WebSocket route modules
from websocket import chat_ws, presence_ws

# ── Logging ──────────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)-8s | %(name)s | %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger("gentlemsg")

# ── Rate Limiter ─────────────────────────────────────────────────────

# Create uploads directories at import time (StaticFiles requires directory to exist)
os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
os.makedirs(os.path.join(settings.UPLOAD_DIR, "profile_pictures"), exist_ok=True)
os.makedirs(os.path.join(settings.UPLOAD_DIR, "chats"), exist_ok=True)


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Starting GentleMSG API...")

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    logger.info("Database tables ready")

    yield

    logger.info("Shutting down GentleMSG API...")
    await engine.dispose()

tags_metadata = [
    {"name": "auth", "description": "Authentication and user login"},
    {"name": "users", "description": "User profiles and GDPR data management"},
    {"name": "friends", "description": "Friend requests and connections"},
    {"name": "chats", "description": "Messaging and media uploads"},
    {"name": "notifications", "description": "Push notification tracking"},
]

app = FastAPI(
    title="GentleMSG API",
    description="Backend API for GentleMSG messaging application.",
    version="1.0.0",
    openapi_tags=tags_metadata,
    lifespan=lifespan,
    contact={
        "name": "GentleMSG Support",
        "email": "support@gentlemsg.com",
    },
)

# Register rate limiter
app.state.limiter = limiter # type: ignore
app.add_exception_handler(
    RateLimitExceeded,
    lambda request, exc: _rate_limit_exceeded_handler(request, exc),
)
# CORS middleware — restricted methods and headers
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "Accept"],
)

# Mount static file serving for uploads
app.mount("/uploads", StaticFiles(directory=settings.UPLOAD_DIR), name="uploads")

# API v1 Router
api_v1_router = APIRouter(prefix="/api/v1")
api_v1_router.include_router(auth.router)
api_v1_router.include_router(users.router)
api_v1_router.include_router(friends.router)
api_v1_router.include_router(chats.router)
api_v1_router.include_router(notifications.router)

# REST API routers
app.include_router(api_v1_router)

# WebSocket routers
app.include_router(chat_ws.router)
app.include_router(presence_ws.router)


@app.get("/")
async def root():
    return {"message": "GentleMSG is running!"}


@app.get("/health")
async def health_check():
    from datetime import datetime, timezone
    return {"status": "healthy", "timestamp": datetime.now(timezone.utc).isoformat()}

