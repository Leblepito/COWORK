"""
COWORK.ARMY — Async Database Connection (PostgreSQL + SQLAlchemy 2.0)
"""
import os
import asyncio
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession

DATABASE_URL = os.environ.get(
    "DATABASE_URL",
    "postgresql+asyncpg://cowork:cowork@localhost:5433/cowork_army",
)

engine = create_async_engine(DATABASE_URL, pool_size=10, echo=False)
async_session_factory = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

_main_loop: asyncio.AbstractEventLoop | None = None


def set_event_loop(loop: asyncio.AbstractEventLoop):
    """Store the main event loop for sync thread access."""
    global _main_loop
    _main_loop = loop


def get_event_loop() -> asyncio.AbstractEventLoop:
    """Get the stored main event loop."""
    assert _main_loop is not None, "Event loop not set. Call set_event_loop() first."
    return _main_loop


async def init_db():
    """Create all tables from ORM models."""
    from .models import Base
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
