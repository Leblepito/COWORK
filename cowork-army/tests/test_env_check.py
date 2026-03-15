"""Tests for startup environment validation (Task 13)."""
import pytest
import importlib


def _reload_env_check():
    """Force re-import so monkeypatched env vars take effect."""
    import env_check
    importlib.reload(env_check)
    return env_check


def test_validate_env_passes_with_required_vars(monkeypatch):
    monkeypatch.setenv("DATABASE_URL", "postgresql+asyncpg://test")
    monkeypatch.setenv("COWORK_JWT_SECRET", "secret")
    monkeypatch.setenv("ANTHROPIC_API_KEY", "sk-ant-test")
    monkeypatch.setenv("LLM_PROVIDER", "anthropic")
    ec = _reload_env_check()
    # Should not raise
    ec.validate_env()


def test_validate_env_warns_missing_llm_key(monkeypatch):
    monkeypatch.setenv("DATABASE_URL", "postgresql+asyncpg://test")
    monkeypatch.setenv("COWORK_JWT_SECRET", "secret")
    monkeypatch.setenv("LLM_PROVIDER", "anthropic")
    monkeypatch.delenv("ANTHROPIC_API_KEY", raising=False)
    monkeypatch.delenv("GEMINI_API_KEY", raising=False)
    ec = _reload_env_check()
    # Should not raise — only logs a warning
    ec.validate_env()


def test_validate_env_warns_default_jwt_secret(monkeypatch):
    monkeypatch.setenv("DATABASE_URL", "postgresql+asyncpg://test")
    monkeypatch.delenv("COWORK_JWT_SECRET", raising=False)
    monkeypatch.setenv("ANTHROPIC_API_KEY", "sk-ant-test")
    ec = _reload_env_check()
    # Should not raise — only logs a warning
    ec.validate_env()


def test_validate_env_warns_missing_database_url(monkeypatch):
    monkeypatch.delenv("DATABASE_URL", raising=False)
    monkeypatch.setenv("COWORK_JWT_SECRET", "secret")
    monkeypatch.setenv("ANTHROPIC_API_KEY", "sk-ant-test")
    ec = _reload_env_check()
    # Should not raise — only logs a warning
    ec.validate_env()


def test_validate_env_gemini_provider_missing_key(monkeypatch):
    monkeypatch.setenv("DATABASE_URL", "postgresql+asyncpg://test")
    monkeypatch.setenv("COWORK_JWT_SECRET", "secret")
    monkeypatch.setenv("LLM_PROVIDER", "gemini")
    monkeypatch.delenv("GEMINI_API_KEY", raising=False)
    ec = _reload_env_check()
    # Should not raise — only logs a warning
    ec.validate_env()


def test_validate_env_change_me_secret(monkeypatch):
    monkeypatch.setenv("COWORK_JWT_SECRET", "change-me-in-production")
    monkeypatch.setenv("DATABASE_URL", "postgresql+asyncpg://test")
    monkeypatch.setenv("ANTHROPIC_API_KEY", "sk-ant-test")
    ec = _reload_env_check()
    # Should not raise — only logs a warning for default secret
    ec.validate_env()
