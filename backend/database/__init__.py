"""
COWORK.ARMY — Database Package
"""
from .repository import Database

_db: Database | None = None


async def setup_db() -> Database:
    """Initialize database connection and return repository instance."""
    global _db
    from .connection import async_session_factory, init_db
    await init_db()
    _db = Database(async_session_factory)
    return _db


def get_db() -> Database:
    """Get the database repository singleton."""
    if _db is None:
        raise RuntimeError("Database not initialized. Call setup_db() first.")
    return _db
