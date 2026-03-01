"""
Tests for autonomous.py — Autonomous Loop (v7)
Start/stop, tick logic, async event generation.
"""
import json
import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from pathlib import Path

from autonomous import AutonomousLoop


# ── Fixtures ─────────────────────────────────────────────

@pytest.fixture
def mock_db():
    db = AsyncMock()
    db.get_all_agents.return_value = []
    db.add_event.return_value = None
    db.get_events.return_value = []
    db.get_event_count.return_value = 0
    return db


@pytest.fixture
def loop_instance(mock_db):
    """Create an AutonomousLoop with mocked DB."""
    with patch("autonomous.get_db", return_value=mock_db):
        loop = AutonomousLoop()
        yield loop
        # Ensure stopped
        loop.running = False
        if loop._task:
            loop._task.cancel()


# ═══════════════════════════════════════════════════════════
#  START / STOP
# ═══════════════════════════════════════════════════════════

class TestStartStop:
    def test_initial_state(self, loop_instance):
        assert loop_instance.running is False
        assert loop_instance.tick_count == 0
        assert loop_instance.last_tick is None

    @pytest.mark.asyncio
    async def test_start(self, loop_instance, mock_db):
        with patch("autonomous.get_db", return_value=mock_db):
            await loop_instance.start()
        assert loop_instance.running is True
        assert loop_instance._task is not None
        with patch("autonomous.get_db", return_value=mock_db):
            await loop_instance.stop()

    @pytest.mark.asyncio
    async def test_start_idempotent(self, loop_instance, mock_db):
        with patch("autonomous.get_db", return_value=mock_db):
            await loop_instance.start()
            task1 = loop_instance._task
            await loop_instance.start()  # Second start should be no-op
            assert loop_instance._task is task1
            await loop_instance.stop()

    @pytest.mark.asyncio
    async def test_stop(self, loop_instance, mock_db):
        with patch("autonomous.get_db", return_value=mock_db):
            await loop_instance.start()
            await loop_instance.stop()
        assert loop_instance.running is False

    @pytest.mark.asyncio
    async def test_stop_idempotent(self, loop_instance, mock_db):
        with patch("autonomous.get_db", return_value=mock_db):
            await loop_instance.stop()  # Stop without start
        assert loop_instance.running is False


# ═══════════════════════════════════════════════════════════
#  TICK LOGIC
# ═══════════════════════════════════════════════════════════

class TestTick:
    @pytest.mark.asyncio
    async def test_tick_increments_counter(self, loop_instance, mock_db):
        mock_db.get_all_agents.return_value = []
        with patch("autonomous.get_db", return_value=mock_db):
            await loop_instance._tick()
        assert loop_instance.tick_count == 1
        assert loop_instance.last_tick is not None

    @pytest.mark.asyncio
    async def test_tick_checks_agents(self, loop_instance, mock_db):
        mock_db.get_all_agents.return_value = [
            {"id": "cargo", "workspace_dir": "cargo"},
        ]
        with patch("autonomous.get_db", return_value=mock_db), \
             patch("autonomous.WORKSPACE", Path("/nonexistent")):
            await loop_instance._tick()
        assert loop_instance.tick_count == 1

    @pytest.mark.asyncio
    async def test_tick_spawns_agent_with_inbox_task(self, loop_instance, mock_db, tmp_path):
        mock_db.get_all_agents.return_value = [
            {"id": "full-stack", "workspace_dir": "full-stack"},
        ]
        # Create inbox with task file
        inbox = tmp_path / "full-stack" / "inbox"
        inbox.mkdir(parents=True)
        task_file = inbox / "TASK-001.json"
        task_file.write_text(json.dumps({"title": "Build page", "description": "React"}))

        mock_spawn = AsyncMock(return_value={"status": "thinking"})

        with patch("autonomous.get_db", return_value=mock_db), \
             patch("autonomous.WORKSPACE", tmp_path), \
             patch("autonomous.PROCS", {}), \
             patch("autonomous.spawn_agent", mock_spawn):
            await loop_instance._tick()

        mock_spawn.assert_called_once()

    @pytest.mark.asyncio
    async def test_tick_skips_alive_agent(self, loop_instance, mock_db, tmp_path):
        mock_db.get_all_agents.return_value = [
            {"id": "full-stack", "workspace_dir": "full-stack"},
        ]
        inbox = tmp_path / "full-stack" / "inbox"
        inbox.mkdir(parents=True)
        (inbox / "TASK-001.json").write_text(json.dumps({"title": "Test"}))

        alive_proc = MagicMock()
        alive_proc.alive = True

        mock_spawn = AsyncMock()

        with patch("autonomous.get_db", return_value=mock_db), \
             patch("autonomous.WORKSPACE", tmp_path), \
             patch("autonomous.PROCS", {"full-stack": alive_proc}), \
             patch("autonomous.spawn_agent", mock_spawn):
            await loop_instance._tick()

        mock_spawn.assert_not_called()


# ═══════════════════════════════════════════════════════════
#  STATUS
# ═══════════════════════════════════════════════════════════

class TestStatus:
    @pytest.mark.asyncio
    async def test_status_returns_dict(self, loop_instance, mock_db):
        with patch("autonomous.get_db", return_value=mock_db):
            status = await loop_instance.status()
        assert status["running"] is False
        assert status["tick_count"] == 0
        assert "total_events" in status
        assert "agents_tracked" in status
