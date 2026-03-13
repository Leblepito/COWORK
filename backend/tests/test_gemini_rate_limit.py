"""
TDD: Gemini 429 RESOURCE_EXHAUSTED → Anthropic fallback davranışı

GREEN phase: Tüm testler geçmeli.
"""
import os
import pytest
from unittest.mock import patch, MagicMock
import sys
sys.path.insert(0, "/home/ubuntu/COWORK/backend")

from agents.llm_providers import (
    GeminiProvider,
    AnthropicProvider,
    get_llm_provider,
    is_rate_limit_error,
)


class FakeRateLimitError(Exception):
    """Simulates google.api_core.exceptions.ResourceExhausted (429)."""
    def __init__(self):
        super().__init__(
            "429 RESOURCE_EXHAUSTED. You exceeded your current quota"
        )
        self.status_code = 429


def _make_anthropic_response():
    """Create a minimal mock Anthropic response."""
    block = MagicMock()
    block.type = "text"
    block.text = "Anthropic fallback response"
    resp = MagicMock()
    resp.stop_reason = "end_turn"
    resp.content = [block]
    return resp


# ─── Test 1: GeminiProvider 429 → raises when NO fallback key available ───────

def test_gemini_raises_on_rate_limit_when_no_fallback():
    """GeminiProvider raises on 429 when no ANTHROPIC_API_KEY is available."""
    # Clear ANTHROPIC_API_KEY so the env-based fallback also cannot trigger
    with patch.dict(os.environ, {"ANTHROPIC_API_KEY": ""}, clear=False):
        with patch("google.genai.Client") as mock_client_cls:
            mock_client = MagicMock()
            mock_client.models.generate_content.side_effect = FakeRateLimitError()
            mock_client_cls.return_value = mock_client

            provider = GeminiProvider(api_key="test_key", model="gemini-2.5-flash")

            with pytest.raises(Exception) as exc_info:
                provider.get_response(
                    "sys",
                    [{"role": "user", "content": "hello"}],
                    [],
                    anthropic_fallback_key=None,  # No fallback key → must raise
                )

            msg = str(exc_info.value)
            assert "429" in msg or "RESOURCE_EXHAUSTED" in msg or "quota" in msg.lower()


# ─── Test 2: GeminiProvider 429 → falls back to Anthropic ────────────────────

def test_gemini_provider_falls_back_to_anthropic_on_429():
    """GeminiProvider.get_response() falls back to Anthropic on 429."""
    with patch("google.genai.Client") as mock_gemini_cls:
        mock_gemini = MagicMock()
        mock_gemini.models.generate_content.side_effect = FakeRateLimitError()
        mock_gemini_cls.return_value = mock_gemini

        with patch("anthropic.Anthropic") as mock_anthropic_cls:
            mock_anthropic = MagicMock()
            mock_anthropic.messages.create.return_value = _make_anthropic_response()
            mock_anthropic_cls.return_value = mock_anthropic

            provider = GeminiProvider(api_key="test_gemini_key", model="gemini-2.5-flash")
            result = provider.get_response(
                "sys",
                [{"role": "user", "content": "trade analysis"}],
                [],
                anthropic_fallback_key="test_anthropic_key",
            )

            assert result is not None
            assert result.stop_reason == "end_turn"


# ─── Test 3: get_llm_provider(force_anthropic=True) → AnthropicProvider ──────

def test_get_llm_provider_returns_anthropic_when_forced():
    """get_llm_provider(force_anthropic=True) should return AnthropicProvider."""
    with patch.dict(os.environ, {
        "GEMINI_API_KEY": "test_gemini_key",
        "ANTHROPIC_API_KEY": "test_anthropic_key",
    }):
        with patch("anthropic.Anthropic"):
            provider = get_llm_provider(task="trade analysis", force_anthropic=True)
            assert isinstance(provider, AnthropicProvider)


# ─── Test 4: is_rate_limit_error() detects 429 ───────────────────────────────

def test_is_rate_limit_error_detects_429():
    """is_rate_limit_error() should detect 429 quota errors."""
    err = FakeRateLimitError()
    assert is_rate_limit_error(err) is True


# ─── Test 5: is_rate_limit_error() ignores other errors ──────────────────────

def test_is_rate_limit_error_ignores_other_errors():
    """is_rate_limit_error() should return False for non-429 errors."""
    assert is_rate_limit_error(ValueError("some other error")) is False
    assert is_rate_limit_error(RuntimeError("connection failed")) is False
