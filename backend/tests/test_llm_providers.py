"""Tests for the multi-LLM provider abstraction layer."""
import os
from unittest.mock import patch, MagicMock
import pytest
import sys

# Add parent dir to path for imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from agents.llm_providers import get_llm_provider, AnthropicProvider, GeminiProvider


@patch.dict(os.environ, {"LLM_PROVIDER": "anthropic", "ANTHROPIC_API_KEY": "test_key_anthropic"})
def test_get_anthropic_provider():
    """Factory should return AnthropicProvider when LLM_PROVIDER=anthropic."""
    provider = get_llm_provider()
    assert isinstance(provider, AnthropicProvider)


@patch.dict(os.environ, {"LLM_PROVIDER": "gemini", "GEMINI_API_KEY": "test_key_gemini"})
def test_get_gemini_provider():
    """Factory should return GeminiProvider when LLM_PROVIDER=gemini."""
    with patch("google.genai.Client"):
        provider = get_llm_provider()
    assert isinstance(provider, GeminiProvider)


@patch.dict(os.environ, {"LLM_PROVIDER": "", "ANTHROPIC_API_KEY": "test_key_default"})
def test_default_provider_is_anthropic():
    """Factory should default to Anthropic when LLM_PROVIDER is not set."""
    provider = get_llm_provider()
    assert isinstance(provider, AnthropicProvider)


@patch("anthropic.Anthropic")
def test_anthropic_provider_normalizes_tool_use_response(MockAnthropic):
    """AnthropicProvider should normalize tool_use responses correctly."""
    from agents.llm_providers import AnthropicProvider, ToolUseBlock

    # Mock the Anthropic client response
    mock_client = MagicMock()
    MockAnthropic.return_value = mock_client

    mock_tool_block = MagicMock()
    mock_tool_block.type = "tool_use"
    mock_tool_block.id = "tool_abc123"
    mock_tool_block.name = "read_file"
    mock_tool_block.input = {"path": "test.md"}

    mock_response = MagicMock()
    mock_response.stop_reason = "tool_use"
    mock_response.content = [mock_tool_block]
    mock_client.messages.create.return_value = mock_response

    provider = AnthropicProvider(api_key="test", model="claude-3-haiku-20240307")
    result = provider.get_response("system", [{"role": "user", "content": "test"}], [])

    assert result.stop_reason == "tool_use"
    assert len(result.content) == 1
    assert isinstance(result.content[0], ToolUseBlock)
    assert result.content[0].name == "read_file"
    assert result.content[0].input == {"path": "test.md"}


@patch("anthropic.Anthropic")
def test_anthropic_provider_normalizes_text_response(MockAnthropic):
    """AnthropicProvider should normalize end_turn text responses correctly."""
    from agents.llm_providers import AnthropicProvider, TextBlock

    mock_client = MagicMock()
    MockAnthropic.return_value = mock_client

    mock_text_block = MagicMock()
    mock_text_block.type = "text"
    mock_text_block.text = "Task completed successfully."

    mock_response = MagicMock()
    mock_response.stop_reason = "end_turn"
    mock_response.content = [mock_text_block]
    mock_client.messages.create.return_value = mock_response

    provider = AnthropicProvider(api_key="test", model="claude-3-haiku-20240307")
    result = provider.get_response("system", [{"role": "user", "content": "test"}], [])

    assert result.stop_reason == "end_turn"
    assert isinstance(result.content[0], TextBlock)
    assert result.content[0].text == "Task completed successfully."
