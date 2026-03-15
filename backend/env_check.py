"""Startup environment validation for COWORK.ARMY."""
import os
import structlog

logger = structlog.get_logger()


def validate_env() -> None:
    jwt_secret = os.environ.get("COWORK_JWT_SECRET", "")
    if not jwt_secret or jwt_secret == "change-me-in-production":
        logger.warning(
            "env_warning",
            var="COWORK_JWT_SECRET",
            message="Using default JWT secret — set COWORK_JWT_SECRET in production",
        )
    provider = os.environ.get("LLM_PROVIDER", "anthropic")
    if provider == "anthropic" and not os.environ.get("ANTHROPIC_API_KEY"):
        logger.warning(
            "env_warning",
            var="ANTHROPIC_API_KEY",
            message="Anthropic API key not set — agents will fail",
        )
    elif provider == "gemini" and not os.environ.get("GEMINI_API_KEY"):
        logger.warning(
            "env_warning",
            var="GEMINI_API_KEY",
            message="Gemini API key not set — agents will fail",
        )
    db_url = os.environ.get("DATABASE_URL", "")
    if not db_url:
        logger.warning(
            "env_warning",
            var="DATABASE_URL",
            message="DATABASE_URL not set — using default localhost:5433",
        )
    logger.info("env_validated", provider=provider)
