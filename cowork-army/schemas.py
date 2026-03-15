"""Pydantic v2 request/response models for COWORK.ARMY API."""
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field


class CreateTaskRequest(BaseModel):
    title: str = Field(..., min_length=1, max_length=200)
    description: str = Field(default="")
    assigned_to: Optional[str] = None
    priority: str = Field(default="medium")


class DelegateRequest(BaseModel):
    task: str = Field(..., min_length=1)


class ApiKeyRequest(BaseModel):
    key: str = Field(..., min_length=1)
    provider: str = Field(default="anthropic")


class LlmProviderRequest(BaseModel):
    provider: str = Field(..., pattern="^(anthropic|gemini)$")


class AgentResponse(BaseModel):
    id: str
    name: str
    icon: str = "🤖"
    tier: str = "WORKER"
    color: str = "#06b6d4"
    domain: str = "SOFTWARE"
    description: str = ""
    is_base: bool = False


class HealthResponse(BaseModel):
    status: str
    uptime_seconds: float
    database: str
    llm_provider: str
    active_agents: int


class ErrorResponse(BaseModel):
    error: str
    detail: str
    request_id: str
    timestamp: str
