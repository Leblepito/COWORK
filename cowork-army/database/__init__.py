"""
COWORK.ARMY — Database Package (PostgreSQL + async SQLAlchemy)
"""
from .connection import engine, async_session_factory, init_db, set_event_loop
from .repository import Database

_db: Database | None = None


async def setup_db() -> Database:
    """Initialize database: create tables and return Database instance."""
    await init_db()
    global _db
    _db = Database(async_session_factory)
    return _db


def get_db() -> Database:
    """Get the database singleton. Must call setup_db() first."""
    assert _db is not None, "Database not initialized. Call setup_db() first."
    return _db
