"""
COWORK.ARMY v7.0 — Trade Department Agents
school-game, indicator, algo-bot
"""
from ...agents.runner import spawn_agent, kill_agent, get_output
from .tools import TRADE_TOOLS
from .prompts import TRADE_PROMPTS


TRADE_AGENT_IDS = ["school-game", "indicator", "algo-bot"]


async def run_school_game(task: str) -> dict:
    """Elliott Wave + SMC interaktif egitim oyunu agenti."""
    return await spawn_agent("school-game", task)


async def run_indicator(task: str) -> dict:
    """Elliott Wave, SMC, Funding Rate analiz ve sinyal agenti."""
    return await spawn_agent("indicator", task)


async def run_algo_bot(task: str) -> dict:
    """Algoritmik trade bot gelistirme agenti."""
    return await spawn_agent("algo-bot", task)


def get_trade_tools() -> list[dict]:
    """Trade departmani agentlarina sunulan ek araclar."""
    return TRADE_TOOLS


def get_trade_prompts() -> dict[str, str]:
    """Trade departmani agentlari icin system promptlari."""
    return TRADE_PROMPTS
