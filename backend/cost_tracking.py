"""LLM cost tracking and pricing for COWORK.ARMY."""

import os

PRICING: dict[str, dict[str, float]] = {
    "claude-sonnet-4-20250514": {"input": 3.0, "output": 15.0},
    "claude-haiku-4-5-20251001": {"input": 0.80, "output": 4.0},
    "gemini-2.5-pro": {"input": 1.25, "output": 10.0},
    "gemini-2.5-flash": {"input": 0.15, "output": 0.60},
}


def calculate_cost(model: str, input_tokens: int, output_tokens: int) -> float:
    if model not in PRICING:
        return 0.0
    rates = PRICING[model]
    return round(
        (input_tokens / 1_000_000) * rates["input"]
        + (output_tokens / 1_000_000) * rates["output"],
        6,
    )


def get_budget_status(daily_spend: float, limit: float | None = None) -> dict:
    """Return budget status dict with warning/exceeded flags."""
    if limit is None:
        limit = float(os.environ.get("LLM_BUDGET_LIMIT_USD", "10.0"))
    if limit <= 0:
        return {"total": daily_spend, "limit": 0, "percent": 0, "warning": False, "exceeded": False}
    percent = round((daily_spend / limit) * 100, 1)
    return {
        "total": round(daily_spend, 6),
        "limit": limit,
        "percent": percent,
        "warning": percent >= 80,
        "exceeded": percent >= 100,
    }
