"""
Tests for database.py — Data Integrity (HIGH)
CRUD operations, thread safety, JSON roundtrip, event pruning.
"""
import json
import threading

import pytest

from database import Database


# ═══════════════════════════════════════════════════════════
#  AGENT CRUD
# ═══════════════════════════════════════════════════════════

class TestAgentCRUD:
    """Test agent create, read, update, delete operations."""

    def test_create_agent_with_auto_id(self, db):
        agent = db.create_agent({"name": "Test Agent"})
        assert agent["id"].startswith("agent-")
        assert agent["name"] == "Test Agent"
        assert agent["is_base"] is False

    def test_create_agent_with_explicit_id(self, db):
        agent = db.create_agent({"id": "my-agent", "name": "Custom"})
        assert agent["id"] == "my-agent"

    def test_get_agent_exists(self, db):
        created = db.create_agent({"id": "test-1", "name": "Test"})
        fetched = db.get_agent("test-1")
        assert fetched is not None
        assert fetched["name"] == "Test"

    def test_get_agent_not_found(self, db):
        assert db.get_agent("nonexistent") is None

    def test_get_all_agents_empty(self, db):
        agents = db.get_all_agents()
        assert agents == []

    def test_get_all_agents_returns_list(self, db):
        db.create_agent({"id": "a1", "name": "Agent 1"})
        db.create_agent({"id": "a2", "name": "Agent 2"})
        agents = db.get_all_agents()
        assert len(agents) == 2

    def test_update_agent(self, db):
        db.create_agent({"id": "u1", "name": "Before"})
        updated = db.update_agent("u1", {"name": "After"})
        assert updated["name"] == "After"

    def test_update_agent_partial_fields(self, db):
        db.create_agent({"id": "p1", "name": "Original", "desc": "Original desc"})
        updated = db.update_agent("p1", {"name": "Changed"})
        assert updated["name"] == "Changed"
        # desc should remain unchanged
        assert updated["desc"] == "Original desc"

    def test_update_nonexistent_agent(self, db):
        result = db.update_agent("nonexistent", {"name": "Test"})
        assert result is None

    def test_update_agent_skills_array(self, db):
        db.create_agent({"id": "s1", "name": "Skilled"})
        updated = db.update_agent("s1", {"skills": ["python", "react", "sql"]})
        assert updated["skills"] == ["python", "react", "sql"]

    def test_delete_dynamic_agent(self, db):
        db.create_agent({"id": "d1", "name": "Deletable"})
        assert db.delete_agent("d1") is True
        assert db.get_agent("d1") is None

    def test_delete_nonexistent_agent(self, db):
        assert db.delete_agent("nonexistent") is False

    def test_delete_base_agent_blocked(self, seeded_db):
        result = seeded_db.delete_agent("commander")
        assert result is False
        assert seeded_db.get_agent("commander") is not None


# ═══════════════════════════════════════════════════════════
#  BASE AGENT SEEDING
# ═══════════════════════════════════════════════════════════

class TestBaseAgentSeeding:
    """Test seed_base_agents operation."""

    def test_seed_creates_all_12_agents(self, seeded_db):
        agents = seeded_db.get_all_agents()
        base_agents = [a for a in agents if a["is_base"]]
        assert len(base_agents) == 12

    def test_seed_idempotent(self, seeded_db):
        from registry import get_base_agents_as_dicts
        # Seed again — should not duplicate
        seeded_db.seed_base_agents(get_base_agents_as_dicts())
        agents = seeded_db.get_all_agents()
        base_agents = [a for a in agents if a["is_base"]]
        assert len(base_agents) == 12

    def test_seed_updates_existing(self, seeded_db):
        from registry import get_base_agents_as_dicts
        dicts = get_base_agents_as_dicts()
        dicts[0]["name"] = "Updated Commander"
        seeded_db.seed_base_agents(dicts)
        agent = seeded_db.get_agent(dicts[0]["id"])
        assert agent["name"] == "Updated Commander"

    def test_base_agents_have_required_fields(self, seeded_db):
        for agent in seeded_db.get_all_agents():
            assert agent["id"]
            assert agent["name"]
            assert agent["tier"] in ("COMMANDER", "SUPERVISOR", "DIRECTOR", "WORKER")
            assert agent["is_base"] is True


# ═══════════════════════════════════════════════════════════
#  JSON SERIALIZATION ROUNDTRIP
# ═══════════════════════════════════════════════════════════

class TestJSONRoundtrip:
    """Verify JSON arrays survive store → retrieve."""

    def test_skills_roundtrip(self, db):
        skills = ["python", "react", "türkçe"]
        agent = db.create_agent({"id": "json-1", "name": "JSON Test", "skills": skills})
        fetched = db.get_agent("json-1")
        assert fetched["skills"] == skills

    def test_rules_roundtrip(self, db):
        rules = ["Rule 1", "Rule with 'quotes'", "Türkçe kural çğışöü"]
        agent = db.create_agent({"id": "json-2", "name": "Rules", "rules": rules})
        fetched = db.get_agent("json-2")
        assert fetched["rules"] == rules

    def test_triggers_roundtrip(self, db):
        triggers = ["keyword1", "anahtar kelime", "çok", "özel"]
        agent = db.create_agent({"id": "json-3", "name": "Triggers", "triggers": triggers})
        fetched = db.get_agent("json-3")
        assert fetched["triggers"] == triggers

    def test_empty_arrays(self, db):
        agent = db.create_agent({"id": "json-4", "name": "Empty"})
        fetched = db.get_agent("json-4")
        assert fetched["skills"] == []
        assert fetched["rules"] == []
        assert fetched["triggers"] == []


