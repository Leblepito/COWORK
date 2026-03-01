"""
Tests for tools.py — Security Sandbox (CRITICAL)
Path traversal, command injection, resource limits, tool execution.
"""
import asyncio
import os

import pytest

from tools import ToolExecutor, _BLOCKED_RE, MAX_FILE_SIZE


# ── Fixtures ─────────────────────────────────────────────

@pytest.fixture
def executor(tmp_workspace):
    return ToolExecutor(tmp_workspace)


@pytest.fixture
def workspace(tmp_workspace):
    return tmp_workspace


# ═══════════════════════════════════════════════════════════
#  PATH SAFETY TESTS
# ═══════════════════════════════════════════════════════════

class TestPathSafety:
    """Verify _resolve blocks path escaping attempts."""

    def test_resolve_normal_relative(self, executor, workspace):
        result = executor._resolve("hello.txt")
        assert result == os.path.join(workspace, "hello.txt")

    def test_resolve_subdir(self, executor, workspace):
        result = executor._resolve("subdir/nested.py")
        assert result == os.path.join(workspace, "subdir", "nested.py")

    def test_resolve_dot_returns_root(self, executor, workspace):
        assert executor._resolve(".") == workspace

    def test_resolve_slash_returns_root(self, executor, workspace):
        assert executor._resolve("/") == workspace

    def test_resolve_empty_returns_root(self, executor, workspace):
        assert executor._resolve("") == workspace

    def test_resolve_parent_traversal_blocked(self, executor):
        with pytest.raises(PermissionError, match="escapes workspace"):
            executor._resolve("../../etc/passwd")

    def test_resolve_absolute_path_blocked(self, executor):
        with pytest.raises(PermissionError, match="escapes workspace"):
            executor._resolve("/etc/passwd")

    def test_resolve_dot_dot_in_middle_blocked(self, executor):
        with pytest.raises(PermissionError, match="escapes workspace"):
            executor._resolve("subdir/../../etc/passwd")

    def test_resolve_symlink_escaping_blocked(self, executor, workspace):
        # Create a symlink that points outside workspace
        link_path = os.path.join(workspace, "evil_link")
        os.symlink("/etc", link_path)
        with pytest.raises(PermissionError, match="escapes workspace"):
            executor._resolve("evil_link/passwd")


# ═══════════════════════════════════════════════════════════
#  BLOCKED COMMANDS
# ═══════════════════════════════════════════════════════════

class TestBlockedCommands:
    """Verify dangerous commands are blocked."""

    @pytest.mark.parametrize("cmd", [
        "rm -rf /",
        "rm -rf / --no-preserve-root",
        "sudo apt install something",
        "mkfs /dev/sda1",
        "dd if=/dev/zero of=/dev/sda",
        "shutdown -h now",
        "reboot",
        "format C:",
        "del /s /q C:\\Windows",
    ])
    def test_blocked_commands_detected(self, cmd):
        assert _BLOCKED_RE.search(cmd) is not None

    @pytest.mark.parametrize("cmd", [
        "ls -la",
        "python script.py",
        "echo hello",
        "cat file.txt",
        "npm install",
        "git status",
        "pip install requests",
    ])
    def test_safe_commands_not_blocked(self, cmd):
        assert _BLOCKED_RE.search(cmd) is None


# ═══════════════════════════════════════════════════════════
#  READ FILE
# ═══════════════════════════════════════════════════════════

class TestReadFile:
    """Test read_file tool."""

    def test_read_existing_file(self, executor):
        result = executor._read_file("hello.txt")
        assert result == "Hello World"

    def test_read_nested_file(self, executor):
        result = executor._read_file("subdir/nested.py")
        assert "print('nested')" in result

    def test_read_nonexistent_file(self, executor):
        result = executor._read_file("does_not_exist.txt")
        assert "ERROR" in result

    def test_read_directory_fails(self, executor):
        result = executor._read_file("subdir")
        assert "ERROR" in result

    def test_read_large_file_blocked(self, executor, workspace):
        large_file = os.path.join(workspace, "large.bin")
        with open(large_file, "w") as f:
            f.write("x" * (MAX_FILE_SIZE + 1))
        result = executor._read_file("large.bin")
        assert "ERROR" in result
        assert "too large" in result

    def test_read_file_at_size_limit(self, executor, workspace):
        limit_file = os.path.join(workspace, "limit.txt")
        content = "x" * MAX_FILE_SIZE
        with open(limit_file, "w") as f:
            f.write(content)
        result = executor._read_file("limit.txt")
        assert len(result) == MAX_FILE_SIZE

    def test_read_path_escaping_raises(self, executor):
        """Direct _read_file call raises PermissionError for path escape."""
        with pytest.raises(PermissionError, match="escapes workspace"):
            executor._read_file("../../etc/passwd")


# ═══════════════════════════════════════════════════════════
#  WRITE FILE
# ═══════════════════════════════════════════════════════════

