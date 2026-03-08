import json
import logging
from pydantic_settings import BaseSettings
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)

class Settings(BaseSettings):
    DATABASE_URL: str = "sqlite+aiosqlite:///./gentlemsg.db"
    JWT_SECRET: str = "dev-secret-key-change-in-production"
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRATION_MINUTES: int = 1440
    GOOGLE_CLIENT_ID: str = ""
    UPLOAD_DIR: str = "./uploads"
    CORS_ORIGINS: str = '["http://localhost:5173","http://localhost:3000"]'
    ENVIRONMENT: str = "development"  # development | production

    # File upload limits (bytes)
    MAX_IMAGE_SIZE: int = 5 * 1024 * 1024      # 5 MB
    MAX_VIDEO_SIZE: int = 25 * 1024 * 1024     # 25 MB
    MAX_DOC_SIZE: int = 10 * 1024 * 1024       # 10 MB
    MAX_AVATAR_SIZE: int = 2 * 1024 * 1024     # 2 MB

    @property
    def cors_origins_list(self) -> list[str]:
        return json.loads(self.CORS_ORIGINS)

    @property
    def is_production(self) -> bool:
        return self.ENVIRONMENT.lower() == "production"

    def validate_environment(self):
        """Validate critical settings at startup. Raises in production, warns in dev."""
        issues = []

        if self.JWT_SECRET in _WEAK_SECRETS or len(self.JWT_SECRET) < 32:
            msg = (
                "JWT_SECRET is weak or a known default. "
                "Generate a strong random secret (32+ chars) for production."
            )
            issues.append(msg)

        if not self.GOOGLE_CLIENT_ID or self.GOOGLE_CLIENT_ID.startswith("your-"):
            msg = "GOOGLE_CLIENT_ID is not configured. Google OAuth will not work."
            issues.append(msg)

        if issues:
            if self.is_production:
                raise ValueError(
                    "CRITICAL configuration errors in production:\n"
                    + "\n".join(f"  - {i}" for i in issues)
                )
            else:
                for issue in issues:
                    logger.warning(f"⚠️  CONFIG WARNING: {issue}")

    class Config:
        env_file = ".env"


settings = Settings()
settings.validate_environment()
