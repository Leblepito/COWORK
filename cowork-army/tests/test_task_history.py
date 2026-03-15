import pytest
from unittest.mock import AsyncMock, MagicMock
from contextlib import asynccontextmanager


@pytest.fixture
def mock_session():
    session = AsyncMock()
    session.commit.return_value = None
    session.add = MagicMock()
    return session


@pytest.fixture
def db(mock_session):
    from database.repository import Database

    @asynccontextmanager
    async def fake_sf():
        yield mock_session

    return Database(fake_sf)


@pytest.mark.asyncio
async def test_record_llm_usage(db, mock_session):
    await db.record_llm_usage("agent", "anthropic", "model", 100, 50, 0.001)
    mock_session.add.assert_called_once()
    mock_session.commit.assert_called_once()


@pytest.mark.asyncio
async def test_record_task_transition(db, mock_session):
    await db.record_task_transition("t1", "pending", "working", "agent")
    mock_session.add.assert_called_once()
    mock_session.commit.assert_called_once()
