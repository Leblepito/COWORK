"""
Tests for commander.py — Task Routing & Dynamic Agent Creation
Async routing, dynamic agent creation, workspace setup.
"""
import pytest
from unittest.mock import AsyncMock, patch


@pytest.fixture
def mock_db():
    db = AsyncMock()
    db.create_task.return_value = {}
    db.add_event.return_value = None
    return db


@pytest.fixture
def patched_db(mock_db):
    with patch("commander.get_db", return_value=mock_db):
        yield mock_db


# ═══════════════════════════════════════════════════════════
#  ROUTE_TASK
# ═══════════════════════════════════════════════════════════

class TestRouteTask:
    @pytest.mark.asyncio
    async def test_matches_single_trigger(self, patched_db):
        from commander import route_task
        patched_db.get_all_agents.return_value = [
            {"id": "med-health", "triggers": ["hasta", "klinik", "sağlık"]},
            {"id": "web-dev", "triggers": ["frontend", "react", "css"]},
        ]
        result = await route_task("Hasta randevusu", "Klinik ayarla")
        assert result == "med-health"

    @pytest.mark.asyncio
    async def test_best_score_wins(self, patched_db):
        from commander import route_task
        patched_db.get_all_agents.return_value = [
            {"id": "agent-a", "triggers": ["test"]},
            {"id": "agent-b", "triggers": ["test", "demo", "check"]},
        ]
        result = await route_task("test demo check all", "")
        assert result == "agent-b"

    @pytest.mark.asyncio
    async def test_no_match_returns_empty(self, patched_db):
        from commander import route_task
        patched_db.get_all_agents.return_value = [
            {"id": "web-dev", "triggers": ["frontend", "react"]},
        ]
        result = await route_task("unrelated topic", "nothing matches here")
        assert result == ""

    @pytest.mark.asyncio
    async def test_empty_agents_list(self, patched_db):
        from commander import route_task
        patched_db.get_all_agents.return_value = []
        result = await route_task("any task", "any description")
        assert result == ""

    @pytest.mark.asyncio
    async def test_case_insensitive(self, patched_db):
        from commander import route_task
        patched_db.get_all_agents.return_value = [
            {"id": "trade-engine", "triggers": ["trading", "borsa"]},
        ]
        result = await route_task("TRADING Stratejisi", "BORSA Analiz")
        assert result == "trade-engine"

    @pytest.mark.asyncio
    async def test_agent_without_triggers(self, patched_db):
        from commander import route_task
        patched_db.get_all_agents.return_value = [
            {"id": "agent-no-triggers"},
        ]
        result = await route_task("any task", "")
        assert result == ""


# ═══════════════════════════════════════════════════════════
#  DELEGATE_TASK
# ═══════════════════════════════════════════════════════════

class TestDelegateTask:
    @pytest.mark.asyncio
    async def test_routed_creates_inbox_file(self, patched_db, tmp_path):
        from commander import delegate_task
        patched_db.get_all_agents.return_value = [
            {"id": "web-dev", "triggers": ["frontend", "react"]},
        ]
        task_data = {
            "id": "TASK-001", "title": "Build frontend",
            "assigned_to": "web-dev", "status": "pending",
        }
        patched_db.create_task.return_value = task_data

        with patch("commander.WORKSPACE", tmp_path):
            result = await delegate_task("Build frontend page", "React component", "high")

        assert result["assigned_to"] == "web-dev"
        patched_db.create_task.assert_called_once()
        patched_db.add_event.assert_called_once()

        inbox = tmp_path / "web-dev" / "inbox"
        assert inbox.exists()
        files = list(inbox.glob("TASK-*.json"))
        assert len(files) == 1

    @pytest.mark.asyncio
    async def test_unrouted_goes_to_commander(self, patched_db, tmp_path):
        from commander import delegate_task
        patched_db.get_all_agents.return_value = [
            {"id": "web-dev", "triggers": ["frontend"]},
        ]
        patched_db.create_task.return_value = {
            "id": "TASK-002", "title": "Unknown",
            "assigned_to": "commander", "status": "needs_new_agent",
        }

        with patch("commander.WORKSPACE", tmp_path):
            await delegate_task("Totally unrelated task", "No triggers", "normal")

        call_args = patched_db.create_task.call_args
        assert call_args[0][3] == "commander"

    @pytest.mark.asyncio
    async def test_event_logged(self, patched_db, tmp_path):
        from commander import delegate_task
        patched_db.get_all_agents.return_value = []
        patched_db.create_task.return_value = {
            "id": "TASK-003", "title": "Test",
            "assigned_to": "commander", "status": "needs_new_agent",
        }

        with patch("commander.WORKSPACE", tmp_path):
            await delegate_task("Test task", "Desc", "normal")

        patched_db.add_event.assert_called_once()
        event_msg = patched_db.add_event.call_args[0][1]
        assert "Görev atandı" in event_msg