# ═══════════════════════════════════════════════════════════
#  TASK CRUD
# ═══════════════════════════════════════════════════════════

class TestTaskCRUD:
    """Test task create, read, update operations."""

    def test_create_task(self, db):
        task = db.create_task("Test Task", "Description", "agent-1", "high")
        assert task["title"] == "Test Task"
        assert task["status"] == "pending"
        assert task["priority"] == "high"
        assert task["assigned_to"] == "agent-1"

    def test_create_task_auto_id(self, db):
        task = db.create_task("Auto ID")
        assert task["id"].startswith("task-")

    def test_list_tasks(self, db):
        db.create_task("Task 1")
        db.create_task("Task 2")
        db.create_task("Task 3")
        tasks = db.list_tasks()
        assert len(tasks) == 3

    def test_get_task(self, db):
        created = db.create_task("Find Me")
        fetched = db.get_task(created["id"])
        assert fetched is not None
        assert fetched["title"] == "Find Me"

    def test_get_task_not_found(self, db):
        assert db.get_task("nonexistent") is None

    def test_update_task_status(self, db):
        task = db.create_task("Status Test")
        db.update_task_status(task["id"], "in_progress", "Started working")
        updated = db.get_task(task["id"])
        assert updated["status"] == "in_progress"

    def test_task_log_accumulates(self, db):
        task = db.create_task("Log Test", assigned_to="agent-1")
        # Initial log has 1 entry
        assert len(task["log"]) == 1
        db.update_task_status(task["id"], "in_progress", "Step 1")
        db.update_task_status(task["id"], "done", "Step 2")
        updated = db.get_task(task["id"])
        assert len(updated["log"]) == 3

    def test_update_nonexistent_task(self, db):
        # Should not raise, just return
        db.update_task_status("nonexistent", "done")


# ═══════════════════════════════════════════════════════════
#  EVENT CRUD
# ═══════════════════════════════════════════════════════════

class TestEventCRUD:
    """Test event create, read, count, prune operations."""

    def test_add_event(self, db):
        db.add_event("agent-1", "Test message", "info")
        events = db.get_events()
        assert len(events) == 1
        assert events[0]["message"] == "Test message"
        assert events[0]["agent_id"] == "agent-1"

    def test_get_events_default_limit(self, db):
        for i in range(60):
            db.add_event("agent-1", f"Event {i}")
        events = db.get_events()
        assert len(events) == 50  # default limit

    def test_get_events_custom_limit(self, db):
        for i in range(10):
            db.add_event("agent-1", f"Event {i}")
        events = db.get_events(limit=5)
        assert len(events) == 5

    def test_get_events_since_filter(self, db):
        db.add_event("agent-1", "Old event")
        # Use an old timestamp to ensure new events are "after" it
        since = "2000-01-01T00:00:00Z"
        db.add_event("agent-1", "New event")
        events = db.get_events(since=since)
        # Both events are after the ancient timestamp
        assert len(events) == 2

    def test_event_count(self, db):
        assert db.get_event_count() == 0
        db.add_event("a1", "msg1")
        db.add_event("a1", "msg2")
        assert db.get_event_count() == 2

    def test_event_pruning_keeps_max_2000(self, db):
        # Add more than 2000 events
        for i in range(2010):
            db.add_event("agent-1", f"Event {i}")
        count = db.get_event_count()
        assert count <= 2000


# ═══════════════════════════════════════════════════════════
#  THREAD SAFETY
# ═══════════════════════════════════════════════════════════

class TestThreadSafety:
    """Test concurrent operations don't corrupt data."""

    def test_concurrent_agent_creates(self, db):
        errors = []

        def create_agent(i):
            try:
                db.create_agent({"id": f"thread-{i}", "name": f"Thread Agent {i}"})
            except Exception as e:
                errors.append(e)

        threads = [threading.Thread(target=create_agent, args=(i,)) for i in range(20)]
        for t in threads:
            t.start()
        for t in threads:
            t.join()

        assert len(errors) == 0
        agents = db.get_all_agents()
        assert len(agents) == 20

    def test_concurrent_event_writes(self, db):
        errors = []

        def add_events(batch):
            try:
                for i in range(10):
                    db.add_event(f"agent-{batch}", f"Event {batch}-{i}")
            except Exception as e:
                errors.append(e)

        threads = [threading.Thread(target=add_events, args=(i,)) for i in range(10)]
        for t in threads:
            t.start()
        for t in threads:
            t.join()

        assert len(errors) == 0
        assert db.get_event_count() == 100
