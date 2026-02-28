"""Application settings loaded from environment."""

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # App
    port: int = 8080
    environment: str = "development"
    secret_key: str = "change-me-in-production"
    access_token_expire_minutes: int = 60
    refresh_token_expire_days: int = 30

    # Database
    database_url: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/cowork"

    # Redis (optional)
    redis_url: str = ""

    # Stripe
    stripe_secret_key: str = ""
    stripe_webhook_secret: str = ""
    stripe_hot_desk_price_id: str = ""
    stripe_dedicated_price_id: str = ""
    stripe_private_office_price_id: str = ""

    # Email
    smtp_host: str = ""
    smtp_port: int = 587
    smtp_user: str = ""
    smtp_password: str = ""
    email_from: str = "noreply@cowork.com"

    # Frontend URLs (CORS)
    frontend_url: str = "http://localhost:3000"
    admin_url: str = "http://localhost:3001"

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8"}


settings = Settings()
