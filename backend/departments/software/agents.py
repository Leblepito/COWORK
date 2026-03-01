"""
COWORK.ARMY v7.0 — Software Department Agents
fullstack, app-builder, prompt-engineer
"""
from ...agents.runner import spawn_agent, kill_agent, get_output
from .tools import SOFTWARE_TOOLS
from .prompts import SOFTWARE_PROMPTS


SOFTWARE_AGENT_IDS = ["fullstack", "app-builder", "prompt-engineer"]


async def run_fullstack(task: str) -> dict:
    """Frontend/Backend/Database gelistirme agenti."""
    return await spawn_agent("fullstack", task)


async def run_app_builder(task: str) -> dict:
    """Mobil + PC uygulama gelistirme agenti."""
    return await spawn_agent("app-builder", task)


async def run_prompt_engineer(task: str) -> dict:
    """Agent egitimi, skill.md olusturma agenti."""
    return await spawn_agent("prompt-engineer", task)


def get_software_tools() -> list[dict]:
    return SOFTWARE_TOOLS


def get_software_prompts() -> dict[str, str]:
    return SOFTWARE_PROMPTS
