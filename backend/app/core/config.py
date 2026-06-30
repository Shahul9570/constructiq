from typing import Optional
from pydantic_settings import BaseSettings
from pydantic import ConfigDict


class Settings(BaseSettings):
    model_config = ConfigDict(env_file=".env", case_sensitive=True)

    APP_NAME: str = "ConstructIQ"
    APP_VERSION: str = "1.0.0"
    ENVIRONMENT: str = "development"
    DEBUG: bool = True

    DATABASE_URL: str = "postgresql://constructiq:constructiq123@localhost:5432/constructiq"

    SECRET_KEY: str = "change-this-to-a-very-long-random-secret-key"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    S3_ENDPOINT: str = "http://localhost:9000"
    S3_ACCESS_KEY: str = "constructiq-access"
    S3_SECRET_KEY: str = "constructiq-secret"
    S3_BUCKET_NAME: str = "constructiq-uploads"
    S3_REGION: str = "us-east-1"

    OPENAI_API_KEY: Optional[str] = None
    OPENAI_MODEL: str = "gpt-4"

    FRONTEND_URL: str = "http://localhost:5173"
    # Comma-separated list of allowed CORS origins for production
    ALLOWED_ORIGINS: str = "http://localhost:5173,http://localhost:3000"

    REDIS_URL: str = "redis://localhost:6379/0"
    CELERY_BROKER_URL: str = "redis://localhost:6379/1"
    CELERY_RESULT_BACKEND: str = "redis://localhost:6379/2"

    SENTRY_DSN: Optional[str] = None


settings = Settings()
