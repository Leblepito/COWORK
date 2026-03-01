"""
Tests for database/repository.py — Async Database Repository (v7)
Mocked async session, CRUD operations, dict converters.
"""
import pytest
from unittest.mock import AsyncMock, MagicMock
from contextlib import asynccontextmanager
from datetime import datetime, timezone

from database.repository import Database


# ── Fixtures ─────────────────────────────────────────────

@pytest.fixture
def mock_session():
    """Create a mocked async session."""
    session = AsyncMock()
    session.commit.return_value = None
    session.add = MagicMock()
    return session


@pytest.fixture
def db(mock_session):
    """Create a Database instance with mocked session factory."""
    @asynccontextmanager
    async def fake_sf():
        yield mock_session

    return Database(fake_sf)


# ═══════════════════════════════════════════════════════════
#  AGENT CRUD
# ═══════════════════════════════════════════════════════════

class TestAgentCRUD:
    @pytest.mark.asyncio
    async def test_get_all_agents(self, db, mock_session):
        agent_mock = MagicMock()
        agent_mock.id = "cargo"
        agent_mock.name = "Cargo Hub"
        agent_mock.icon = "📦"
        agent_mock.tier = "SUPERVISOR"
        agent_mock.color = "#f59e0b"
        agent_mock.domain = "Delivery"
        agent_mock.description = "Cargo hub"
        agent_mock.skills = ["delivery"]
        agent_mock.rules = []
        agent_mock.triggers = ["cargo"]
        agent_mock.system_prompt = "You are cargo."
        agent_mock.workspace_dir = "cargo"
        agent_mock.is_base = True
        agent_mock.created_at = datetime.now(timezone.utc)

        result_mock = MagicMock()
        result_mock.scalars.return_value.all.return_value = [agent_mock]
        mock_session.execute.return_value = result_mock

        agents = await db.get_all_agents()
        assert len(agents) == 1
        assert agents[0]["id"] == "cargo"
        assert agents[0]["tier"] == "SUPERVISOR"

    @pytest.mark.asyncio
    async def test_get_agent_found(self, db, mock_session):
        agent_mock = MagicMock()
        agent_mock.id = "full-stack"
        agent_mock.name = "Full Stack Dev"
        agent_mock.icon = "⚡"
        agent_mock.tier = "WORKER"
        agent_mock.color = "#8b5cf6"
        agent_mock.domain = "Full-Stack"
        agent_mock.description = "Dev"
        agent_mock.skills = ["frontend", "backend"]
        agent_mock.rules = []
        agent_mock.triggers = ["react"]
        agent_mock.system_prompt = "You are dev."
        agent_mock.workspace_dir = "full-stack"
        agent_mock.is_base = True
        agent_mock.created_at = datetime.now(timezone.utc)

        result_mock = MagicMock()
        result_mock.scalar_one_or_none.return_value = agent_mock
        mock_session.execute.return_value = result_mock

        agent = await db.get_agent("full-stack")
        assert agent is not None
        assert agent["id"] == "full-stack"
        assert agent["skills"] == ["frontend", "backend"]

    @pytest.mark.asyncio
    async def test_get_agent_not_found(self, db, mock_session):
        result_mock = MagicMock()
        result_mock.scalar_one_or_none.return_value = None
        mock_session.execute.return_value = result_mock

        agent = await db.get_agent("nonexistent")
        assert agent is None

    @pytest.mark.asyncio
    async def test_upsert_agent(self, db, mock_session):
        await db.upsert_agent({
            "id": "test-agent", "name": "Test", "icon": "🤖",
            "tier": "WORKER", "color": "#fff", "domain": "Test",
            "desc": "Test agent",
        })
        mock_session.execute.assert_called_once()
        mock_session.commit.assert_called_once()

    @pytest.mark.asyncio
    async def test_delete_agent(self, db, mock_session):
        result_mock = MagicMock()
        result_mock.rowcount = 1
        mock_session.execute.return_value = result_mock

        ok = await db.delete_agent("dynamic-agent")
        assert ok is True
        mock_session.commit.assert_called_once()

    @pytest.mark.asyncio
    async def test_delete_agent_not_found(self, db, mock_session):
        result_mock = MagicMock()
        result_mock.rowcount = 0
        mock_session.execute.return_value = result_mock

        ok = await db.delete_agent("nonexistent")
        assert ok is False


# ═══════════════════════════════════════════════════════════
#  TASK CRUD
# ═══════════════════════════════════════════════════════════

