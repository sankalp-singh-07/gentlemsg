from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from core.config import settings


def _engine_kwargs(url: str) -> dict:
    """Dialect-aware engine options for SQLite vs Postgres (Neon)."""
    kwargs: dict = {"echo": False}
    if url.startswith("sqlite"):
        # SQLite needs check_same_thread=False for async use via aiosqlite
        kwargs["connect_args"] = {"check_same_thread": False}
    else:
        # Neon / Postgres: modest pool; SSL is usually in the URL (?sslmode=require)
        kwargs["pool_pre_ping"] = True
        kwargs["pool_size"] = 5
        kwargs["max_overflow"] = 10
    return kwargs


def normalize_database_url(url: str) -> str:
    """Normalize common Neon / Postgres URLs to async drivers."""
    if url.startswith("postgres://"):
        return url.replace("postgres://", "postgresql+asyncpg://", 1)
    if url.startswith("postgresql://") and "+asyncpg" not in url:
        return url.replace("postgresql://", "postgresql+asyncpg://", 1)
    return url


DATABASE_URL = normalize_database_url(settings.DATABASE_URL)

engine = create_async_engine(DATABASE_URL, **_engine_kwargs(DATABASE_URL))

async_session = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


async def get_db():
    """FastAPI dependency that provides an async database session."""
    async with async_session() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
