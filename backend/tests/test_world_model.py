"""Tests for AgentWorldModel and WorldModelManager."""
import pytest
from backend.agents.world_model import AgentWorldModel, WorldModelManager


def test_world_model_energy_decreases_with_tasks():
    wm = AgentWorldModel(agent_id="trade-indicator")
    initial_energy = wm.energy_level
    wm.start_task("test task")
    assert wm.energy_level < initial_energy
    assert wm.current_task == "test task"


def test_world_model_energy_recovers_on_complete_success():
    wm = AgentWorldModel(agent_id="trade-indicator", energy_level=0.5)
    wm.start_task("test task")
    energy_after_start = wm.energy_level
    wm.complete_task(success=True)
    assert wm.energy_level > energy_after_start
    assert wm.current_task is None


def test_world_model_energy_recovers_on_complete_fail():
    wm = AgentWorldModel(agent_id="trade-indicator", energy_level=0.5)
    wm.start_task("test task")
    energy_after_start = wm.energy_level
    wm.complete_task(success=False)
    assert wm.energy_level > energy_after_start
    assert wm.current_task is None


def test_expertise_score_increases_on_success():
    wm = AgentWorldModel(agent_id="trade-indicator", expertise_score=0.5)
    wm.start_task("test task")
    wm.complete_task(success=True)
    assert wm.expertise_score > 0.5


def test_expertise_score_decreases_on_failure():
    wm = AgentWorldModel(agent_id="trade-indicator", expertise_score=0.5)
    wm.start_task("test task")
    wm.complete_task(success=False)
    assert wm.expertise_score < 0.5


def test_expertise_score_clamped_between_0_and_1():
    wm = AgentWorldModel(agent_id="trade-indicator", expertise_score=0.99)
    for _ in range(100):
        wm.start_task("task")
        wm.complete_task(success=True)
    assert wm.expertise_score <= 1.0

    wm2 = AgentWorldModel(agent_id="trade-indicator", expertise_score=0.01)
    for _ in range(100):
        wm2.start_task("task")
        wm2.complete_task(success=False)
    assert wm2.expertise_score >= 0.0


def test_trust_network_updates_on_success():
    wm = AgentWorldModel(agent_id="trade-indicator")
    wm.update_trust("software-fullstack", success=True)
    assert "software-fullstack" in wm.trust_network
    assert wm.trust_network["software-fullstack"] > 0.5


def test_trust_network_updates_on_failure():
    wm = AgentWorldModel(agent_id="trade-indicator")
    wm.update_trust("software-fullstack", success=False)
    assert wm.trust_network["software-fullstack"] < 0.5


def test_is_idle_when_no_task():
    wm = AgentWorldModel(agent_id="trade-indicator")
    assert wm.is_idle() is True


def test_is_not_idle_when_has_task():
    wm = AgentWorldModel(agent_id="trade-indicator")
    wm.start_task("doing something")
    assert wm.is_idle() is False


def test_working_memory_capped_at_20():
    wm = AgentWorldModel(agent_id="trade-indicator")
    for i in range(25):
        wm.add_to_working_memory({"step": i})
    assert len(wm.working_memory) == 20
    # Should keep the latest entries
    assert wm.working_memory[-1]["step"] == 24


def test_to_dict_returns_all_fields():
    wm = AgentWorldModel(agent_id="trade-indicator", expertise_score=0.7)
    d = wm.to_dict()
    assert d["agent_id"] == "trade-indicator"
    assert d["expertise_score"] == 0.7
    assert "energy_level" in d
    assert "trust_network" in d
    assert "current_task" in d


def test_world_model_manager_get_or_create():
    mgr = WorldModelManager()
    wm1 = mgr.get_or_create("agent-a")
    wm2 = mgr.get_or_create("agent-a")
    assert wm1 is wm2  # Same instance


def test_world_model_manager_snapshot():
    mgr = WorldModelManager()
    mgr.get_or_create("agent-a")
    mgr.get_or_create("agent-b")
    snapshot = mgr.get_snapshot()
    assert len(snapshot) == 2
    assert all("agent_id" in s for s in snapshot)
