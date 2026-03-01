"""
Tests for registry.py — Data Definitions (LOW)
Base agent definitions, conversions, data integrity.
"""
import pytest

from registry import (
    BASE_AGENTS,
    AgentDef,
    get_base_agents_as_dicts,
    agent_def_from_db_row,
    get_agent_dict,
)


# ═══════════════════════════════════════════════════════════
#  BASE AGENT DEFINITIONS
# ═══════════════════════════════════════════════════════════

class TestBaseAgents:
    def test_exactly_12_base_agents(self):
        assert len(BASE_AGENTS) == 12

    def test_all_expected_ids_present(self):
        expected = {
            "commander", "supervisor", "med-health", "travel-agent",
            "trade-engine", "alpha-scout", "tech-analyst", "risk-sentinel",
            "quant-lab", "growth-ops", "web-dev", "finance",
        }
        assert set(BASE_AGENTS.keys()) == expected

    def test_all_agents_are_agent_def(self):
        for agent in BASE_AGENTS.values():
            assert isinstance(agent, AgentDef)

    @pytest.mark.parametrize("agent_id", list(BASE_AGENTS.keys()))
    def test_required_fields_populated(self, agent_id):
        agent = BASE_AGENTS[agent_id]
        assert agent.id == agent_id
        assert len(agent.name) > 0
        assert len(agent.icon) > 0
        assert agent.tier in ("COMMANDER", "SUPERVISOR", "DIRECTOR", "WORKER")
        assert agent.color.startswith("#")
        assert len(agent.domain) > 0
        assert len(agent.desc) > 0

    @pytest.mark.parametrize("agent_id", list(BASE_AGENTS.keys()))
    def test_system_prompt_not_empty(self, agent_id):
        agent = BASE_AGENTS[agent_id]
        assert len(agent.system_prompt) > 0

    def test_commander_has_no_triggers(self):
        assert BASE_AGENTS["commander"].triggers == []

    def test_supervisor_has_no_triggers(self):
        assert BASE_AGENTS["supervisor"].triggers == []

    def test_workers_have_triggers(self):
        workers = [a for a in BASE_AGENTS.values() if a.tier == "WORKER"]
        for w in workers:
            assert len(w.triggers) > 0, f"{w.id} has no triggers"

    def test_no_duplicate_agent_ids(self):
        ids = [a.id for a in BASE_AGENTS.values()]
        assert len(ids) == len(set(ids))

    def test_tier_hierarchy(self):
        tiers = {a.tier for a in BASE_AGENTS.values()}
        assert tiers == {"COMMANDER", "SUPERVISOR", "DIRECTOR", "WORKER"}

    def test_one_commander(self):
        commanders = [a for a in BASE_AGENTS.values() if a.tier == "COMMANDER"]
        assert len(commanders) == 1

    def test_one_supervisor(self):
        supervisors = [a for a in BASE_AGENTS.values() if a.tier == "SUPERVISOR"]
        assert len(supervisors) == 1

    def test_all_base_flags_true(self):
        for agent in BASE_AGENTS.values():
            assert agent.is_base is True


# ═══════════════════════════════════════════════════════════
#  CONVERSION FUNCTIONS
# ═══════════════════════════════════════════════════════════

class TestConversions:
    def test_get_base_agents_as_dicts(self):
        dicts = get_base_agents_as_dicts()
        assert len(dicts) == 12
        for d in dicts:
            assert isinstance(d, dict)
            assert "id" in d
            assert "name" in d
            assert "skills" in d
            assert isinstance(d["skills"], list)

    def test_agent_def_from_db_row(self):
        row = {
            "id": "test",
            "name": "Test",
            "icon": "🤖",
            "tier": "WORKER",
            "color": "#fff",
            "domain": "Test",
            "desc": "Test agent",
            "skills": ["a", "b"],
            "rules": [],
            "workspace_dir": ".",
            "triggers": ["test"],
            "system_prompt": "prompt",
            "is_base": False,
        }
        agent_def = agent_def_from_db_row(row)
        assert isinstance(agent_def, AgentDef)
        assert agent_def.id == "test"
        assert agent_def.skills == ["a", "b"]

    def test_agent_def_from_db_row_missing_fields(self):
        row = {
            "id": "min",
            "name": "Minimal",
            "icon": "🤖",
            "tier": "WORKER",
            "color": "#fff",
            "domain": "Test",
            "desc": "Minimal",
        }
        agent_def = agent_def_from_db_row(row)
        assert agent_def.skills == []
        assert agent_def.workspace_dir == "."
        assert agent_def.is_base is False

    def test_get_agent_dict(self, tmp_path):
        agent = BASE_AGENTS["commander"]
        result = get_agent_dict(agent, str(tmp_path))
        assert result["id"] == "commander"
        assert "workspace_path" in result
        assert result["is_base"] is True
        assert isinstance(result["skills"], list)

    def test_dicts_are_json_serializable(self):
        import json
        dicts = get_base_agents_as_dicts()
        # Should not raise
        serialized = json.dumps(dicts, ensure_ascii=False)
        assert len(serialized) > 0
        # Roundtrip
        deserialized = json.loads(serialized)
        assert len(deserialized) == 12
