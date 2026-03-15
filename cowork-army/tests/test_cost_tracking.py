import pytest
from cost_tracking import calculate_cost, get_budget_status, PRICING


def test_pricing_has_known_models():
    assert "claude-sonnet-4-20250514" in PRICING
    assert "gemini-2.5-pro" in PRICING


def test_calculate_cost_anthropic():
    cost = calculate_cost("claude-sonnet-4-20250514", 1000, 500)
    assert cost > 0


def test_calculate_cost_unknown():
    assert calculate_cost("unknown", 1000, 500) == 0.0


def test_calculate_cost_zero():
    assert calculate_cost("claude-sonnet-4-20250514", 0, 0) == 0.0


# ── Budget status tests ──

def test_budget_status_normal():
    r = get_budget_status(3.0, 10.0)
    assert r["percent"] == 30.0
    assert not r["warning"]
    assert not r["exceeded"]


def test_budget_status_warning():
    r = get_budget_status(8.5, 10.0)
    assert r["warning"]
    assert not r["exceeded"]


def test_budget_status_exceeded():
    r = get_budget_status(12.0, 10.0)
    assert r["exceeded"]
    assert r["warning"]


def test_budget_disabled():
    r = get_budget_status(5.0, 0.0)
    assert not r["warning"]
    assert not r["exceeded"]
