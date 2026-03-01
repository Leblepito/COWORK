"""
COWORK.ARMY v7.0 — Configuration
Pydantic Settings for environment variable management.
"""
import os
from pathlib import Path

# Paths
BACKEND_DIR = Path(__file__).parent
PROJECT_ROOT = BACKEND_DIR.parent
WORKSPACE = BACKEND_DIR / "workspace"

# Database
DATABASE_URL = os.environ.get(
    "DATABASE_URL",
    "postgresql+asyncpg://cowork:cowork@localhost:5433/cowork_army",
)
# Railway uses postgres:// but asyncpg needs postgresql+asyncpg://
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql+asyncpg://", 1)
elif DATABASE_URL.startswith("postgresql://") and "+asyncpg" not in DATABASE_URL:
    DATABASE_URL = DATABASE_URL.replace("postgresql://", "postgresql+asyncpg://", 1)

# Anthropic
ANTHROPIC_API_KEY = os.environ.get("ANTHROPIC_API_KEY", "")
CLAUDE_MODEL = os.environ.get("CLAUDE_MODEL", "claude-sonnet-4-20250514")

# Server
PORT = int(os.environ.get("PORT", 8888))
COWORK_ROOT = os.environ.get("COWORK_ROOT", str(PROJECT_ROOT))

# Agent settings
AGENT_MAX_TOKENS = 4096
AUTONOMOUS_TICK_SECONDS = 30
AGENT_OUTPUT_MAX_LINES = 200
