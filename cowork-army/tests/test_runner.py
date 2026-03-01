"""
Tests for runner.py — Agent Lifecycle & Tool Use Integration (v7)
AgentProc state, spawn/kill, output buffer, tool execution, LLM provider loop.
"""
import json
import asyncio
import pytest
from unittest.mock import patch, MagicMock, AsyncMock
from runner import AgentProc, PROCS, _execute_tool
from llm_providers import TOOL_DEFS, ToolCall


class TestAgentProc:
    def test_initial_state(self):
        proc = AgentProc("test-agent")
        assert proc.agent_id == "test-agent"
        assert proc.status == "idle"
        assert proc.alive is False
        assert proc.started_at == ""

    def test_log_appends(self):
        proc = AgentProc("test")
        proc.log("message 1")
        proc.log("message 2")
        assert len(proc.lines) == 2

    def test_log_max_200_lines(self):
        proc = AgentProc("test")
        for i in range(250):
            proc.log(f"line {i}")
        assert len(proc.lines) == 200

    def test_to_dict(self):
        proc = AgentProc("test")
        proc.status = "working"
        d = proc.to_dict()
        assert d["agent_id"] == "test"
        assert d["status"] == "working"
        assert d["alive"] is False
        assert "lines" in d

    def test_to_dict_lines_capped_at_50(self):
        proc = AgentProc("test")
        for i in range(100):
            proc.log(f"line {i}")
        d = proc.to_dict()
        assert len(d["lines"]) == 50


class TestGetOutput:
    def test_get_output_empty(self):
        from runner import get_output
        assert get_output("nonexistent") == []

    def test_get_output_existing(self):
        from runner import get_output
        proc = AgentProc("out-test")
        proc.log("test line")
        PROCS["out-test"] = proc
        assert len(get_output("out-test")) == 1
        del PROCS["out-test"]


class TestKillAgent:
    def test_kill_not_running(self):
        from runner import kill_agent
        result = kill_agent("nonexistent")
        assert "error" in result

    def test_kill_sets_done(self):
        from runner import kill_agent
        proc = AgentProc("kill-test")
        proc.status = "working"
        PROCS["kill-test"] = proc
        result = kill_agent("kill-test")
        assert result["status"] == "killed"
        assert proc.status == "done"
        del PROCS["kill-test"]


# ═══════════════════════════════════════════════════════════
#  TOOL DEFINITIONS (from llm_providers)
# ═══════════════════════════════════════════════════════════

class TestToolDefs:
    def test_five_tools_defined(self):
        assert len(TOOL_DEFS) == 5

    def test_all_have_required_fields(self):
        for tool in TOOL_DEFS:
            assert "name" in tool
            assert "description" in tool
            assert "parameters" in tool
            assert tool["parameters"]["type"] == "object"
            assert "properties" in tool["parameters"]

    def test_tool_names(self):
        names = [t["name"] for t in TOOL_DEFS]
        assert "read_file" in names
        assert "write_file" in names
        assert "list_dir" in names
        assert "search_files" in names
        assert "run_command" in names

    def test_read_file_requires_path(self):
        tool = next(t for t in TOOL_DEFS if t["name"] == "read_file")
        assert "path" in tool["parameters"]["properties"]
        assert "path" in tool["parameters"]["required"]

    def test_write_file_requires_path_and_content(self):
        tool = next(t for t in TOOL_DEFS if t["name"] == "write_file")
        assert "path" in tool["parameters"]["required"]
        assert "content" in tool["parameters"]["required"]


# ═══════════════════════════════════════════════════════════
#  TOOL EXECUTION (_execute_tool)
# ═══════════════════════════════════════════════════════════

class TestExecuteTool:
    def test_read_file(self):
        with patch("runner.read_file", return_value={"content": "hello", "path": "test.txt"}):
            result = _execute_tool("agent1", "read_file", {"path": "test.txt"})
            data = json.loads(result)
            assert data["content"] == "hello"

    def test_write_file(self):
        with patch("runner.write_file", return_value={"status": "written", "path": "out.txt"}):
            result = _execute_tool("agent1", "write_file", {"path": "out.txt", "content": "data"})
            data = json.loads(result)
            assert data["status"] == "written"

    def test_list_dir(self):
        with patch("runner.list_dir", return_value={"files": ["a.py", "b.py"]}):
            result = _execute_tool("agent1", "list_dir", {"path": "."})
            data = json.loads(result)
            assert "files" in data
            assert len(data["files"]) == 2

    def test_list_dir_default_path(self):
        with patch("runner.list_dir", return_value={"files": []}) as mock_ld:
            _execute_tool("agent1", "list_dir", {})
            mock_ld.assert_called_once_with("agent1", "")

    def test_search_files(self):
        with patch("runner.search_files", return_value={"matches": ["test.py"]}):
            result = _execute_tool("agent1", "search_files", {"pattern": "*.py"})
            data = json.loads(result)
            assert "matches" in data

    def test_run_command(self):
        with patch("runner.run_command", return_value={"stdout": "hello\n", "returncode": 0}):
            result = _execute_tool("agent1", "run_command", {"command": "echo hello"})
            data = json.loads(result)
            assert data["returncode"] == 0

    def test_unknown_tool_returns_error(self):
        result = _execute_tool("agent1", "nonexistent_tool", {})
        data = json.loads(result)
        assert "error" in data
        assert "Unknown tool" in data["error"]

    def test_exception_returns_error(self):
        with patch("runner.read_file", side_effect=FileNotFoundError("No such file")):
            result = _execute_tool("agent1", "read_file", {"path": "missing.txt"})
            data = json.loads(result)
            assert "error" in data
            assert "No such file" in data["error"]