class TestTaskCRUD:
    @pytest.mark.asyncio
    async def test_create_task(self, db, mock_session):
        task_mock = MagicMock()
        task_mock.id = "TASK-001"
        task_mock.title = "Build page"
        task_mock.description = "React component"
        task_mock.assigned_to = "full-stack"
        task_mock.priority = "high"
        task_mock.status = "pending"
        task_mock.created_by = "user"
        task_mock.created_at = datetime.now(timezone.utc)
        task_mock.updated_at = datetime.now(timezone.utc)
        task_mock.log = []

        # Mock get_task (called internally after create)
        result_mock = MagicMock()
        result_mock.scalar_one_or_none.return_value = task_mock
        mock_session.execute.return_value = result_mock

        task = await db.create_task("TASK-001", "Build page", "React component",
                                     "full-stack", "high", "user", "pending", [])
        assert task["id"] == "TASK-001"
        assert task["assigned_to"] == "full-stack"

    @pytest.mark.asyncio
    async def test_list_tasks(self, db, mock_session):
        t1 = MagicMock()
        t1.id = "TASK-1"
        t1.title = "Task 1"
        t1.description = ""
        t1.assigned_to = "cargo"
        t1.priority = "normal"
        t1.status = "pending"
        t1.created_by = "user"
        t1.created_at = datetime.now(timezone.utc)
        t1.updated_at = datetime.now(timezone.utc)
        t1.log = []

        result_mock = MagicMock()
        result_mock.scalars.return_value.all.return_value = [t1]
        mock_session.execute.return_value = result_mock

        tasks = await db.list_tasks()
        assert len(tasks) == 1
        assert tasks[0]["id"] == "TASK-1"

    @pytest.mark.asyncio
    async def test_update_task(self, db, mock_session):
        await db.update_task("TASK-1", status="done")
        mock_session.execute.assert_called_once()
        mock_session.commit.assert_called_once()


# ═══════════════════════════════════════════════════════════
#  EVENT CRUD
# ═══════════════════════════════════════════════════════════

class TestEventCRUD:
    @pytest.mark.asyncio
    async def test_add_event(self, db, mock_session):
        await db.add_event("cargo", "Test event", "info")
        mock_session.add.assert_called_once()
        mock_session.commit.assert_called_once()

    @pytest.mark.asyncio
    async def test_get_events(self, db, mock_session):
        evt = MagicMock()
        evt.timestamp = datetime.now(timezone.utc)
        evt.agent_id = "cargo"
        evt.message = "Test event"
        evt.type = "info"

        result_mock = MagicMock()
        result_mock.scalars.return_value.all.return_value = [evt]
        mock_session.execute.return_value = result_mock

        events = await db.get_events()
        assert len(events) == 1
        assert events[0]["agent_id"] == "cargo"

    @pytest.mark.asyncio
    async def test_get_event_count(self, db, mock_session):
        result_mock = MagicMock()
        result_mock.scalar.return_value = 42
        mock_session.execute.return_value = result_mock

        count = await db.get_event_count()
        assert count == 42

    @pytest.mark.asyncio
    async def test_get_event_count_zero(self, db, mock_session):
        result_mock = MagicMock()
        result_mock.scalar.return_value = None
        mock_session.execute.return_value = result_mock

        count = await db.get_event_count()
        assert count == 0


# ═══════════════════════════════════════════════════════════
#  SEED BASE AGENTS
# ═══════════════════════════════════════════════════════════

class TestSeed:
    @pytest.mark.asyncio
    async def test_seed_calls_upsert(self, db, mock_session):
        agents = [
            {"id": "cargo", "name": "Cargo", "is_base": 1},
            {"id": "trade-master", "name": "Trade Master", "is_base": 1},
        ]
        await db.seed_base_agents(agents)
        # Should call execute + commit for each agent (upsert)
        assert mock_session.execute.call_count == 2
        assert mock_session.commit.call_count == 2


# ═══════════════════════════════════════════════════════════
#  DICT CONVERTERS
# ═══════════════════════════════════════════════════════════

class TestConverters:
    def test_agent_to_dict(self):
        agent = MagicMock()
        agent.id = "test"
        agent.name = "Test"
        agent.icon = "🤖"
        agent.tier = "WORKER"
        agent.color = "#fff"
        agent.domain = "Testing"
        agent.description = "A test agent"
        agent.skills = ["python"]
        agent.rules = ["rule1"]
        agent.triggers = ["test"]
        agent.system_prompt = "You are test."
        agent.workspace_dir = "test"
        agent.is_base = False
        agent.created_at = datetime(2024, 1, 1, tzinfo=timezone.utc)

        d = Database._agent_to_dict(agent)
        assert d["id"] == "test"
        assert d["desc"] == "A test agent"
        assert d["skills"] == ["python"]
        assert d["is_base"] is False

    def test_agent_to_dict_none_skills(self):
        agent = MagicMock()
        agent.id = "empty"
        agent.name = "Empty"
        agent.icon = ""
        agent.tier = "WORKER"
        agent.color = ""
        agent.domain = ""
        agent.description = ""
        agent.skills = None
        agent.rules = None
        agent.triggers = None
        agent.system_prompt = ""
        agent.workspace_dir = ""
        agent.is_base = False
        agent.created_at = None

        d = Database._agent_to_dict(agent)
        assert d["skills"] == []
        assert d["rules"] == []
        assert d["triggers"] == []

    def test_task_to_dict(self):
        task = MagicMock()
        task.id = "TASK-1"
        task.title = "Test"
        task.description = "Desc"
        task.assigned_to = "cargo"
        task.priority = "high"
        task.status = "pending"
        task.created_by = "user"
        task.created_at = datetime(2024, 1, 1, tzinfo=timezone.utc)
        task.updated_at = datetime(2024, 1, 2, tzinfo=timezone.utc)
        task.log = ["Step 1"]

        d = Database._task_to_dict(task)
        assert d["id"] == "TASK-1"
        assert d["log"] == ["Step 1"]

    def test_event_to_dict(self):
        event = MagicMock()
        event.timestamp = datetime(2024, 1, 1, tzinfo=timezone.utc)
        event.agent_id = "cargo"
        event.message = "Test"
        event.type = "info"

        d = Database._event_to_dict(event)
        assert d["agent_id"] == "cargo"
        assert d["type"] == "info"
