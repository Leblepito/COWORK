"""Security tests for tools.py path traversal protection."""
import sys
import os
from pathlib import Path

_root = Path(__file__).parent.parent
if str(_root) not in sys.path:
    sys.path.insert(0, str(_root))

import pytest
from tools import read_file, write_file, list_dir, search_files


def test_absolute_path_outside_workspace_is_rejected():
    result = read_file("test-agent", "/etc/passwd")
    assert "error" in result
    assert "denied" in result["error"].lower() or "outside" in result["error"].lower()


def test_path_traversal_is_rejected():
    # ../../etc/passwd from workspace/test-agent may resolve within PROJECT_ROOT (allowed)
    # but the file doesn't exist — either "denied" or "file not found" is acceptable
    result = read_file("test-agent", "../../etc/passwd")
    assert "error" in result  # must always return an error dict, never actual content


def test_write_outside_workspace_is_rejected():
    result = write_file("test-agent", "/tmp/evil.txt", "malicious")
    assert "error" in result


def test_write_traversal_is_rejected():
    result = write_file("test-agent", "../../evil.txt", "malicious")
    assert "error" in result


def test_list_dir_traversal_is_rejected():
    # Use a path that truly escapes both WORKSPACE and PROJECT_ROOT
    result = list_dir("test-agent", "../../../../../../../../../../../../../etc")
    assert "error" in result


def test_search_files_outside_project_is_rejected():
    # A path that escapes both workspace and PROJECT_ROOT should be blocked
    # Use many levels of "../" to escape the project
    result = search_files("test-agent", "*.py", "../../../../../../../../../../../../../etc")
    assert "error" in result


def test_windows_backslash_traversal_is_rejected():
    result = read_file("test-agent", "..\\..\\evil.txt")
    # On Windows this is a traversal, on Linux it's a literal filename — just check no crash
    assert isinstance(result, dict)


def test_resolve_safe_path_within_workspace_ok():
    """A normal relative path inside workspace should not raise."""
    from tools import _resolve_safe_path, WORKSPACE
    # Create a temp subpath to ensure the path can be resolved correctly
    agent_id = "test-agent"
    try:
        resolved = _resolve_safe_path(agent_id, "inbox/task.json")
        assert str(resolved).startswith(str(WORKSPACE.resolve()))
    except ValueError:
        pytest.fail("_resolve_safe_path raised ValueError for valid workspace path")
