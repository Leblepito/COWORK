"""
Tests for registry.py — Base Agent Definitions
Validates all 12 base agents have correct structure.
"""
import json
import pytest

from registry import BASE_AGENTS


class TestBaseAgents:
    def test_exactly_12_base_agents(self):
        assert len(BASE_AGENTS) == 12

    def test_all_expected_ids_present(self):
        expected_ids = {
            "commander", "supervisor", "med-health", "travel-agent",
            "trade-engine", "alpha-scout", "tech-analyst", "risk-sentinel",
            "quant-lab", "growth-ops", "web-dev", "finance",
        }
        actual_ids = {a["id"] for a in BASE_AGENTS}
        assert actual_ids == expected_ids

    def test_all_agents_are_dicts(self):
        for agent in BASE_AGENTS:
            assert isinstance(agent, dict)

    @pytest.mark.parametrize("field", [
        "id", "name", "icon", "tier", "color", "domain", "desc",
        "skills", "rules", "triggers", "workspace_dir", "system_prompt", "is_base",
    ])
    def test_required_fields_exist(self, field):
        for agent in BASE_AGENTS:
            assert field in agent, f"Agent {agent.get('id', '?')} missing '{field}'"

    def test_valid_tiers(self):
        valid_tiers = {"COMMANDER", "SUPERVISOR", "DIRECTOR", "WORKER"}
        for agent in BASE_AGENTS:
            assert agent["tier"] in valid_tiers

    def test_colors_are_hex(self):
        for agent in BASE_AGENTS:
            assert agent["color"].startswith("#")

    def test_one_commander(self):
        assert len([a for a in BASE_AGENTS if a["tier"] == "COMMANDER"]) == 1

    def test_one_supervisor(self):
        assert len([a for a in BASE_AGENTS if a["tier"] == "SUPERVISOR"]) == 1

    def test_all_are_base(self):
        for agent in BASE_AGENTS:
            assert agent["is_base"] in (True, 1)

    def test_skills_are_lists(self):
        for agent in BASE_AGENTS:
            assert isinstance(agent["skills"], list)

    def test_system_prompts_not_empty(self):
        for agent in BASE_AGENTS:
            assert len(agent["system_prompt"]) > 0

    def test_no_duplicate_ids(self):
        ids = [a["id"] for a in BASE_AGENTS]
        assert len(ids) == len(set(ids))

    def test_json_serializable(self):
        serialized = json.dumps(BASE_AGENTS, ensure_ascii=False)
        deserialized = json.loads(serialized)
        assert len(deserialized) == 12
