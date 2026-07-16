import json
import logging
from pydantic_settings import BaseSettings
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)


class Settings(BaseSettings):
    # SQLite (local): sqlite+aiosqlite:///./gentlemsg.db
    # Neon: postgresql+asyncpg://user:pass@host/db?sslmode=require
    # Also accepts postgres:// and postgresql:// (normalized to +asyncpg)
    DATABASE_URL: str = "sqlite+aiosqlite:///./gentlemsg.db"
    JWT_SECRET: str = "dev-secret-key-change-in-production"
    JWT_ALGORITHM: str = "HS256"
    # Short-lived access token (minutes); refresh token stays in httpOnly cookie
    JWT_EXPIRATION_MINUTES_ACCESS: int = 60
    JWT_EXPIRATION_MINUTES_REFRESH: int = 60 * 24 * 7  # 7 days
    # Legacy alias — prefer ACCESS/REFRESH above
    JWT_EXPIRATION_MINUTES: int = 60
    GOOGLE_CLIENT_ID: str = ""
    GOOGLE_CLIENT_SECRET: str = ""
    GOOGLE_REDIRECT_URI: str = "http://localhost:8000/api/v1/auth/google/callback"
    FRONTEND_URL: str = "http://localhost:5173"
    API_BASE_URL: str = "http://localhost:8000"
    UPLOAD_DIR: str = "./uploads"
    CORS_ORIGINS: str = '["http://localhost:5173","http://localhost:3000"]'
    ENVIRONMENT: str = "development"  # development | production

    # True: mount public /uploads (convenient for local + <img src>).
    # False: require auth-gated download endpoints (recommended for production).
    SERVE_UPLOADS_PUBLIC: bool = True

    # True: create_all on startup (dev). False: rely on Alembic only.
    AUTO_CREATE_TABLES: bool = True

    # File upload limits (bytes)
    MAX_IMAGE_SIZE: int = 5 * 1024 * 1024  # 5 MB
    MAX_VIDEO_SIZE: int = 25 * 1024 * 1024  # 25 MB
    MAX_DOC_SIZE: int = 10 * 1024 * 1024  # 10 MB
    MAX_AVATAR_SIZE: int = 2 * 1024 * 1024  # 2 MB

    @property
    def cors_origins_list(self) -> list[str]:
        return json.loads(self.CORS_ORIGINS)

    @property
    def is_production(self) -> bool:
        return self.ENVIRONMENT.lower() == "production"

    @property
    def database_dialect(self) -> str:
        url = self.DATABASE_URL.lower()
        if "sqlite" in url:
            return "sqlite"
        if "postgres" in url:
            return "postgresql"
        return "unknown"

    def validate_environment(self):
        """Validate critical settings at startup. Raises in production, warns in dev."""
        issues = []

        if not self.GOOGLE_CLIENT_ID or self.GOOGLE_CLIENT_ID.startswith("your-"):
            msg = "GOOGLE_CLIENT_ID is not configured. Google OAuth will not work."
            issues.append(msg)

        if self.is_production and (
            not self.JWT_SECRET
            or self.JWT_SECRET == "dev-secret-key-change-in-production"
        ):
            issues.append("JWT_SECRET must be set to a strong secret in production.")

        if self.is_production and "sqlite" in self.DATABASE_URL.lower():
            issues.append(
                "DATABASE_URL points at SQLite in production; use Neon Postgres."
            )

        if issues:
            if self.is_production:
                raise ValueError(
                    "CRITICAL configuration errors in production:\n"
                    + "\n".join(f"  - {i}" for i in issues)
                )
            else:
                for issue in issues:
                    logger.warning("CONFIG WARNING: %s", issue)

    class Config:
        env_file = ".env"


settings = Settings()

# In production default to Alembic-managed schema and warn on public uploads
if settings.is_production and settings.AUTO_CREATE_TABLES:
    # Allow override via env; only log guidance
    logger.info(
        "Production tip: set AUTO_CREATE_TABLES=false and run `alembic upgrade head`"
    )

settings.validate_environment()
