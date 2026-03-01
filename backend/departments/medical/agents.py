"""
COWORK.ARMY v7.0 — Medical Department Agents
clinic, health-tourism, manufacturing
"""
from ...agents.runner import spawn_agent, kill_agent, get_output
from .tools import MEDICAL_TOOLS
from .prompts import MEDICAL_PROMPTS


MEDICAL_AGENT_IDS = ["clinic", "health-tourism", "manufacturing"]


async def run_clinic(task: str) -> dict:
    """60 odali klinik/hastane yonetimi agenti."""
    return await spawn_agent("clinic", task)


async def run_health_tourism(task: str) -> dict:
    """Phuket→Turkiye saglik turizmi agenti."""
    return await spawn_agent("health-tourism", task)


async def run_manufacturing(task: str) -> dict:
    """Kaucuk eldiven & maske uretim tesvik agenti."""
    return await spawn_agent("manufacturing", task)


def get_medical_tools() -> list[dict]:
    return MEDICAL_TOOLS


def get_medical_prompts() -> dict[str, str]:
    return MEDICAL_PROMPTS
