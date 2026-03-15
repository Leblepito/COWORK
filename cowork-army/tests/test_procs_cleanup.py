"""Tests for PROCS TTL cleanup (Task 12)."""
import pytest
import time
from unittest.mock import MagicMock


def test_cleanup_removes_old_finished_agents():
    from runner import PROCS, cleanup_finished_agents, AgentProc
    proc = MagicMock(spec=AgentProc)
    proc.status = "done"
    proc.alive = False
    proc._finished_at = time.time() - 600
    PROCS["test-cleanup"] = proc
    cleanup_finished_agents(ttl_seconds=300)
    assert "test-cleanup" not in PROCS


def test_cleanup_keeps_recent_finished_agents():
    from runner import PROCS, cleanup_finished_agents, AgentProc
    proc = MagicMock(spec=AgentProc)
    proc.status = "done"
    proc.alive = False
    proc._finished_at = time.time() - 60
    PROCS["test-keep"] = proc
    cleanup_finished_agents(ttl_seconds=300)
    assert "test-keep" in PROCS
    del PROCS["test-keep"]


def test_cleanup_keeps_running_agents():
    from runner import PROCS, cleanup_finished_agents, AgentProc
    proc = MagicMock(spec=AgentProc)
    proc.status = "working"
    proc.alive = True
    PROCS["test-running"] = proc
    cleanup_finished_agents(ttl_seconds=300)
    assert "test-running" in PROCS
    del PROCS["test-running"]


def test_cleanup_keeps_agent_without_finished_at():
    """Agents with no _finished_at should not be cleaned up."""
    from runner import PROCS, cleanup_finished_agents, AgentProc
    proc = MagicMock(spec=AgentProc)
    proc.status = "error"
    proc.alive = False
    proc._finished_at = None
    PROCS["test-no-ts"] = proc
    cleanup_finished_agents(ttl_seconds=300)
    assert "test-no-ts" in PROCS
    del PROCS["test-no-ts"]


def test_agent_proc_uses_deque():
    """AgentProc.lines should be a deque with maxlen=200."""
    import collections
    from runner import AgentProc
    proc = AgentProc("test-deque")
    assert isinstance(proc.lines, collections.deque)
    assert proc.lines.maxlen == 200


def test_agent_proc_finished_at_starts_none():
    """AgentProc._finished_at should start as None."""
    from runner import AgentProc
    proc = AgentProc("test-ft")
    assert proc._finished_at is None
