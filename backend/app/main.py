from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
import structlog

from app.core.config import settings
from app.core.database import engine, Base
from app.api.v1 import api_router

logger = structlog.get_logger()

app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    docs_url="/docs" if settings.ENVIRONMENT == "development" else None,
    redoc_url="/redoc" if settings.ENVIRONMENT == "development" else None,
)

allowed_origins = [o.strip() for o in settings.ALLOWED_ORIGINS.split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")


@app.on_event("startup")
async def startup():
    try:
        Base.metadata.create_all(bind=engine)
        logger.info("Database tables created successfully")
    except Exception as e:
        logger.error(f"Database initialization error: {e}")

    # Run safe column migrations for any new columns added to existing tables
    try:
        from sqlalchemy import text
        with engine.connect() as conn:
            migrations = [
                "ALTER TABLE users ADD COLUMN IF NOT EXISTS company_code VARCHAR(20) UNIQUE",
                "ALTER TABLE users ADD COLUMN IF NOT EXISTS company_owner_id INTEGER REFERENCES users(id)",
                "ALTER TABLE projects ADD COLUMN IF NOT EXISTS members_count INTEGER DEFAULT 0",
            ]
            for sql in migrations:
                try:
                    conn.execute(text(sql))
                except Exception:
                    pass  # Column likely already exists
            conn.commit()
        logger.info("Database column migrations applied")
    except Exception as e:
        logger.error(f"Migration error: {e}")

    from app.core.celery_app import celery_app
    logger.info("Celery app initialized")


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled exception: {exc}", path=request.url.path)
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error. Please try again later."},
    )


@app.get("/health")
def health_check():
    return {
        "status": "healthy",
        "app": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "environment": settings.ENVIRONMENT,
    }


app.include_router(api_router)
