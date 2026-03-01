"""
Tests for runner.py — Agent Lifecycle (HIGH)
Spawn/kill lifecycle, status management, output buffer, helpers.
"""
import asyncio
from collections import deque
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from runner import AgentProcess, AgentRunner, OUTPUT_BUFFER_SIZE


# ── Fixtures ─────────────────────────────────────────────

@pytest.fixture
def mock_db(seeded_db):
    """Use the seeded database."""
    return seeded_db


@pytest.fixture
def event_log():
    """Collects event callbacks."""
    log = []
    def cb(agent_id, message, etype):
        log.append((agent_id, message, etype))
    return log, cb


@pytest.fixture
def runner(mock_db, event_log, tmp_path):
    """Create an AgentRunner with mocked DB."""
    log, cb = event_log
    return AgentRunner(
        cowork_root=str(tmp_path),
        anthropic_api_key="",  # No real API key
        event_callback=cb,
        db=mock_db,
    )


# ═══════════════════════════════════════════════════════════
#  AGENT PROCESS
# ═══════════════════════════════════════════════════════════

class TestAgentProcess:
    """Test AgentProcess state container."""

    def test_initial_state(self):
        proc = AgentProcess("test-agent")
        assert proc.agent_id == "test-agent"
        assert proc.status == "idle"
        assert proc.alive is False
        assert proc.started_at is None
        assert proc.task_description is None

    def test_output_buffer_is_deque(self):
        proc = AgentProcess("test")
        assert isinstance(proc.output_buffer, deque)
        assert proc.output_buffer.maxlen == OUTPUT_BUFFER_SIZE

    def test_output_buffer_max_size(self):
        proc = AgentProcess("test")
        for i in range(OUTPUT_BUFFER_SIZE + 100):
            proc.output_buffer.append(f"line {i}")
        assert len(proc.output_buffer) == OUTPUT_BUFFER_SIZE


# ═══════════════════════════════════════════════════════════
#  AGENT RUNNER INIT
# ═══════════════════════════════════════════════════════════

class TestAgentRunnerInit:
    """Test runner initialization and process management."""

    def test_processes_created_for_all_agents(self, runner, mock_db):
        agents = mock_db.get_all_agents()
        for agent in agents:
            assert agent["id"] in runner.processes

    def test_ensure_process_new_agent(self, runner):
        proc = runner.ensure_process("new-dynamic-agent")
        assert proc.agent_id == "new-dynamic-agent"
        assert "new-dynamic-agent" in runner.processes

    def test_ensure_process_existing(self, runner):
        proc1 = runner.ensure_process("commander")
        proc2 = runner.ensure_process("commander")
        assert proc1 is proc2


# ═══════════════════════════════════════════════════════════
#  SPAWN / KILL
# ═══════════════════════════════════════════════════════════

class TestSpawnKill:
    """Test spawn and kill lifecycle."""

    @pytest.mark.asyncio
    async def test_spawn_unknown_agent(self, runner):
        result = await runner.spawn("nonexistent-agent")
        assert result.get("error") == "unknown agent"

    @pytest.mark.asyncio
    async def test_spawn_no_api_key(self, runner):
        """Spawn without API key should set error status."""
        result = await runner.spawn("web-dev", "test task")
        # The task is created, wait briefly for it to run
        await asyncio.sleep(0.1)
        proc = runner.processes["web-dev"]
        # Should have errored because no API key
        assert proc.status == "error"
        assert proc.alive is False

    @pytest.mark.asyncio
    async def test_spawn_sets_initial_state(self, runner):
        # Patch _run_agent to not actually call API
        with patch.object(runner, '_run_agent', new_callable=AsyncMock):
            result = await runner.spawn("web-dev", "build the frontend")
            assert result["agent_id"] == "web-dev"
            assert result["alive"] is True
            assert result["status"] == "thinking"

    @pytest.mark.asyncio
    async def test_spawn_already_alive_returns_status(self, runner):
        with patch.object(runner, '_run_agent', new_callable=AsyncMock):
            await runner.spawn("web-dev", "task 1")
            result = await runner.spawn("web-dev", "task 2")
            # Should return current status, not spawn again
            assert result["alive"] is True

    @pytest.mark.asyncio
    async def test_kill_running_agent(self, runner):
        async def slow_task(agent_id, proc):
            await asyncio.sleep(10)

        with patch.object(runner, '_run_agent', side_effect=slow_task):
            await runner.spawn("web-dev", "long task")
            result = await runner.kill("web-dev")
            assert result["status"] == "killed"

    @pytest.mark.asyncio
    async def test_kill_unknown_agent(self, runner):
        result = await runner.kill("nonexistent")
        assert result["status"] == "error"

    @pytest.mark.asyncio
    async def test_kill_idle_agent(self, runner):
        result = await runner.kill("web-dev")
        assert result["status"] == "killed"


# ═══════════════════════════════════════════════════════════
#  STATUS & OUTPUT
# ═══════════════════════════════════════════════════════════

class TestStatusOutput:
    """Test status retrieval and output."""

    def test_get_status_existing(self, runner):
        status = runner.get_status("web-dev")
        assert status["agent_id"] == "web-dev"
        assert status["status"] == "idle"

    def test_get_status_unknown(self, runner):
        assert runner.get_status("nonexistent") == {}

    def test_get_all_statuses(self, runner, mock_db):
        statuses = runner.get_all_statuses()
        agents = mock_db.get_all_agents()
        assert len(statuses) == len(agents)

    def test_get_output_empty(self, runner):
        output = runner.get_output("web-dev")
        assert output == []

    def test_get_output_returns_last_lines(self, runner):
        proc = runner.processes["web-dev"]
        for i in range(20):
            proc.output_buffer.append(f"Line {i}")
        output = runner.get_output("web-dev")
        assert len(output) == 20

    def test_get_output_unknown(self, runner):
        assert runner.get_output("nonexistent") == []


# ═══════════════════════════════════════════════════════════
#  STATUS INFERENCE
# ═══════════════════════════════════════════════════════════

class TestStatusInference:
    """Test _infer_status and _tool_status helpers."""

    @pytest.mark.parametrize("text,expected", [
        ("Projeyi analiz ediyorum", "thinking"),
        ("Düşünüyorum nasıl yapılacak", "thinking"),
        ("Plan hazırlıyorum", "planning"),
        ("Strateji belirleniyor", "planning"),
        ("Kodu yazıyorum", "coding"),
        ("Implement ediyorum", "coding"),
        ("Dosyaları ara ve tara", "searching"),
        ("Hata bul ve search yap", "searching"),
        ("İşlem devam ediyor", "working"),
    ])
    def test_infer_status(self, text, expected):
        assert AgentRunner._infer_status(text) == expected

    @pytest.mark.parametrize("tool,expected", [
        ("read_file", "searching"),
        ("write_file", "coding"),
        ("list_directory", "searching"),
        ("search_code", "searching"),
        ("run_command", "working"),
        ("unknown", "working"),
    ])
    def test_tool_status(self, tool, expected):
        assert AgentRunner._tool_status(tool) == expected
