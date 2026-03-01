"""
COWORK.ARMY — Database Connection (async SQLAlchemy 2.0 + asyncpg)
"""
import asyncio
from sqlalchemy.ext.asyncio import (
    create_async_engine,
    async_sessionmaker,
    AsyncSession,
)
from ..config import DATABASE_URL
from .models import Base

engine = create_async_engine(DATABASE_URL, echo=False, pool_size=20, max_overflow=10)

async_session_factory = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

# Store the main event loop for sync thread access
_main_loop: asyncio.AbstractEventLoop | None = None


def set_event_loop(loop: asyncio.AbstractEventLoop):
    global _main_loop
    _main_loop = loop


def get_event_loop() -> asyncio.AbstractEventLoop:
    if _main_loop is None:
        raise RuntimeError("Event loop not set")
    return _main_loop


async def init_db():
    """Create tables if they don't exist."""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
