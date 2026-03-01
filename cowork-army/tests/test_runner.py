"""
Tests for runner.py — Agent Lifecycle
AgentProc state, spawn/kill, output buffer.
"""
import pytest
from runner import AgentProc, PROCS


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
