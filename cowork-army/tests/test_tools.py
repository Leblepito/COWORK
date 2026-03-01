"""
Tests for tools.py — Tool Functions
Path safety, file operations, command execution.
"""
import os
import pytest
from pathlib import Path
from unittest.mock import patch

from tools import read_file, write_file, list_dir, search_files, run_command


@pytest.fixture
def agent_workspace(tmp_path):
    """Create a workspace/<agent_id> structure."""
    ws = tmp_path / "workspace" / "test-agent"
    ws.mkdir(parents=True)
    (ws / "hello.txt").write_text("Hello World", encoding="utf-8")
    (ws / "subdir").mkdir()
    (ws / "subdir" / "nested.py").write_text("print('nested')\n", encoding="utf-8")
    return ws


@pytest.fixture(autouse=True)
def patch_workspace(tmp_path):
    """Patch WORKSPACE to use tmp_path."""
    with patch("tools.WORKSPACE", tmp_path / "workspace"):
        with patch("tools.PROJECT_ROOT", tmp_path):
            yield


class TestReadFile:
    def test_read_existing_file(self, agent_workspace):
        result = read_file("test-agent", "hello.txt")
        assert result["content"] == "Hello World"

    def test_read_nested_file(self, agent_workspace):
        result = read_file("test-agent", "subdir/nested.py")
        assert "print('nested')" in result["content"]

    def test_read_nonexistent_file(self, agent_workspace):
        result = read_file("test-agent", "does_not_exist.txt")
        assert "error" in result

    def test_read_directory_fails(self, agent_workspace):
        result = read_file("test-agent", "subdir")
        assert "error" in result


class TestWriteFile:
    def test_write_new_file(self, agent_workspace):
        result = write_file("test-agent", "new_file.txt", "test content")
        assert result["written"] == len("test content")
        assert (agent_workspace / "new_file.txt").read_text() == "test content"

    def test_write_creates_directories(self, agent_workspace):
        result = write_file("test-agent", "deep/nested/file.txt", "deep content")
        assert "written" in result
        assert (agent_workspace / "deep" / "nested" / "file.txt").exists()

    def test_write_overwrites_existing(self, agent_workspace):
        write_file("test-agent", "hello.txt", "overwritten")
        result = read_file("test-agent", "hello.txt")
        assert result["content"] == "overwritten"

    def test_write_unicode(self, agent_workspace):
        content = "Turkce karakter: cgiosu CGIOSU"
        write_file("test-agent", "turkish.txt", content)
        result = read_file("test-agent", "turkish.txt")
        assert result["content"] == content


class TestListDir:
    def test_list_workspace_root(self, agent_workspace):
        result = list_dir("test-agent")
        names = [e["name"] for e in result["entries"]]
        assert "hello.txt" in names
        assert "subdir" in names

    def test_list_subdir(self, agent_workspace):
        result = list_dir("test-agent", "subdir")
        names = [e["name"] for e in result["entries"]]
        assert "nested.py" in names

    def test_list_nonexistent_dir(self, agent_workspace):
        result = list_dir("test-agent", "no_such_dir")
        assert "error" in result


class TestSearchFiles:
    def test_search_finds_files(self, agent_workspace):
        result = search_files("test-agent", "*.txt")
        assert result["count"] >= 1
        assert "hello.txt" in result["matches"]

    def test_search_finds_nested(self, agent_workspace):
        result = search_files("test-agent", "*.py")
        assert result["count"] >= 1

    def test_search_no_match(self, agent_workspace):
        result = search_files("test-agent", "*.xyz")
        assert result["count"] == 0


class TestRunCommand:
    def test_run_allowed_command(self, agent_workspace):
        result = run_command("test-agent", "echo hello_world")
        assert "hello_world" in result["stdout"]

    def test_run_blocked_command(self, agent_workspace):
        result = run_command("test-agent", "rm -rf /")
        assert "error" in result

    def test_run_ls_command(self, agent_workspace):
        result = run_command("test-agent", "ls")
        assert result["returncode"] == 0
