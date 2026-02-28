"""COWORK API — FastAPI entry point.

Coworking space management backend:
  - Auth (JWT signup/login/refresh)
  - Space management
  - Booking CRUD with check-in/out
  - Analytics (admin-only)
"""

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from src.config import settings
from src.database.connection import engine
from src.database.models import Base

logger = logging.getLogger("cowork-api")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup: create tables if needed. Shutdown: dispose engine."""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    logger.info("Database tables ensured")
    yield
    await engine.dispose()
    logger.info("Database connection closed")


app = FastAPI(
    title="COWORK API",
    version="0.1.0",
    lifespan=lifespan,
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        settings.frontend_url,
        settings.admin_url,
        "http://localhost:3000",
        "http://localhost:3001",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Global exception handler
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error("Unhandled error: %s", exc, exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error"},
    )


# Register routers
from src.routers.auth import router as auth_router
from src.routers.bookings import router as bookings_router
from src.routers.spaces import router as spaces_router
from src.routers.analytics import router as analytics_router
from src.routers.stripe_webhook import router as stripe_router
from src.routers.billing import router as billing_router

app.include_router(auth_router)
app.include_router(bookings_router, prefix="/api")
app.include_router(spaces_router, prefix="/api")
app.include_router(analytics_router, prefix="/api")
app.include_router(stripe_router, prefix="/api")
app.include_router(billing_router, prefix="/api")


@app.get("/health")
async def health():
    return {
        "status": "healthy",
        "service": "cowork-api",
        "version": "0.1.0",
    }
