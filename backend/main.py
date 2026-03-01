"""
COWORK.ARMY v7.0 — Main Server
Unified FastAPI application with 4 departments, 13 agents, Cargo orchestrator.
"""
import asyncio
import logging
from contextlib import asynccontextmanager
from pathlib import Path

import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .config import PORT, WORKSPACE
from .database import setup_db
from .database.connection import set_event_loop
from .departments import DEPARTMENTS, ALL_AGENTS

# Configure logging
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(name)s] %(message)s")
logger = logging.getLogger("cowork")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup: init DB, seed departments and agents, create workspaces."""
    logger.info("COWORK.ARMY v7.0 starting up...")

    # Store event loop for thread-safe DB access
    set_event_loop(asyncio.get_running_loop())

    # Initialize database
    db = await setup_db()
    logger.info("Database initialized")

    # Seed departments
    await db.seed_departments(DEPARTMENTS)
    logger.info(f"Seeded {len(DEPARTMENTS)} departments")

    # Seed agents
    await db.seed_agents(ALL_AGENTS)
    logger.info(f"Seeded {len(ALL_AGENTS)} agents")

    # Create workspace directories
    for agent in ALL_AGENTS:
        ws = WORKSPACE / agent["workspace_dir"]
        ws.mkdir(parents=True, exist_ok=True)
        (ws / "inbox").mkdir(exist_ok=True)
        (ws / "output").mkdir(exist_ok=True)
    logger.info(f"Workspace directories ready at {WORKSPACE}")

    yield

    logger.info("COWORK.ARMY shutting down...")


# Create FastAPI app
app = FastAPI(
    title="COWORK.ARMY",
    version="7.0",
    description="AI Agent Army — 4 Departments, 13 Agents, Cargo Orchestrator",
    lifespan=lifespan,
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register API routers
from .api.departments import router as dept_router
from .api.agents import router as agent_router
from .api.tasks import router as task_router
from .api.cargo import router as cargo_router
from .api.autonomous import router as auto_router
from .api.settings import router as settings_router
from .api.websocket import router as ws_router

app.include_router(dept_router)
app.include_router(agent_router)
app.include_router(task_router)
app.include_router(cargo_router)
app.include_router(auto_router)
app.include_router(settings_router)
app.include_router(ws_router)


if __name__ == "__main__":
    import sys
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
    print("=" * 50)
    print("  COWORK.ARMY v7.0 — Command Center")
    print(f"  http://localhost:{PORT}")
    print(f"  4 Departments | {len(ALL_AGENTS)} Agents")
    print("=" * 50)
    uvicorn.run(
        "backend.main:app",
        host="0.0.0.0",
        port=PORT,
        reload=False,
    )
