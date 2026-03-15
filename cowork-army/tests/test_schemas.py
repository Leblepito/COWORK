"""Tests for Pydantic v2 request/response schemas."""
import sys
import os
from pathlib import Path

_root = Path(__file__).parent.parent
if str(_root) not in sys.path:
    sys.path.insert(0, str(_root))

import pytest
from pydantic import ValidationError as PydanticValidationError
from schemas import (
    CreateTaskRequest,
    DelegateRequest,
    ApiKeyRequest,
    LlmProviderRequest,
    AgentResponse,
    HealthResponse,
    ErrorResponse,
)


def test_create_task_validates():
    task = CreateTaskRequest(title="Fix bug", description="Fix login")
    assert task.title == "Fix bug"
    assert task.description == "Fix login"
    assert task.priority == "medium"


def test_create_task_rejects_empty_title():
    with pytest.raises(PydanticValidationError):
        CreateTaskRequest(title="", description="desc")


def test_create_task_rejects_too_long_title():
    with pytest.raises(PydanticValidationError):
        CreateTaskRequest(title="x" * 201)


def test_create_task_optional_assigned_to():
    task = CreateTaskRequest(title="Task", assigned_to="agent-1")
    assert task.assigned_to == "agent-1"


def test_delegate_validates():
    req = DelegateRequest(task="analyze data")
    assert req.task == "analyze data"


def test_delegate_rejects_empty():
    with pytest.raises(PydanticValidationError):
        DelegateRequest(task="")


def test_api_key_validates():
    req = ApiKeyRequest(key="sk-ant-abc123", provider="anthropic")
    assert req.key == "sk-ant-abc123"
    assert req.provider == "anthropic"


def test_api_key_rejects_empty():
    with pytest.raises(PydanticValidationError):
        ApiKeyRequest(key="", provider="anthropic")


def test_api_key_default_provider():
    req = ApiKeyRequest(key="somekey")
    assert req.provider == "anthropic"


def test_llm_provider_accepts_anthropic():
    req = LlmProviderRequest(provider="anthropic")
    assert req.provider == "anthropic"


def test_llm_provider_accepts_gemini():
    req = LlmProviderRequest(provider="gemini")
    assert req.provider == "gemini"


def test_llm_provider_rejects_invalid():
    with pytest.raises(PydanticValidationError):
        LlmProviderRequest(provider="openai")


def test_agent_response_defaults():
    resp = AgentResponse(id="agent-1", name="Test Agent")
    assert resp.icon == "🤖"
    assert resp.tier == "WORKER"
    assert resp.is_base is False


def test_health_response():
    resp = HealthResponse(
        status="healthy",
        uptime_seconds=123.4,
        database="connected",
        llm_provider="anthropic",
        active_agents=3,
    )
    assert resp.status == "healthy"
    assert resp.active_agents == 3


def test_error_response():
    resp = ErrorResponse(
        error="Not found",
        detail="Agent xyz not found",
        request_id="req-123",
        timestamp="2026-03-15T10:00:00",
    )
    assert resp.error == "Not found"
