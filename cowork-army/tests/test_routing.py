import pytest
from routing import SmartRouter


@pytest.fixture
def router():
    agents = [
        {"id": "trade-master", "skills": ["trading", "market analysis"], "description": "Trading orchestrator", "triggers": ["trade", "market"]},
        {"id": "tech-lead", "skills": ["coding", "software"], "description": "Software development lead", "triggers": ["code", "develop"]},
        {"id": "clinic-director", "skills": ["medical", "patient"], "description": "Medical clinic director", "triggers": ["medical", "health"]},
    ]
    r = SmartRouter()
    r.fit(agents)
    return r


def test_routes_trading(router):
    result = router.route("analyze market trends for stock")
    assert result is not None
    assert result["agent_id"] == "trade-master"


def test_routes_coding(router):
    result = router.route("fix the login page bug in React code")
    assert result is not None
    assert result["agent_id"] == "tech-lead"


def test_routes_medical(router):
    result = router.route("patient medical health check at clinic")
    assert result is not None
    assert result["agent_id"] == "clinic-director"


def test_empty_router():
    r = SmartRouter()
    assert r.route("anything") is None
