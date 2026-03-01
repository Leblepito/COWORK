"""
Tests for server.py — API Endpoints (HIGH)
Full integration tests using FastAPI TestClient via httpx.
"""
import json
import os
from contextlib import asynccontextmanager
from unittest.mock import patch

import pytest
from httpx import ASGITransport, AsyncClient

from database import Database
from registry import get_base_agents_as_dicts
from runner import AgentRunner
from autonomous import AutonomousLoop
from commander import CommanderRouter


@pytest.fixture
async def client(tmp_path):
    """Create async client with properly initialized server globals."""
    db_path = str(tmp_path / "test.db")
    cowork_root = str(tmp_path)

    # Initialize database
    test_db = Database(db_path)
    test_db.initialize()
    test_db.seed_base_agents(get_base_agents_as_dicts())

    # Initialize components
    test_commander = CommanderRouter(test_db)

    def event_cb(agent_id, message, etype):
        pass

    test_runner = AgentRunner(
        cowork_root=cowork_root,
        anthropic_api_key="",
        event_callback=event_cb,
        db=test_db,
    )
    test_auto_loop = AutonomousLoop(runner=test_runner, db=test_db)

    # Patch server module globals
    import server as srv
    original_db = srv.db
    original_runner = srv.runner
    original_commander = srv.commander_router
    original_auto_loop = srv.auto_loop
    original_root = srv.COWORK_ROOT
    original_api_key = srv.API_KEY

    srv.db = test_db
    srv.runner = test_runner
    srv.commander_router = test_commander
    srv.auto_loop = test_auto_loop
    srv.COWORK_ROOT = cowork_root
    srv.API_KEY = ""

    transport = ASGITransport(app=srv.app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac

    # Restore
    test_auto_loop.stop()
    srv.db = original_db
    srv.runner = original_runner
    srv.commander_router = original_commander
    srv.auto_loop = original_auto_loop
    srv.COWORK_ROOT = original_root
    srv.API_KEY = original_api_key


# ═══════════════════════════════════════════════════════════
#  HEALTH & INFO
# ═══════════════════════════════════════════════════════════

class TestHealthInfo:
    @pytest.mark.asyncio
    async def test_health(self, client):
        resp = await client.get("/health")
        assert resp.status_code == 200
        assert resp.json()["status"] == "ok"

    @pytest.mark.asyncio
    async def test_info(self, client):
        resp = await client.get("/api/info")
        assert resp.status_code == 200
        data = resp.json()
        assert data["name"] == "COWORK.ARMY"
        assert data["version"] == "5.0.0"
        assert data["agents"] == 12


# ═══════════════════════════════════════════════════════════
#  AGENT ROUTES
# ═══════════════════════════════════════════════════════════

class TestAgentRoutes:
    @pytest.mark.asyncio
    async def test_list_agents(self, client):
        resp = await client.get("/api/agents")
        assert resp.status_code == 200
        agents = resp.json()
        assert isinstance(agents, list)
        assert len(agents) == 12

    @pytest.mark.asyncio
    async def test_get_agent(self, client):
        resp = await client.get("/api/agents/commander")
        assert resp.status_code == 200
        agent = resp.json()
        assert agent["id"] == "commander"
        assert agent["tier"] == "COMMANDER"

    @pytest.mark.asyncio
    async def test_get_agent_not_found(self, client):
        resp = await client.get("/api/agents/nonexistent")
        assert resp.status_code == 404

    @pytest.mark.asyncio
    async def test_create_agent(self, client):
        resp = await client.post("/api/agents", data={
            "name": "New Dynamic Agent",
            "icon": "🤖",
            "tier": "WORKER",
            "color": "#ff0000",
            "domain": "Testing",
            "desc": "A test agent",
            "skills": json.dumps(["test_skill"]),
            "rules": json.dumps(["test_rule"]),
            "workspace_dir": ".",
            "triggers": json.dumps(["test"]),
            "system_prompt": "You are a test agent.",
        })
        assert resp.status_code == 200
        agent = resp.json()
        assert agent["name"] == "New Dynamic Agent"
        assert agent["is_base"] is False

    @pytest.mark.asyncio
    async def test_create_agent_with_custom_id(self, client):
        resp = await client.post("/api/agents", data={
            "id": "custom-id",
            "name": "Custom ID Agent",
        })
        assert resp.status_code == 200
        assert resp.json()["id"] == "custom-id"

    @pytest.mark.asyncio
    async def test_update_agent(self, client):
        resp = await client.put("/api/agents/commander", data={
            "name": "Updated Commander",
        })
        assert resp.status_code == 200
        assert resp.json()["name"] == "Updated Commander"

    @pytest.mark.asyncio
    async def test_update_nonexistent_agent(self, client):
        resp = await client.put("/api/agents/nonexistent", data={
            "name": "Ghost",
        })
        assert resp.status_code == 404

    @pytest.mark.asyncio
    async def test_delete_dynamic_agent(self, client):
        await client.post("/api/agents", data={
            "id": "deleteme",
            "name": "Delete Me",
        })
        resp = await client.delete("/api/agents/deleteme")
        assert resp.status_code == 200
        assert resp.json()["status"] == "deleted"

    @pytest.mark.asyncio
    async def test_delete_base_agent_forbidden(self, client):
        resp = await client.delete("/api/agents/commander")
        assert resp.status_code == 403

    @pytest.mark.asyncio
    async def test_delete_nonexistent_agent(self, client):
        resp = await client.delete("/api/agents/nonexistent")
        assert resp.status_code == 404


# ═══════════════════════════════════════════════════════════
#  AGENT LIFECYCLE ROUTES
# ═══════════════════════════════════════════════════════════

class TestAgentLifecycleRoutes:
    @pytest.mark.asyncio
    async def test_spawn_agent(self, client):
        resp = await client.post("/api/agents/web-dev/spawn?task=test+task")
        assert resp.status_code == 200

    @pytest.mark.asyncio
    async def test_spawn_nonexistent_agent(self, client):
        resp = await client.post("/api/agents/nonexistent/spawn")
        assert resp.status_code == 404

    @pytest.mark.asyncio
    async def test_kill_agent(self, client):
        resp = await client.post("/api/agents/web-dev/kill")
        assert resp.status_code == 200

    @pytest.mark.asyncio
    async def test_kill_nonexistent(self, client):
        resp = await client.post("/api/agents/nonexistent/kill")
        assert resp.status_code == 404

    @pytest.mark.asyncio
    async def test_get_statuses(self, client):
        resp = await client.get("/api/statuses")
        assert resp.status_code == 200
        statuses = resp.json()
        assert isinstance(statuses, dict)
        assert "commander" in statuses

    @pytest.mark.asyncio
    async def test_get_output(self, client):
        resp = await client.get("/api/agents/web-dev/output")
        assert resp.status_code == 200
        assert "lines" in resp.json()

    @pytest.mark.asyncio
    async def test_get_output_nonexistent(self, client):
        resp = await client.get("/api/agents/nonexistent/output")
        assert resp.status_code == 404


# ═══════════════════════════════════════════════════════════
#  TASK ROUTES
# ═══════════════════════════════════════════════════════════

class TestTaskRoutes:
    @pytest.mark.asyncio
    async def test_create_task(self, client):
        resp = await client.post("/api/tasks", data={
            "title": "Test Task",
            "description": "Do something",
            "assigned_to": "web-dev",
            "priority": "high",
        })
        assert resp.status_code == 200
        task = resp.json()
        assert task["title"] == "Test Task"
        assert task["status"] == "pending"

    @pytest.mark.asyncio
    async def test_list_tasks(self, client):
        resp = await client.get("/api/tasks")
        assert resp.status_code == 200
        assert isinstance(resp.json(), list)

    @pytest.mark.asyncio
    async def test_get_task_not_found(self, client):
        resp = await client.get("/api/tasks/nonexistent")
        assert resp.status_code == 404

    @pytest.mark.asyncio
    async def test_update_task_status(self, client):
        create_resp = await client.post("/api/tasks", data={
            "title": "Status Test",
            "assigned_to": "web-dev",
        })
        task_id = create_resp.json()["id"]
        resp = await client.put(f"/api/tasks/{task_id}", data={
            "status": "in_progress",
            "log_message": "Started",
        })
        assert resp.status_code == 200
        assert resp.json()["status"] == "in_progress"

    @pytest.mark.asyncio
    async def test_update_task_invalid_status(self, client):
        create_resp = await client.post("/api/tasks", data={
            "title": "Invalid Status",
            "assigned_to": "web-dev",
        })
        task_id = create_resp.json()["id"]
        resp = await client.put(f"/api/tasks/{task_id}", data={
            "status": "invalid_status",
        })
        assert resp.status_code == 400


# ═══════════════════════════════════════════════════════════
#  AUTONOMOUS ROUTES
# ═══════════════════════════════════════════════════════════

class TestAutonomousRoutes:
    @pytest.mark.asyncio
    async def test_autonomous_status(self, client):
        resp = await client.get("/api/autonomous/status")
        assert resp.status_code == 200
        status = resp.json()
        assert "running" in status
        assert "tick_count" in status

    @pytest.mark.asyncio
    async def test_autonomous_start_stop(self, client):
        resp = await client.post("/api/autonomous/start")
        assert resp.status_code == 200
        assert resp.json()["status"] == "started"

        resp = await client.post("/api/autonomous/stop")
        assert resp.status_code == 200
        assert resp.json()["status"] == "stopped"

    @pytest.mark.asyncio
    async def test_autonomous_events(self, client):
        resp = await client.get("/api/autonomous/events?limit=10")
        assert resp.status_code == 200
        assert isinstance(resp.json(), list)


# ═══════════════════════════════════════════════════════════
#  COMMANDER DELEGATION
# ═══════════════════════════════════════════════════════════

class TestCommanderDelegation:
    @pytest.mark.asyncio
    async def test_delegate_medical_task(self, client):
        resp = await client.post("/api/commander/delegate", data={
            "title": "Hasta randevusu oluştur",
            "description": "Rhinoplasty ameliyatı için klinik eşleştirme",
            "priority": "high",
            "auto_spawn": "false",
        })
        assert resp.status_code == 200
        data = resp.json()
        assert data["routed_to"] == "med-health"

    @pytest.mark.asyncio
    async def test_delegate_trading_task(self, client):
        resp = await client.post("/api/commander/delegate", data={
            "title": "BTC trading sinyal analizi",
            "description": "Bitcoin teknik analiz yapılmalı",
            "priority": "normal",
            "auto_spawn": "false",
        })
        assert resp.status_code == 200
        data = resp.json()
        assert data["routed_to"] in ("trade-engine", "tech-analyst")

    @pytest.mark.asyncio
    async def test_delegate_creates_task(self, client):
        resp = await client.post("/api/commander/delegate", data={
            "title": "Frontend bug fix",
            "description": "React component crash",
            "auto_spawn": "false",
        })
        data = resp.json()
        assert "task" in data
        assert data["task"]["title"] == "Frontend bug fix"


# ═══════════════════════════════════════════════════════════
#  SETTINGS
# ═══════════════════════════════════════════════════════════

class TestSettings:
    @pytest.mark.asyncio
    async def test_api_key_status(self, client):
        resp = await client.get("/api/settings/api-key-status")
        assert resp.status_code == 200
        data = resp.json()
        assert "has_key" in data
