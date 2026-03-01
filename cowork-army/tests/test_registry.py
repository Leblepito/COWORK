"""
Tests for registry.py — Base Agent Definitions (v7)
13 agents across 4 departments + cargo hub.
"""
import pytest

from registry import BASE_AGENTS


# ═══════════════════════════════════════════════════════════
#  BASE AGENT DEFINITIONS
# ═══════════════════════════════════════════════════════════

class TestBaseAgents:
    def test_exactly_13_base_agents(self):
        assert len(BASE_AGENTS) == 13

    def test_all_expected_ids_present(self):
        expected = {
            "cargo", "trade-master", "chart-eye", "risk-guard", "quant-brain",
            "clinic-director", "patient-care", "hotel-manager", "travel-planner",
            "concierge", "tech-lead", "full-stack", "data-ops",
        }
        actual = {a["id"] for a in BASE_AGENTS}
        assert actual == expected

    def test_all_agents_are_dicts(self):
        for agent in BASE_AGENTS:
            assert isinstance(agent, dict)

    @pytest.mark.parametrize("idx", range(13))
    def test_required_fields_populated(self, idx):
        agent = BASE_AGENTS[idx]
        assert len(agent["id"]) > 0
        assert len(agent["name"]) > 0
        assert len(agent["icon"]) > 0
        assert agent["tier"] in ("SUPERVISOR", "DIRECTOR", "WORKER")
        assert agent["color"].startswith("#")
        assert len(agent["domain"]) > 0
        assert len(agent["desc"]) > 0

    @pytest.mark.parametrize("idx", range(13))
    def test_system_prompt_not_empty(self, idx):
        agent = BASE_AGENTS[idx]
        assert len(agent["system_prompt"]) > 0

    def test_no_duplicate_agent_ids(self):
        ids = [a["id"] for a in BASE_AGENTS]
        assert len(ids) == len(set(ids))

    def test_tier_hierarchy(self):
        tiers = {a["tier"] for a in BASE_AGENTS}
        assert tiers == {"SUPERVISOR", "DIRECTOR", "WORKER"}

    def test_one_supervisor(self):
        supervisors = [a for a in BASE_AGENTS if a["tier"] == "SUPERVISOR"]
        assert len(supervisors) == 1
        assert supervisors[0]["id"] == "cargo"

    def test_four_directors(self):
        directors = [a for a in BASE_AGENTS if a["tier"] == "DIRECTOR"]
        assert len(directors) == 4
        director_ids = {d["id"] for d in directors}
        assert director_ids == {"trade-master", "clinic-director", "hotel-manager", "tech-lead"}

    def test_all_base_flags_true(self):
        for agent in BASE_AGENTS:
            assert agent["is_base"] == 1

    def test_workers_have_triggers(self):
        workers = [a for a in BASE_AGENTS if a["tier"] == "WORKER"]
        for w in workers:
            assert len(w["triggers"]) > 0, f"{w['id']} has no triggers"


# ═══════════════════════════════════════════════════════════
#  DEPARTMENTS
# ═══════════════════════════════════════════════════════════

class TestDepartments:
    def test_all_agents_have_department(self):
        for agent in BASE_AGENTS:
            assert "department" in agent
            assert agent["department"] in ("trade", "medical", "hotel", "software", "cargo")

    def test_trade_department_agents(self):
        trade = [a["id"] for a in BASE_AGENTS if a["department"] == "trade"]
        assert set(trade) == {"trade-master", "chart-eye", "risk-guard", "quant-brain"}

    def test_medical_department_agents(self):
        med = [a["id"] for a in BASE_AGENTS if a["department"] == "medical"]
        assert set(med) == {"clinic-director", "patient-care"}

    def test_hotel_department_agents(self):
        hotel = [a["id"] for a in BASE_AGENTS if a["department"] == "hotel"]
        assert set(hotel) == {"hotel-manager", "travel-planner", "concierge"}

    def test_software_department_agents(self):
        sw = [a["id"] for a in BASE_AGENTS if a["department"] == "software"]
        assert set(sw) == {"tech-lead", "full-stack", "data-ops"}

    def test_cargo_hub(self):
        cargo = [a for a in BASE_AGENTS if a["department"] == "cargo"]
        assert len(cargo) == 1
        assert cargo[0]["id"] == "cargo"
        assert cargo[0]["tier"] == "SUPERVISOR"


# ═══════════════════════════════════════════════════════════
#  WORKSPACE DIRS
# ═══════════════════════════════════════════════════════════

class TestWorkspaceDirs:
    def test_all_have_workspace_dir(self):
        for agent in BASE_AGENTS:
            assert "workspace_dir" in agent
            assert len(agent["workspace_dir"]) > 0

    def test_workspace_dir_matches_id(self):
        for agent in BASE_AGENTS:
            assert agent["workspace_dir"] == agent["id"]

    def test_no_duplicate_workspace_dirs(self):
        dirs = [a["workspace_dir"] for a in BASE_AGENTS]
        assert len(dirs) == len(set(dirs))


# ═══════════════════════════════════════════════════════════
#  JSON SERIALIZATION
# ═══════════════════════════════════════════════════════════

class TestSerialization:
    def test_dicts_are_json_serializable(self):
        import json
        serialized = json.dumps(BASE_AGENTS, ensure_ascii=False)
        assert len(serialized) > 0
        deserialized = json.loads(serialized)
        assert len(deserialized) == 13

    def test_skills_are_lists(self):
        for agent in BASE_AGENTS:
            assert isinstance(agent["skills"], list)

    def test_rules_are_lists(self):
        for agent in BASE_AGENTS:
            assert isinstance(agent["rules"], list)

    def test_triggers_are_lists(self):
        for agent in BASE_AGENTS:
            assert isinstance(agent["triggers"], list)
