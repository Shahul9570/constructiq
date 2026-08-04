from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
import structlog

from app.core.config import settings
from app.core.database import engine, Base
from app.api.v1 import api_router

logger = structlog.get_logger()

if settings.SENTRY_DSN:
    import sentry_sdk
    sentry_sdk.init(
        dsn=settings.SENTRY_DSN,
        traces_sample_rate=1.0,
        environment=settings.ENVIRONMENT,
    )
app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    docs_url="/docs" if settings.ENVIRONMENT == "development" else None,
    redoc_url="/redoc" if settings.ENVIRONMENT == "development" else None,
)

allowed_origins = [o.strip() for o in settings.ALLOWED_ORIGINS.split(",") if o.strip()]
# Ensure Cloudflare Pages origins and localhost are allowed
allowed_origins.extend([
    "https://constructiq-ebi.pages.dev",
    "http://localhost:5173",
    "http://localhost:3000"
])
allowed_origins = list(set(allowed_origins))

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_origin_regex=r"https://.*\.pages\.dev",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    return response

# Removed StaticFiles mount to enforce DB blob storage for uploads


@app.on_event("startup")
async def startup():
    from app.core.celery_app import celery_app
    logger.info("Celery app initialized")
    
    try:
        import app.models  # Register all models in Base.metadata
        Base.metadata.create_all(bind=engine)
        logger.info("Database tables created/checked.")

        # Safe automatic column migrations for existing production tables
        from sqlalchemy import text
        with engine.connect() as conn:
            conn.execute(text("ALTER TABLE projects ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION;"))
            conn.execute(text("ALTER TABLE projects ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION;"))
            conn.commit()
            logger.info("Database column migrations (latitude, longitude) verified successfully.")
    except Exception as e:
        logger.error(f"Failed to create/check DB tables on startup: {e}")

    try:
        from create_admin import create_super_admin
        create_super_admin()
        logger.info("Super admin initialization checked/completed.")
    except Exception as e:
        logger.error(f"Failed to check/create super admin on startup: {e}")


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled exception: {exc}", path=request.url.path)
    origin = request.headers.get("origin")
    headers = {}
    if origin:
        headers["Access-Control-Allow-Origin"] = origin
        headers["Access-Control-Allow-Credentials"] = "true"
    return JSONResponse(
        status_code=500,
        content={"detail": str(exc) if settings.ENVIRONMENT == "development" else "Internal server error. Please try again later."},
        headers=headers,
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
