"""Centralized error handling for FastAPI."""
import uuid
from datetime import datetime, timezone

import structlog
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse

from exceptions import AppException

logger = structlog.get_logger()


def add_error_handlers(app: FastAPI) -> None:
    """Register exception handlers on the FastAPI app."""

    @app.middleware("http")
    async def request_id_middleware(request: Request, call_next):
        request_id = str(uuid.uuid4())
        request.state.request_id = request_id
        try:
            response = await call_next(request)
        except Exception as exc:
            # Catch any unhandled exception leaking through the middleware stack
            logger.error(
                "unhandled_error",
                error=str(exc),
                error_type=type(exc).__name__,
                request_id=request_id,
                path=str(request.url),
            )
            return JSONResponse(
                status_code=500,
                content={
                    "error": "Internal server error",
                    "detail": str(exc),
                    "request_id": request_id,
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                },
            )
        response.headers["X-Request-ID"] = request_id
        return response

    @app.exception_handler(AppException)
    async def app_exception_handler(request: Request, exc: AppException):
        request_id = getattr(request.state, "request_id", "unknown")
        logger.warning(
            "app_error",
            status=exc.status_code,
            detail=exc.detail,
            request_id=request_id,
            path=str(request.url),
        )
        return JSONResponse(
            status_code=exc.status_code,
            content={
                "error": exc.detail,
                "detail": exc.detail,
                "request_id": request_id,
                "timestamp": datetime.now(timezone.utc).isoformat(),
            },
        )

    @app.exception_handler(Exception)
    async def unhandled_exception_handler(request: Request, exc: Exception):
        request_id = getattr(request.state, "request_id", "unknown")
        logger.error(
            "unhandled_error",
            error=str(exc),
            error_type=type(exc).__name__,
            request_id=request_id,
            path=str(request.url),
        )
        return JSONResponse(
            status_code=500,
            content={
                "error": "Internal server error",
                "detail": str(exc),
                "request_id": request_id,
                "timestamp": datetime.now(timezone.utc).isoformat(),
            },
        )
