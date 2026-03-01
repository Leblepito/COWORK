"""
Tests for tools.py — Agent Tools (read/write/list/search/run)
Security checks, path resolution, command whitelisting.
"""
import pytest
from unittest.mock import patch

from tools import read_file, write_file, list_dir, search_files, run_command


@pytest.fixture
def ws(tmp_path):
    """Create a workspace with test files."""
    agent_ws = tmp_path / "test-agent"
    agent_ws.mkdir()
    (agent_ws / "hello.txt").write_text("Hello World")
    sub = agent_ws / "subdir"
    sub.mkdir()
    (sub / "nested.py").write_text("print('nested')")
    return tmp_path


# ═══════════════════════════════════════════════════════════
#  READ FILE
# ═══════════════════════════════════════════════════════════

class TestReadFile:
    def test_read_existing_file(self, ws):
        with patch("tools.WORKSPACE", ws):
            result = read_file("test-agent", "hello.txt")
        assert result["content"] == "Hello World"

    def test_read_nested_file(self, ws):
        with patch("tools.WORKSPACE", ws):
            result = read_file("test-agent", "subdir/nested.py")
        assert "print('nested')" in result["content"]

    def test_read_nonexistent_file(self, ws):
        with patch("tools.WORKSPACE", ws):
            result = read_file("test-agent", "does_not_exist.txt")
        assert "error" in result

    def test_read_directory_fails(self, ws):
        with patch("tools.WORKSPACE", ws):
            result = read_file("test-agent", "subdir")
        assert "error" in result


# ═══════════════════════════════════════════════════════════
#  WRITE FILE
# ═══════════════════════════════════════════════════════════

class TestWriteFile:
    def test_write_new_file(self, ws):
        with patch("tools.WORKSPACE", ws):
            result = write_file("test-agent", "new.txt", "test content")
        assert "written" in result
        assert (ws / "test-agent" / "new.txt").read_text() == "test content"

    def test_write_creates_directories(self, ws):
        with patch("tools.WORKSPACE", ws):
            result = write_file("test-agent", "deep/nested/file.txt", "deep")
        assert "written" in result
        assert (ws / "test-agent" / "deep" / "nested" / "file.txt").exists()

    def test_write_overwrites_existing(self, ws):
        with patch("tools.WORKSPACE", ws):
            write_file("test-agent", "hello.txt", "overwritten")
            result = read_file("test-agent", "hello.txt")
        assert result["content"] == "overwritten"

    def test_write_unicode(self, ws):
        content = "Turkce karakter: cgiösu"
        with patch("tools.WORKSPACE", ws):
            write_file("test-agent", "tr.txt", content)
            result = read_file("test-agent", "tr.txt")
        assert result["content"] == content


# ═══════════════════════════════════════════════════════════
#  LIST DIRECTORY
# ═══════════════════════════════════════════════════════════

class TestListDir:
    def test_list_workspace_root(self, ws):
        with patch("tools.WORKSPACE", ws):
            result = list_dir("test-agent", "")
        assert "entries" in result
        names = [e["name"] for e in result["entries"]]
        assert "hello.txt" in names

    def test_list_subdir(self, ws):
        with patch("tools.WORKSPACE", ws):
            result = list_dir("test-agent", "subdir")
        names = [e["name"] for e in result["entries"]]
        assert "nested.py" in names

    def test_list_nonexistent_dir(self, ws):
        with patch("tools.WORKSPACE", ws):
            result = list_dir("test-agent", "no_such_dir")
        assert "error" in result


# ═══════════════════════════════════════════════════════════
#  SEARCH FILES
# ═══════════════════════════════════════════════════════════

class TestSearchFiles:
    def test_search_finds_files(self, ws):
        with patch("tools.WORKSPACE", ws):
            result = search_files("test-agent", "*.txt")
        assert "matches" in result
        assert "hello.txt" in result["matches"]

    def test_search_finds_nested(self, ws):
        with patch("tools.WORKSPACE", ws):
            result = search_files("test-agent", "*.py")
        assert any("nested.py" in m for m in result["matches"])

    def test_search_no_match(self, ws):
        with patch("tools.WORKSPACE", ws):
            result = search_files("test-agent", "*.xyz")
        assert result["count"] == 0


# ═══════════════════════════════════════════════════════════
#  RUN COMMAND
# ═══════════════════════════════════════════════════════════

class TestRunCommand:
    def test_run_allowed_command(self, ws):
        with patch("tools.WORKSPACE", ws):
            result = run_command("test-agent", "echo hello")
        assert result["returncode"] == 0
        assert "hello" in result["stdout"]

    def test_run_blocked_command(self, ws):
        with patch("tools.WORKSPACE", ws):
            result = run_command("test-agent", "rm -rf /")
        assert "error" in result

    def test_run_ls_command(self, ws):
        with patch("tools.WORKSPACE", ws):
            result = run_command("test-agent", "ls")
        assert result["returncode"] == 0
