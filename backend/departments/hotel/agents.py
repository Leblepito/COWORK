"""
COWORK.ARMY v7.0 — Hotel & Travel Department Agents
hotel, flight, rental
"""
from ...agents.runner import spawn_agent, kill_agent, get_output
from .tools import HOTEL_TOOLS
from .prompts import HOTEL_PROMPTS


HOTEL_AGENT_IDS = ["hotel", "flight", "rental"]


async def run_hotel(task: str) -> dict:
    """Otel oda satis ve rezervasyon yonetimi agenti."""
    return await spawn_agent("hotel", task)


async def run_flight(task: str) -> dict:
    """Ucak bileti arama ve satis agenti."""
    return await spawn_agent("flight", task)


async def run_rental(task: str) -> dict:
    """Phuket araba & motosiklet kiralama agenti."""
    return await spawn_agent("rental", task)


def get_hotel_tools() -> list[dict]:
    return HOTEL_TOOLS


def get_hotel_prompts() -> dict[str, str]:
    return HOTEL_PROMPTS
