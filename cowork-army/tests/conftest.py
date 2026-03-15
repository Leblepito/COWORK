"""Shared fixtures for COWORK.ARMY v7 tests."""
import sys
import os
from pathlib import Path

_root = Path(__file__).parent.parent
if str(_root) not in sys.path:
    sys.path.insert(0, str(_root))

os.environ.setdefault("COWORK_JWT_SECRET", "test-secret-key")
os.environ.setdefault("DATABASE_URL", "postgresql+asyncpg://cowork:cowork@localhost:5433/cowork_army")

import pytest
from unittest.mock import AsyncMock, MagicMock
from contextlib import asynccontextmanager


@pytest.fixture
def mock_db():
    """Create a mocked async Database instance for tests."""
    db = AsyncMock()
    db.get_all_agents.return_value = []
    db.get_agent.return_value = None
    db.upsert_agent.return_value = None
    db.delete_agent.return_value = True
    db.seed_base_agents.return_value = None
    db.create_task.return_value = {}
    db.list_tasks.return_value = []
    db.get_task.return_value = None
    db.update_task.return_value = None
    db.add_event.return_value = None
    db.get_events.return_value = []
    db.get_event_count.return_value = 0

    # Mock the session factory used in server lifespan
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