class TestWriteFile:
    """Test write_file tool."""

    def test_write_new_file(self, executor, workspace):
        result = executor._write_file("new_file.txt", "test content")
        assert "OK" in result
        written = open(os.path.join(workspace, "new_file.txt")).read()
        assert written == "test content"

    def test_write_creates_directories(self, executor, workspace):
        result = executor._write_file("deep/nested/dir/file.txt", "deep content")
        assert "OK" in result
        path = os.path.join(workspace, "deep", "nested", "dir", "file.txt")
        assert os.path.exists(path)

    def test_write_overwrites_existing(self, executor, workspace):
        executor._write_file("hello.txt", "overwritten")
        result = executor._read_file("hello.txt")
        assert result == "overwritten"

    def test_write_unicode_content(self, executor, workspace):
        content = "Türkçe karakter: çğıöşü ÇĞIÖŞÜ"
        executor._write_file("turkish.txt", content)
        result = executor._read_file("turkish.txt")
        assert result == content

    def test_write_reports_char_count(self, executor):
        result = executor._write_file("count.txt", "12345")
        assert "5 chars" in result


# ═══════════════════════════════════════════════════════════
#  LIST DIRECTORY
# ═══════════════════════════════════════════════════════════

class TestListDirectory:
    """Test list_directory tool."""

    def test_list_root(self, executor):
        result = executor._list_directory(".")
        assert "hello.txt" in result
        assert "subdir/" in result

    def test_list_subdir(self, executor):
        result = executor._list_directory("subdir")
        assert "nested.py" in result

    def test_list_nonexistent_dir(self, executor):
        result = executor._list_directory("no_such_dir")
        assert "ERROR" in result

    def test_list_file_as_dir_fails(self, executor):
        result = executor._list_directory("hello.txt")
        assert "ERROR" in result

    def test_list_empty_dir(self, executor, workspace):
        os.makedirs(os.path.join(workspace, "empty_dir"))
        result = executor._list_directory("empty_dir")
        assert "empty directory" in result


# ═══════════════════════════════════════════════════════════
#  SEARCH CODE
# ═══════════════════════════════════════════════════════════

class TestSearchCode:
    """Test search_code tool."""

    @pytest.mark.asyncio
    async def test_search_finds_match(self, executor):
        result = await executor._search_code("Hello", ".", "")
        assert "hello.txt" in result
        assert "Found" in result

    @pytest.mark.asyncio
    async def test_search_no_match(self, executor):
        result = await executor._search_code("NONEXISTENT_PATTERN_XYZ", ".", "")
        assert "No matches" in result

    @pytest.mark.asyncio
    async def test_search_with_glob(self, executor):
        result = await executor._search_code("print", ".", "*.py")
        assert "nested.py" in result

    @pytest.mark.asyncio
    async def test_search_invalid_regex(self, executor):
        result = await executor._search_code("[invalid", ".", "")
        assert "ERROR" in result
        assert "regex" in result.lower()

    @pytest.mark.asyncio
    async def test_search_nonexistent_dir(self, executor):
        result = await executor._search_code("test", "no_such_dir", "")
        assert "ERROR" in result


# ═══════════════════════════════════════════════════════════
#  RUN COMMAND
# ═══════════════════════════════════════════════════════════

class TestRunCommand:
    """Test run_command tool."""

    @pytest.mark.asyncio
    async def test_run_simple_command(self, executor):
        result = await executor._run_command("echo hello_world")
        assert "hello_world" in result

    @pytest.mark.asyncio
    async def test_run_blocked_command(self, executor):
        result = await executor._run_command("sudo apt install malware")
        assert "ERROR" in result
        assert "blocked" in result.lower()

    @pytest.mark.asyncio
    async def test_run_command_captures_stderr(self, executor):
        result = await executor._run_command("ls /nonexistent_dir_xyz 2>&1 || true")
        # Command should run and capture output
        assert isinstance(result, str)

    @pytest.mark.asyncio
    async def test_run_command_exit_code(self, executor):
        result = await executor._run_command("false")
        assert "exit code" in result

    @pytest.mark.asyncio
    async def test_run_command_cwd_is_workspace(self, executor, workspace):
        result = await executor._run_command("pwd")
        assert workspace in result


# ═══════════════════════════════════════════════════════════
#  TOOL DISPATCH
# ═══════════════════════════════════════════════════════════

class TestToolDispatch:
    """Test the execute() dispatcher."""

    @pytest.mark.asyncio
    async def test_dispatch_read_file(self, executor):
        result = await executor.execute("read_file", {"path": "hello.txt"})
        assert result == "Hello World"

    @pytest.mark.asyncio
    async def test_dispatch_write_file(self, executor, workspace):
        result = await executor.execute("write_file", {"path": "test.txt", "content": "abc"})
        assert "OK" in result

    @pytest.mark.asyncio
    async def test_dispatch_list_directory(self, executor):
        result = await executor.execute("list_directory", {"path": "."})
        assert "hello.txt" in result

    @pytest.mark.asyncio
    async def test_dispatch_unknown_tool(self, executor):
        result = await executor.execute("unknown_tool", {})
        assert "ERROR" in result
        assert "Unknown tool" in result

    @pytest.mark.asyncio
    async def test_dispatch_path_escape_returns_error(self, executor):
        result = await executor.execute("read_file", {"path": "../../etc/passwd"})
        assert "ERROR" in result
        assert "Access denied" in result
