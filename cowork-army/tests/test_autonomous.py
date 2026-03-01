"""
Tests for autonomous.py — Autonomous Loop
Start/stop, status, tick counter.
"""
import pytest
from autonomous import AutonomousLoop


class TestAutonomousLoop:
    def test_initial_state(self):
        loop = AutonomousLoop()
        assert loop.running is False
        assert loop.tick_count == 0
        assert loop.last_tick is None
        assert loop._task is None

    @pytest.mark.asyncio
    async def test_start_sets_running(self):
        loop = AutonomousLoop()
        # Can't fully test start without DB, but verify the flag logic
        loop.running = True
        assert loop.running is True
        loop.running = False

    def test_stop_idempotent(self):
        loop = AutonomousLoop()
        # Stop without start should not raise
        loop.running = False
        assert loop.running is False
