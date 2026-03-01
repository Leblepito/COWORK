"""
Tests for server.py — API Endpoints (v7)
FastAPI TestClient with mocked database and dependencies.
"""
import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from contextlib import asynccontextmanager


@pytest.fixture
def mock_db():
    db = AsyncMock()
    db.get_all_agents.return_value = []
    db.seed_base_agents.return_value = None
    db.list_tasks.return_value = []
    db.get_events.return_value = []
    db.get_event_count.return_value = 0

    # Mock the session factory for lifespan stale agent cleanup
    session = AsyncMock()
    result = MagicMock()
    result.all.return_value = []
    session.execute.return_value = result
    session.commit.return_value = None

    @asynccontextmanager
    async def fake_sf():
        yield session

    db._sf = fake_sf
    return db


@pytest.fixture
def mock_auto():
    auto = MagicMock()
    auto.running = False
    auto.tick_count = 0
    auto.start = AsyncMock()
    auto.stop = AsyncMock()
    auto.status = AsyncMock(return_value={
        "running": False, "tick_count": 0,
        "total_events": 0, "agents_tracked": 0, "last_tick": None,
    })
    return auto


@pytest.fixture
def app_client(mock_db, mock_auto):
    """Create a TestClient with all server dependencies mocked."""
    with patch("server.setup_db", new_callable=AsyncMock, return_value=mock_db), \
         patch("server.get_db", return_value=mock_db), \
         patch("server.set_event_loop"), \
         patch("server.autonomous", mock_auto), \
         patch("server.spawn_agent", new_callable=AsyncMock,
               return_value={"status": "thinking", "agent_id": "test", "lines": [], "alive": True, "pid": 0, "started_at": ""}), \
         patch("server.kill_agent", return_value={"status": "killed", "agent_id": "test"}), \
         patch("server.get_statuses", new_callable=AsyncMock, return_value={}), \
         patch("server.get_output", return_value=[]), \
         patch("server.delegate_task", new_callable=AsyncMock,
               return_value={"id": "TASK-MOCK01", "title": "test", "assigned_to": "commander", "status": "pending"}), \
         patch("server.create_dynamic_agent", new_callable=AsyncMock,
               return_value={"status": "created", "agent_id": "new-agent", "workspace": "/tmp/ws"}):
        from server import app
        from fastapi.testclient import TestClient
        with TestClient(app) as c:
            yield c, mock_db, mock_auto


# ═══════════════════════════════════════════════════════════
#  HEALTH & INFO
# ═══════════════════════════════════════════════════════════

class TestHealth:
    def test_returns_ok(self, app_client):
        c, _, _ = app_client
        r = c.get("/health")
        assert r.status_code == 200
        assert r.json()["status"] == "ok"
        assert r.json()["version"] == "7.0"


class TestInfo:
    def test_returns_server_info(self, app_client):
        c, mock_db, _ = app_client
        mock_db.get_all_agents.return_value = [{"id": "a"}, {"id": "b"}]
        r = c.get("/api/info")
        assert r.status_code == 200
        data = r.json()
        assert data["name"] == "COWORK.ARMY"
        assert data["version"] == "7.0"
        assert data["agents"] == 2


# ═══════════════════════════════════════════════════════════
#  AGENT CRUD
# ═══════════════════════════════════════════════════════════

