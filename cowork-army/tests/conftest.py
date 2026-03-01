"""Shared fixtures for COWORK.ARMY tests."""
import os
import tempfile

import pytest

from database import Database


@pytest.fixture
def tmp_workspace(tmp_path):
    """Create a temporary workspace directory with sample files."""
    ws = tmp_path / "workspace"
    ws.mkdir()
    (ws / "hello.txt").write_text("Hello World", encoding="utf-8")
    (ws / "subdir").mkdir()
    (ws / "subdir" / "nested.py").write_text("print('nested')\n", encoding="utf-8")
    return str(ws)


@pytest.fixture
def db(tmp_path):
    """Create a fresh in-memory-like temp database."""
    db_path = str(tmp_path / "test.db")
    database = Database(db_path)
    database.initialize()
    return database


@pytest.fixture
def seeded_db(db):
    """Database pre-seeded with base agents."""
    from registry import get_base_agents_as_dicts
    db.seed_base_agents(get_base_agents_as_dicts())
    return db
