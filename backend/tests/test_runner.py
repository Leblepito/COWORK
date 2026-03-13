"""Tests for the tool-calling agent runner."""
import os
import sys
import json
from unittest.mock import MagicMock, patch

import pytest


def test_execute_tool_read_file():
    """_execute_tool should call read_file and return JSON."""
    from backend.agents.runner import _execute_tool

    with patch("backend.agents.runner.read_file") as mock_read:
        mock_read.return_value = {"content": "file content here"}
        result = _execute_tool("test-agent", "read_file", {"path": "test.md"})

    parsed = json.loads(result)
    assert parsed["content"] == "file content here"
    mock_read.assert_called_once_with("test-agent", "test.md")


def test_execute_tool_write_file():
    """_execute_tool should call write_file and return JSON."""
    from backend.agents.runner import _execute_tool

    with patch("backend.agents.runner.write_file") as mock_write:
        mock_write.return_value = {"status": "written"}
        result = _execute_tool("test-agent", "write_file", {"path": "out.md", "content": "hello"})

    parsed = json.loads(result)
    assert parsed["status"] == "written"
    mock_write.assert_called_once_with("test-agent", "out.md", "hello")


def test_execute_tool_unknown_tool():
    """_execute_tool should return an error for unknown tools."""
    from backend.agents.runner import _execute_tool

    result = _execute_tool("test-agent", "nonexistent_tool", {})
    parsed = json.loads(result)
    assert "error" in parsed
    assert "Unknown tool" in parsed["error"]


def test_execute_tool_missing_param():
    """_execute_tool should return an error when required param is missing."""
    from backend.agents.runner import _execute_tool

    with patch("backend.agents.runner.read_file") as mock_read:
        mock_read.side_effect = KeyError("path")
        result = _execute_tool("test-agent", "read_file", {})

    parsed = json.loads(result)
    assert "error" in parsed


def test_agent_proc_log_truncates():
    """AgentProc.log should truncate lines to AGENT_OUTPUT_MAX_LINES."""
    from backend.agents.runner import AgentProc

    with patch("backend.agents.runner.AGENT_OUTPUT_MAX_LINES", 3):
        proc = AgentProc("test-agent")
        for i in range(10):
            proc.log(f"Line {i}")

    assert len(proc.lines) <= 3


def test_agent_proc_to_dict():
    """AgentProc.to_dict should return the expected structure."""
    from backend.agents.runner import AgentProc

    proc = AgentProc("my-agent")
    proc.status = "working"
    d = proc.to_dict()

    assert d["agent_id"] == "my-agent"
    assert d["status"] == "working"
    assert "lines" in d
    assert "alive" in d


def test_workspace_context_empty(tmp_path):
    """_workspace_context should return empty string for empty workspace."""
    from backend.agents.runner import _workspace_context

    with patch("backend.agents.runner.WORKSPACE", tmp_path):
        ctx = _workspace_context("nonexistent-agent")

    assert ctx == ""


def test_workspace_context_with_readme(tmp_path):
    """_workspace_context should include README.md content."""
    from backend.agents.runner import _workspace_context

    agent_dir = tmp_path / "test-agent"
    agent_dir.mkdir()
    (agent_dir / "README.md").write_text("# Test Agent\nThis is a test.")

    with patch("backend.agents.runner.WORKSPACE", tmp_path):
        ctx = _workspace_context("test-agent")

    assert "README.md" in ctx
    assert "Test Agent" in ctx
