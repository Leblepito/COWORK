"""
Tests for llm_providers.py — LLM Provider Abstraction (v7)
ToolCall, TOOL_DEFS, provider factory, Anthropic/Gemini providers.
"""
import pytest
from unittest.mock import MagicMock, patch

from llm_providers import ToolCall, TOOL_DEFS, get_provider


# ═══════════════════════════════════════════════════════════
#  TOOL CALL
# ═══════════════════════════════════════════════════════════

class TestToolCall:
    def test_slots(self):
        tc = ToolCall(id="tc-1", name="read_file", input={"path": "a.txt"})
        assert tc.id == "tc-1"
        assert tc.name == "read_file"
        assert tc.input == {"path": "a.txt"}

    def test_no_extra_attrs(self):
        tc = ToolCall(id="x", name="y", input={})
        with pytest.raises(AttributeError):
            tc.extra = "nope"

    def test_multiple_instances(self):
        tc1 = ToolCall(id="1", name="a", input={"x": 1})
        tc2 = ToolCall(id="2", name="b", input={"y": 2})
        assert tc1.id != tc2.id
        assert tc1.name != tc2.name


# ═══════════════════════════════════════════════════════════
#  TOOL DEFS
# ═══════════════════════════════════════════════════════════

class TestToolDefs:
    def test_count(self):
        assert len(TOOL_DEFS) == 5

    def test_all_have_name_desc_params(self):
        for t in TOOL_DEFS:
            assert "name" in t
            assert "description" in t
            assert "parameters" in t

    def test_parameters_have_object_type(self):
        for t in TOOL_DEFS:
            assert t["parameters"]["type"] == "object"

    def test_read_file_schema(self):
        tool = next(t for t in TOOL_DEFS if t["name"] == "read_file")
        assert "path" in tool["parameters"]["properties"]
        assert "path" in tool["parameters"]["required"]

    def test_write_file_schema(self):
        tool = next(t for t in TOOL_DEFS if t["name"] == "write_file")
        assert "path" in tool["parameters"]["required"]
        assert "content" in tool["parameters"]["required"]

    def test_run_command_schema(self):
        tool = next(t for t in TOOL_DEFS if t["name"] == "run_command")
        assert "command" in tool["parameters"]["required"]


# ═══════════════════════════════════════════════════════════
#  PROVIDER FACTORY
# ═══════════════════════════════════════════════════════════

class TestGetProvider:
    def test_anthropic_provider(self):
        mock_anthropic = MagicMock()
        with patch.dict("sys.modules", {"anthropic": mock_anthropic}):
            p = get_provider("anthropic", api_key="sk-test")
        assert p.__class__.__name__ == "AnthropicProvider"

    def test_gemini_provider(self):
        mock_genai = MagicMock()
        with patch.dict("sys.modules", {"google": MagicMock(), "google.generativeai": mock_genai}):
            p = get_provider("gemini", api_key="gk-test")
        assert p.__class__.__name__ == "GeminiProvider"

    def test_unknown_provider_raises(self):
        with pytest.raises(ValueError, match="Unknown LLM provider"):
            get_provider("openai", api_key="sk-test")

    def test_default_model_anthropic(self):
        mock_anthropic = MagicMock()
        with patch.dict("sys.modules", {"anthropic": mock_anthropic}):
            p = get_provider("anthropic", api_key="sk-test")
        assert "claude" in p.model.lower() or "sonnet" in p.model.lower()

    def test_custom_model(self):
        mock_anthropic = MagicMock()
        with patch.dict("sys.modules", {"anthropic": mock_anthropic}):
            p = get_provider("anthropic", api_key="sk-test", model="claude-3-opus")
        assert p.model == "claude-3-opus"


# ═══════════════════════════════════════════════════════════
#  ANTHROPIC PROVIDER
# ═══════════════════════════════════════════════════════════

class TestAnthropicProvider:
    def _make_provider(self):
        mock_anthropic = MagicMock()
        with patch.dict("sys.modules", {"anthropic": mock_anthropic}):
            from llm_providers import AnthropicProvider
            p = AnthropicProvider(api_key="sk-test")
        return p, mock_anthropic

    def test_to_claude_tools(self):
        p, _ = self._make_provider()
        converted = p._to_claude_tools(TOOL_DEFS)
        assert len(converted) == 5
        for t in converted:
            assert "name" in t
            assert "description" in t
            assert "input_schema" in t

    def test_chat_text_only(self):
        p, mock_anthropic = self._make_provider()
        text_block = MagicMock()
        text_block.type = "text"
        text_block.text = "Hello!"
        response = MagicMock()
        response.content = [text_block]
        p.client.messages.create.return_value = response

        text, tool_calls = p.chat("sys", [{"role": "user", "content": "hi"}], TOOL_DEFS)
        assert text == "Hello!"
        assert tool_calls == []

    def test_chat_with_tool_use(self):
        p, _ = self._make_provider()
        text_block = MagicMock()
        text_block.type = "text"
        text_block.text = "Reading..."
        tool_block = MagicMock()
        tool_block.type = "tool_use"
        tool_block.id = "tc-1"
        tool_block.name = "read_file"
        tool_block.input = {"path": "test.txt"}
        response = MagicMock()
        response.content = [text_block, tool_block]
        p.client.messages.create.return_value = response

        text, tool_calls = p.chat("sys", [{"role": "user", "content": "read"}], TOOL_DEFS)
        assert text == "Reading..."
        assert len(tool_calls) == 1
        assert tool_calls[0].name == "read_file"
        assert tool_calls[0].id == "tc-1"

    def test_format_tool_result(self):
        p, _ = self._make_provider()
        tc = ToolCall(id="tc-1", name="read_file", input={})
        result = p.format_tool_result(tc, '{"content": "hello"}')
        assert result["type"] == "tool_result"
        assert result["tool_use_id"] == "tc-1"

    def test_format_assistant_message(self):
        p, _ = self._make_provider()
        # Simulate a chat call first to set _last_content
        text_block = MagicMock()
        text_block.type = "text"
        text_block.text = "Done."
        response = MagicMock()
        response.content = [text_block]
        p.client.messages.create.return_value = response
        p.chat("sys", [{"role": "user", "content": "hi"}], TOOL_DEFS)

        msg = p.format_assistant_message("Done.", [])
        assert msg["role"] == "assistant"
        assert msg["content"] == [text_block]


# ═══════════════════════════════════════════════════════════
#  GEMINI PROVIDER
# ═══════════════════════════════════════════════════════════

class TestGeminiProvider:
    def _make_provider(self):
        mock_genai = MagicMock()
        with patch.dict("sys.modules", {"google": MagicMock(), "google.generativeai": mock_genai}):
            from llm_providers import GeminiProvider
            p = GeminiProvider(api_key="gk-test")
        return p, mock_genai

    def test_format_tool_result_has_function_name(self):
        p, _ = self._make_provider()
        tc = ToolCall(id="gemini_tc_1", name="read_file", input={})
        result = p.format_tool_result(tc, '{"content": "hello"}')
        assert result["type"] == "tool_result"
        assert result["_function_name"] == "read_file"

    def test_format_assistant_message_role(self):
        p, _ = self._make_provider()
        p._last_parts = [{"type": "text", "text": "Done."}]
        msg = p.format_assistant_message("Done.", [])
        assert msg["role"] == "model"
        assert msg["content"] == [{"type": "text", "text": "Done."}]

    def test_tool_call_counter_increments(self):
        p, _ = self._make_provider()
        assert p._tool_call_counter == 0