# ═══════════════════════════════════════════════════════════
#  TOOL USE LOOP (_run with mocked LLM Provider)
# ═══════════════════════════════════════════════════════════

def _sync_db_for_test(coro):
    """Replacement for _sync_db that works in test context."""
    loop = asyncio.new_event_loop()
    try:
        return loop.run_until_complete(coro)
    finally:
        loop.close()


def _make_agent_data(agent_id="test-agent"):
    return {
        "id": agent_id, "name": "Test Agent", "icon": "🤖",
        "system_prompt": "You are a test agent.", "desc": "Test agent",
        "domain": "testing", "workspace_dir": agent_id,
    }


class TestToolUseRun:
    def test_simple_response_no_tools(self):
        """Provider returns text only — no tool calls, task completes."""
        from runner import _run
        proc = AgentProc("test-simple")

        mock_provider = MagicMock()
        mock_provider.chat.return_value = ("Task done.", [])
        mock_provider.format_assistant_message.return_value = {"role": "assistant", "content": "Task done."}

        mock_db = AsyncMock()
        mock_db.get_agent.return_value = _make_agent_data("test-simple")
        mock_db.add_event.return_value = None

        with patch("runner.get_db", return_value=mock_db), \
             patch("runner._get_llm_config", return_value=("anthropic", "sk-test", "")), \
             patch("runner.get_provider", return_value=mock_provider), \
             patch("runner._save_output"), \
             patch("runner._sync_db", side_effect=_sync_db_for_test):
            _run(proc, "Simple task")

        assert proc.status == "done"
        mock_provider.chat.assert_called_once()

    def test_tool_use_round_then_done(self):
        """Provider calls a tool, gets result, then responds with text."""
        from runner import _run
        proc = AgentProc("test-tools")

        tc = ToolCall(id="call-1", name="read_file", input={"path": "test.txt"})

        mock_provider = MagicMock()
        mock_provider.chat.side_effect = [
            ("Let me read that file.", [tc]),
            ("File contains: hello world.", []),
        ]
        mock_provider.format_assistant_message.return_value = {"role": "assistant", "content": "..."}
        mock_provider.format_tool_result.return_value = {"type": "tool_result", "tool_use_id": "call-1", "content": "hello"}

        mock_db = AsyncMock()
        mock_db.get_agent.return_value = _make_agent_data("test-tools")
        mock_db.add_event.return_value = None

        with patch("runner.get_db", return_value=mock_db), \
             patch("runner._get_llm_config", return_value=("anthropic", "sk-test", "")), \
             patch("runner.get_provider", return_value=mock_provider), \
             patch("runner.read_file", return_value={"content": "hello world"}), \
             patch("runner._save_output"), \
             patch("runner._sync_db", side_effect=_sync_db_for_test):
            _run(proc, "Read test.txt")

        assert proc.status == "done"
        assert mock_provider.chat.call_count == 2

    def test_multiple_tool_calls_in_one_response(self):
        """Provider returns multiple tool calls in a single response."""
        from runner import _run
        proc = AgentProc("test-multi")

        tc1 = ToolCall(id="call-1", name="read_file", input={"path": "a.txt"})
        tc2 = ToolCall(id="call-2", name="list_dir", input={"path": "."})

        mock_provider = MagicMock()
        mock_provider.chat.side_effect = [
            ("", [tc1, tc2]),
            ("All done.", []),
        ]
        mock_provider.format_assistant_message.return_value = {"role": "assistant", "content": "..."}
        mock_provider.format_tool_result.return_value = {"type": "tool_result", "content": "ok"}

        mock_db = AsyncMock()
        mock_db.get_agent.return_value = _make_agent_data("test-multi")
        mock_db.add_event.return_value = None

        with patch("runner.get_db", return_value=mock_db), \
             patch("runner._get_llm_config", return_value=("anthropic", "sk-test", "")), \
             patch("runner.get_provider", return_value=mock_provider), \
             patch("runner.read_file", return_value={"content": "aaa"}), \
             patch("runner.list_dir", return_value={"files": ["a.txt"]}), \
             patch("runner._save_output"), \
             patch("runner._sync_db", side_effect=_sync_db_for_test):
            _run(proc, "Read and list")

        assert proc.status == "done"
        assert mock_provider.chat.call_count == 2

    def test_api_key_missing(self):
        """Missing API key should set error status."""
        from runner import _run
        proc = AgentProc("test-nokey")

        mock_db = AsyncMock()
        mock_db.get_agent.return_value = _make_agent_data("test-nokey")

        with patch("runner.get_db", return_value=mock_db), \
             patch("runner._get_llm_config", return_value=("anthropic", "", "")), \
             patch("runner._sync_db", side_effect=_sync_db_for_test):
            _run(proc, "Any task")

        assert proc.status == "error"
        assert any("API" in line or "api" in line.lower() for line in proc.lines)

    def test_agent_not_found(self):
        """Unknown agent should set error status."""
        from runner import _run
        proc = AgentProc("nonexistent")

        mock_db = AsyncMock()
        mock_db.get_agent.return_value = None

        with patch("runner.get_db", return_value=mock_db), \
             patch("runner._sync_db", side_effect=_sync_db_for_test):
            _run(proc, "Task")

        assert proc.status == "error"
        assert any("not found" in line.lower() for line in proc.lines)

    def test_provider_exception(self):
        """LLM provider error should set error status."""
        from runner import _run
        proc = AgentProc("test-apierr")

        mock_provider = MagicMock()
        mock_provider.chat.side_effect = Exception("API rate limit exceeded")

        mock_db = AsyncMock()
        mock_db.get_agent.return_value = _make_agent_data("test-apierr")
        mock_db.add_event.return_value = None

        with patch("runner.get_db", return_value=mock_db), \
             patch("runner._get_llm_config", return_value=("anthropic", "sk-test", "")), \
             patch("runner.get_provider", return_value=mock_provider), \
             patch("runner._sync_db", side_effect=_sync_db_for_test):
            _run(proc, "Will fail")

        assert proc.status == "error"
        assert any("rate limit" in line.lower() for line in proc.lines)

    def test_tools_passed_to_provider(self):
        """Verify TOOL_DEFS are passed to the provider.chat() call."""
        from runner import _run
        proc = AgentProc("test-toolpass")

        mock_provider = MagicMock()
        mock_provider.chat.return_value = ("Done.", [])
        mock_provider.format_assistant_message.return_value = {"role": "assistant", "content": "Done."}

        mock_db = AsyncMock()
        mock_db.get_agent.return_value = _make_agent_data("test-toolpass")
        mock_db.add_event.return_value = None

        with patch("runner.get_db", return_value=mock_db), \
             patch("runner._get_llm_config", return_value=("anthropic", "sk-test", "")), \
             patch("runner.get_provider", return_value=mock_provider), \
             patch("runner._save_output"), \
             patch("runner._sync_db", side_effect=_sync_db_for_test):
            _run(proc, "Check tools")

        call_args = mock_provider.chat.call_args
        assert call_args[0][2] == TOOL_DEFS

    def test_gemini_provider_label(self):
        """When using Gemini, log should show 'Gemini' label."""
        from runner import _run
        proc = AgentProc("test-gemini")

        mock_provider = MagicMock()
        mock_provider.chat.return_value = ("Done.", [])
        mock_provider.format_assistant_message.return_value = {"role": "assistant", "content": "Done."}

        mock_db = AsyncMock()
        mock_db.get_agent.return_value = _make_agent_data("test-gemini")
        mock_db.add_event.return_value = None

        with patch("runner.get_db", return_value=mock_db), \
             patch("runner._get_llm_config", return_value=("gemini", "gk-test", "")), \
             patch("runner.get_provider", return_value=mock_provider), \
             patch("runner._save_output"), \
             patch("runner._sync_db", side_effect=_sync_db_for_test):
            _run(proc, "Gemini task")

        assert any("Gemini" in line for line in proc.lines)

    def test_gemini_missing_key(self):
        """Missing Gemini key should mention GEMINI_API_KEY."""
        from runner import _run
        proc = AgentProc("test-gemini-nokey")

        mock_db = AsyncMock()
        mock_db.get_agent.return_value = _make_agent_data("test-gemini-nokey")

        with patch("runner.get_db", return_value=mock_db), \
             patch("runner._get_llm_config", return_value=("gemini", "", "")), \
             patch("runner._sync_db", side_effect=_sync_db_for_test):
            _run(proc, "Any task")

        assert proc.status == "error"
        assert any("GEMINI_API_KEY" in line for line in proc.lines)
