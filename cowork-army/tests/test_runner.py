"""
Tests for runner.py — Agent Lifecycle & Tool Use Integration
AgentProc state, spawn/kill, output buffer, tool execution, Claude API loop.
"""
import json
import asyncio
import pytest
from unittest.mock import patch, MagicMock, AsyncMock
from runner import AgentProc, PROCS, CLAUDE_TOOLS, _execute_tool


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
#  CLAUDE TOOLS SCHEMA
# ═══════════════════════════════════════════════════════════

class TestClaudeTools:
    def test_five_tools_defined(self):
        assert len(CLAUDE_TOOLS) == 5

    def test_all_have_required_fields(self):
        for tool in CLAUDE_TOOLS:
            assert "name" in tool
            assert "description" in tool
            assert "input_schema" in tool
            assert tool["input_schema"]["type"] == "object"
            assert "properties" in tool["input_schema"]

    def test_tool_names(self):
        names = [t["name"] for t in CLAUDE_TOOLS]
        assert "read_file" in names
        assert "write_file" in names
        assert "list_dir" in names
        assert "search_files" in names
        assert "run_command" in names

    def test_read_file_requires_path(self):
        tool = next(t for t in CLAUDE_TOOLS if t["name"] == "read_file")
        assert "path" in tool["input_schema"]["properties"]
        assert "path" in tool["input_schema"]["required"]

    def test_write_file_requires_path_and_content(self):
        tool = next(t for t in CLAUDE_TOOLS if t["name"] == "write_file")
        assert "path" in tool["input_schema"]["required"]
        assert "content" in tool["input_schema"]["required"]


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
#  TOOL USE LOOP (_run with mocked Claude API)
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


def _make_text_block(text):
    block = MagicMock()
    block.type = "text"
    block.text = text
    return block


def _make_tool_use_block(name, tool_input, tool_id="tool-1"):
    block = MagicMock()
    block.type = "tool_use"
    block.name = name
    block.input = tool_input
    block.id = tool_id
    return block


class TestToolUseRun:
    def test_simple_response_no_tools(self):
        """Claude returns text only — no tool calls, task completes."""
        from runner import _run
        proc = AgentProc("test-simple")

        response = MagicMock()
        response.content = [_make_text_block("Task done.")]

        mock_client = MagicMock()
        mock_client.messages.create.return_value = response

        mock_db = AsyncMock()
        mock_db.get_agent.return_value = _make_agent_data("test-simple")
        mock_db.add_event.return_value = None

        with patch("runner.get_db", return_value=mock_db), \
             patch("runner._get_api_key", return_value="sk-test-key"), \
             patch("runner.Anthropic", return_value=mock_client), \
             patch("runner._save_output"), \
             patch("runner._sync_db", side_effect=_sync_db_for_test):
            _run(proc, "Simple task")

        assert proc.status == "done"
        mock_client.messages.create.assert_called_once()

    def test_tool_use_round_then_done(self):
        """Claude calls a tool, gets result, then responds with text."""
        from runner import _run
        proc = AgentProc("test-tools")

        # Round 1: tool_use
        resp1 = MagicMock()
        resp1.content = [
            _make_text_block("Let me read that file."),
            _make_tool_use_block("read_file", {"path": "test.txt"}, "call-1"),
        ]

        # Round 2: text only (done)
        resp2 = MagicMock()
        resp2.content = [_make_text_block("File contains: hello world.")]

        mock_client = MagicMock()
        mock_client.messages.create.side_effect = [resp1, resp2]

        mock_db = AsyncMock()
        mock_db.get_agent.return_value = _make_agent_data("test-tools")
        mock_db.add_event.return_value = None

        with patch("runner.get_db", return_value=mock_db), \
             patch("runner._get_api_key", return_value="sk-test"), \
             patch("runner.Anthropic", return_value=mock_client), \
             patch("runner.read_file", return_value={"content": "hello world"}), \
             patch("runner._save_output"), \
             patch("runner._sync_db", side_effect=_sync_db_for_test):
            _run(proc, "Read test.txt")

        assert proc.status == "done"
        assert mock_client.messages.create.call_count == 2

    def test_multiple_tool_calls_in_one_response(self):
        """Claude returns multiple tool_use blocks in a single response."""
        from runner import _run
        proc = AgentProc("test-multi")

        # Round 1: two tool calls
        resp1 = MagicMock()
        resp1.content = [
            _make_tool_use_block("read_file", {"path": "a.txt"}, "call-1"),
            _make_tool_use_block("list_dir", {"path": "."}, "call-2"),
        ]

        # Round 2: done
        resp2 = MagicMock()
        resp2.content = [_make_text_block("All done.")]

        mock_client = MagicMock()
        mock_client.messages.create.side_effect = [resp1, resp2]

        mock_db = AsyncMock()
        mock_db.get_agent.return_value = _make_agent_data("test-multi")
        mock_db.add_event.return_value = None

        with patch("runner.get_db", return_value=mock_db), \
             patch("runner._get_api_key", return_value="sk-test"), \
             patch("runner.Anthropic", return_value=mock_client), \
             patch("runner.read_file", return_value={"content": "aaa"}), \
             patch("runner.list_dir", return_value={"files": ["a.txt"]}), \
             patch("runner._save_output"), \
             patch("runner._sync_db", side_effect=_sync_db_for_test):
            _run(proc, "Read and list")

        assert proc.status == "done"
        assert mock_client.messages.create.call_count == 2

    def test_api_key_missing(self):
        """Missing API key should set error status."""
        from runner import _run
        proc = AgentProc("test-nokey")

        mock_db = AsyncMock()
        mock_db.get_agent.return_value = _make_agent_data("test-nokey")

        with patch("runner.get_db", return_value=mock_db), \
             patch("runner._get_api_key", return_value=""), \
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

    def test_claude_api_exception(self):
        """Claude API error should set error status."""
        from runner import _run
        proc = AgentProc("test-apierr")

        mock_client = MagicMock()
        mock_client.messages.create.side_effect = Exception("API rate limit exceeded")

        mock_db = AsyncMock()
        mock_db.get_agent.return_value = _make_agent_data("test-apierr")
        mock_db.add_event.return_value = None

        with patch("runner.get_db", return_value=mock_db), \
             patch("runner._get_api_key", return_value="sk-test"), \
             patch("runner.Anthropic", return_value=mock_client), \
             patch("runner._sync_db", side_effect=_sync_db_for_test):
            _run(proc, "Will fail")

        assert proc.status == "error"
        assert any("rate limit" in line.lower() for line in proc.lines)

    def test_tools_passed_to_claude(self):
        """Verify CLAUDE_TOOLS are passed to the API call."""
        from runner import _run
        proc = AgentProc("test-toolpass")

        response = MagicMock()
        response.content = [_make_text_block("Done.")]

        mock_client = MagicMock()
        mock_client.messages.create.return_value = response

        mock_db = AsyncMock()
        mock_db.get_agent.return_value = _make_agent_data("test-toolpass")
        mock_db.add_event.return_value = None

        with patch("runner.get_db", return_value=mock_db), \
             patch("runner._get_api_key", return_value="sk-test"), \
             patch("runner.Anthropic", return_value=mock_client), \
             patch("runner._save_output"), \
             patch("runner._sync_db", side_effect=_sync_db_for_test):
            _run(proc, "Check tools")

        call_kwargs = mock_client.messages.create.call_args
        assert call_kwargs.kwargs.get("tools") == CLAUDE_TOOLS or \
               (len(call_kwargs.args) == 0 and "tools" in call_kwargs.kwargs)