class TestAgentEndpoints:
    def test_get_agents(self, app_client):
        c, mock_db, _ = app_client
        mock_db.get_all_agents.return_value = [
            {"id": "cargo", "name": "Cargo Hub"},
            {"id": "trade-master", "name": "Trade Master"},
        ]
        r = c.get("/api/agents")
        assert r.status_code == 200
        assert len(r.json()) == 2

    def test_get_agent_detail(self, app_client):
        c, mock_db, _ = app_client
        mock_db.get_agent.return_value = {"id": "full-stack", "name": "Full Stack Dev"}
        r = c.get("/api/agents/full-stack")
        assert r.status_code == 200
        assert r.json()["id"] == "full-stack"

    def test_get_agent_not_found(self, app_client):
        c, mock_db, _ = app_client
        mock_db.get_agent.return_value = None
        r = c.get("/api/agents/nonexistent")
        assert r.status_code == 404

    def test_create_agent(self, app_client):
        c, _, _ = app_client
        r = c.post("/api/agents", data={
            "agent_id": "test-agent", "name": "Test Agent",
            "icon": "🤖", "domain": "Testing",
        })
        assert r.status_code == 200
        assert r.json()["status"] == "created"

    def test_update_agent(self, app_client):
        c, mock_db, _ = app_client
        mock_db.get_agent.side_effect = [
            {"id": "full-stack", "name": "Old Name"},
            {"id": "full-stack", "name": "New Name"},
        ]
        mock_db.upsert_agent.return_value = None
        r = c.put("/api/agents/full-stack", data={"name": "New Name"})
        assert r.status_code == 200

    def test_update_agent_not_found(self, app_client):
        c, mock_db, _ = app_client
        mock_db.get_agent.return_value = None
        r = c.put("/api/agents/nonexistent", data={"name": "X"})
        assert r.status_code == 404

    def test_delete_agent(self, app_client):
        c, mock_db, _ = app_client
        mock_db.delete_agent.return_value = True
        r = c.delete("/api/agents/test-agent")
        assert r.status_code == 200
        assert r.json()["deleted"] is True
        assert r.json()["agent_id"] == "test-agent"


# ═══════════════════════════════════════════════════════════
#  AGENT LIFECYCLE
# ═══════════════════════════════════════════════════════════

class TestLifecycle:
    def test_spawn_agent(self, app_client):
        c, _, _ = app_client
        r = c.post("/api/agents/full-stack/spawn?task=build+frontend")
        assert r.status_code == 200
        assert r.json()["status"] == "thinking"

    def test_spawn_agent_no_task(self, app_client):
        c, _, _ = app_client
        r = c.post("/api/agents/full-stack/spawn")
        assert r.status_code == 200

    def test_kill_agent(self, app_client):
        c, _, _ = app_client
        r = c.post("/api/agents/full-stack/kill")
        assert r.status_code == 200
        assert r.json()["status"] == "killed"

    def test_get_output(self, app_client):
        c, _, _ = app_client
        r = c.get("/api/agents/full-stack/output")
        assert r.status_code == 200
        assert "lines" in r.json()

    def test_get_statuses(self, app_client):
        c, _, _ = app_client
        r = c.get("/api/statuses")
        assert r.status_code == 200


# ═══════════════════════════════════════════════════════════
#  TASKS
# ═══════════════════════════════════════════════════════════

class TestTasks:
    def test_get_tasks(self, app_client):
        c, mock_db, _ = app_client
        mock_db.list_tasks.return_value = [{"id": "TASK-1", "title": "Test"}]
        r = c.get("/api/tasks")
        assert r.status_code == 200
        assert len(r.json()) == 1

    def test_create_task_with_assignment(self, app_client):
        c, mock_db, _ = app_client
        mock_db.create_task.return_value = {
            "id": "TASK-NEW", "title": "Build frontend", "assigned_to": "full-stack",
            "status": "pending",
        }
        r = c.post("/api/tasks", data={
            "title": "Build frontend", "assigned_to": "full-stack",
        })
        assert r.status_code == 200
        mock_db.create_task.assert_called_once()

    def test_create_task_auto_delegate(self, app_client):
        c, _, _ = app_client
        r = c.post("/api/tasks", data={"title": "Auto routed task"})
        assert r.status_code == 200
        assert r.json()["id"] == "TASK-MOCK01"

    def test_update_task(self, app_client):
        c, mock_db, _ = app_client
        mock_db.get_task.side_effect = [
            {"id": "TASK-1", "status": "pending", "log": []},
            {"id": "TASK-1", "status": "done", "log": ["Done!"]},
        ]
        mock_db.update_task.return_value = None
        r = c.put("/api/tasks/TASK-1", data={"status": "done", "log_message": "Done!"})
        assert r.status_code == 200

    def test_update_task_not_found(self, app_client):
        c, mock_db, _ = app_client
        mock_db.get_task.return_value = None
        r = c.put("/api/tasks/NONEXIST", data={"status": "done"})
        assert r.status_code == 404


# ═══════════════════════════════════════════════════════════
#  COMMANDER ENDPOINT
# ═══════════════════════════════════════════════════════════

class TestCommanderEndpoint:
    def test_delegate(self, app_client):
        c, _, _ = app_client
        r = c.post("/api/commander/delegate", data={
            "title": "Test task", "description": "Test desc", "priority": "high",
        })
        assert r.status_code == 200
        assert "id" in r.json()