# ═══════════════════════════════════════════════════════════
#  CREATE_DYNAMIC_AGENT
# ═══════════════════════════════════════════════════════════

class TestCreateDynamicAgent:
    @pytest.mark.asyncio
    async def test_creates_workspace_dirs(self, patched_db, tmp_path):
        from commander import create_dynamic_agent
        with patch("commander.WORKSPACE", tmp_path):
            result = await create_dynamic_agent(
                "test-agent", "Test Agent", "🤖", "Testing",
                "A test agent", ["skill1"], ["rule1"], ["trigger1"], "You are test."
            )

        assert result["status"] == "created"
        assert result["agent_id"] == "test-agent"

        ws = tmp_path / "test-agent"
        assert (ws / "inbox").exists()
        assert (ws / "output").exists()
        assert (ws / "README.md").exists()
        assert (ws / "gorevler.md").exists()

    @pytest.mark.asyncio
    async def test_readme_contains_info(self, patched_db, tmp_path):
        from commander import create_dynamic_agent
        with patch("commander.WORKSPACE", tmp_path):
            await create_dynamic_agent(
                "my-agent", "My Agent", "🎯", "Domain",
                "Description here", ["python", "ai"], ["be fast"], ["code"], "Sys prompt."
            )

        readme = (tmp_path / "my-agent" / "README.md").read_text(encoding="utf-8")
        assert "My Agent" in readme
        assert "python" in readme
        assert "be fast" in readme

    @pytest.mark.asyncio
    async def test_upserts_agent_to_db(self, patched_db, tmp_path):
        from commander import create_dynamic_agent
        with patch("commander.WORKSPACE", tmp_path):
            await create_dynamic_agent(
                "db-agent", "DB Agent", "💾", "Data", "Desc", [], [], [], ""
            )

        patched_db.upsert_agent.assert_called_once()
        agent_data = patched_db.upsert_agent.call_args[0][0]
        assert agent_data["id"] == "db-agent"
        assert agent_data["is_base"] == 0
        assert agent_data["tier"] == "WORKER"

    @pytest.mark.asyncio
    async def test_adds_creation_event(self, patched_db, tmp_path):
        from commander import create_dynamic_agent
        with patch("commander.WORKSPACE", tmp_path):
            await create_dynamic_agent(
                "ev-agent", "Event Agent", "📢", "Events", "Desc", [], [], [], ""
            )

        patched_db.add_event.assert_called_once()
        event_args = patched_db.add_event.call_args[0]
        assert event_args[0] == "ev-agent"
        assert "Yeni agent" in event_args[1]

    @pytest.mark.asyncio
    async def test_gorevler_file_content(self, patched_db, tmp_path):
        from commander import create_dynamic_agent
        with patch("commander.WORKSPACE", tmp_path):
            await create_dynamic_agent(
                "gorev-agent", "Gorev Agent", "📋", "Tasks", "Desc", [], [], [], ""
            )

        gorev = (tmp_path / "gorev-agent" / "gorevler.md").read_text(encoding="utf-8")
        assert "Görevler" in gorev
        assert "Aktif" in gorev