# ═══════════════════════════════════════════════════════════
#  AUTONOMOUS
# ═══════════════════════════════════════════════════════════

class TestAutonomous:
    def test_start(self, app_client):
        c, _, _ = app_client
        r = c.post("/api/autonomous/start")
        assert r.status_code == 200
        assert r.json()["status"] == "started"

    def test_stop(self, app_client):
        c, _, _ = app_client
        r = c.post("/api/autonomous/stop")
        assert r.status_code == 200
        assert r.json()["status"] == "stopped"

    def test_status(self, app_client):
        c, _, mock_auto = app_client
        r = c.get("/api/autonomous/status")
        assert r.status_code == 200
        assert "running" in r.json()

    def test_events(self, app_client):
        c, mock_db, _ = app_client
        mock_db.get_events.return_value = [
            {"message": "tick event", "agent_id": "cargo", "type": "info"}
        ]
        r = c.get("/api/autonomous/events?limit=10")
        assert r.status_code == 200
        assert len(r.json()) == 1


# ═══════════════════════════════════════════════════════════
#  SETTINGS
# ═══════════════════════════════════════════════════════════

class TestSettings:
    def test_api_key_status_with_env(self, app_client):
        c, _, _ = app_client
        with patch("server._read_env_file", return_value={}), \
             patch.dict("os.environ", {"ANTHROPIC_API_KEY": "sk-ant-test-key-12345"}, clear=False):
            r = c.get("/api/settings/api-key-status")
            assert r.status_code == 200
            data = r.json()
            assert data["set"] is True
            assert "sk-ant-test-" in data["preview"]

    def test_api_key_status_gemini(self, app_client):
        c, _, _ = app_client
        with patch("server._read_env_file", return_value={}), \
             patch.dict("os.environ", {"LLM_PROVIDER": "gemini", "GEMINI_API_KEY": "gk-test-key-12345"}):
            r = c.get("/api/settings/api-key-status")
            assert r.status_code == 200
            data = r.json()
            assert data["active_provider"] == "gemini"
            assert data["gemini"]["set"] is True

    def test_set_api_key(self, app_client):
        c, _, _ = app_client
        with patch("server._write_env_file"):
            r = c.post("/api/settings/api-key", data={"key": "sk-test-key", "provider": "anthropic"})
            assert r.status_code == 200
            assert r.json()["status"] == "saved"

    def test_get_llm_provider(self, app_client):
        c, _, _ = app_client
        with patch.dict("os.environ", {"LLM_PROVIDER": "gemini"}):
            r = c.get("/api/settings/llm-provider")
            assert r.status_code == 200
            assert r.json()["provider"] == "gemini"

    def test_set_llm_provider(self, app_client):
        c, _, _ = app_client
        with patch("server._write_env_file"):
            r = c.post("/api/settings/llm-provider", data={"provider": "gemini"})
            assert r.status_code == 200
            assert r.json()["provider"] == "gemini"

    def test_set_invalid_provider(self, app_client):
        c, _, _ = app_client
        r = c.post("/api/settings/llm-provider", data={"provider": "invalid"})
        assert r.status_code == 400


# ═══════════════════════════════════════════════════════════
#  WORKSPACE
# ═══════════════════════════════════════════════════════════

class TestWorkspace:
    def test_workspace_agent_not_found(self, app_client):
        c, mock_db, _ = app_client
        mock_db.get_agent.return_value = None
        r = c.get("/api/workspace/nonexistent")
        assert r.status_code == 404

    def test_workspace_returns_files(self, app_client, tmp_path):
        c, mock_db, _ = app_client
        mock_db.get_agent.return_value = {"id": "test", "workspace_dir": "test"}
        ws = tmp_path / "test"
        ws.mkdir()
        (ws / "file.txt").write_text("content")
        with patch("server.WORKSPACE", tmp_path):
            r = c.get("/api/workspace/test")
        assert r.status_code == 200
        assert r.json()["agent_id"] == "test"

    def test_workspace_file_not_found(self, app_client):
        c, mock_db, _ = app_client
        mock_db.get_agent.return_value = None
        r = c.get("/api/workspace/nonexistent/file?path=test.txt")
        assert r.status_code == 404
