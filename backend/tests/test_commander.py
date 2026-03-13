"""Tests for the Commander and DynamicAgentService."""
import os
import sys
import json
from unittest.mock import MagicMock, patch, AsyncMock

import pytest

# conftest.py adds COWORK root to sys.path


def test_detect_department_trade():
    """Should detect trade department from trade keywords."""
    from backend.services.dynamic_agent_service import _detect_department
    assert _detect_department("Build an algo trading bot for Binance") == "trade"


def test_detect_department_software():
    """Should detect software department from software keywords."""
    from backend.services.dynamic_agent_service import _detect_department
    assert _detect_department("Develop a FastAPI backend with React frontend") == "software"


def test_detect_department_medical():
    """Should detect medical department from medical keywords."""
    from backend.services.dynamic_agent_service import _detect_department
    assert _detect_department("Create a health tourism patient coordination system") == "medical"


def test_detect_department_hotel():
    """Should detect hotel department from hotel keywords."""
    from backend.services.dynamic_agent_service import _detect_department
    assert _detect_department("Build a hotel reservation management platform") == "hotel"


def test_detect_department_bots():
    """Should detect bots department from bot keywords."""
    from backend.services.dynamic_agent_service import _detect_department
    assert _detect_department("Automate social media posts on Twitter and X") == "bots"


def test_detect_department_defaults_to_software():
    """Should default to software for unrecognized tasks."""
    from backend.services.dynamic_agent_service import _detect_department
    assert _detect_department("Do something random with no keywords") == "software"


def test_generate_agent_id_format():
    """Generated agent ID should be URL-safe."""
    from backend.services.dynamic_agent_service import _generate_agent_id
    agent_id = _generate_agent_id("Health Tourism Manager")
    assert " " not in agent_id
    assert agent_id.islower() or "-" in agent_id
    assert len(agent_id) > 5


def test_is_complex_project_true():
    """Long description with project keywords should be complex."""
    from backend.services.dynamic_agent_service import DynamicAgentService

    with patch("backend.services.dynamic_agent_service.get_llm_provider"):
        service = DynamicAgentService()

    result = service.is_complex_project(
        "Sağlık Turizmi Platformu",
        "Sağlık turizmi için tam kapsamlı bir platform geliştir. Hasta koordinasyonu, randevu yönetimi ve çok dilli destek içermeli."
    )
    assert result is True


def test_is_complex_project_false():
    """Short simple task should not be complex."""
    from backend.services.dynamic_agent_service import DynamicAgentService

    with patch("backend.services.dynamic_agent_service.get_llm_provider"):
        service = DynamicAgentService()

    result = service.is_complex_project("Rapor yaz", "Günlük durum raporu.")
    assert result is False


@pytest.mark.asyncio
async def test_create_manager_returns_valid_agent_def():
    """create_manager_for_project should return a valid agent definition."""
    from backend.services.dynamic_agent_service import DynamicAgentService
    from backend.agents.llm_providers import TextBlock, LLMResponse

    mock_json = json.dumps({
        "name": "Trade Bot Director",
        "department_id": "trade",
        "domain": "Algorithmic Trading Management",
        "desc": "Manages trading bot projects. Oversees Elliott Wave and SMC analysis.",
        "skills": ["elliott-wave-analysis", "smc-smart-money-concepts", "ccxt-binance-integration"],
        "rules": ["Never trade without risk management", "Always verify with multi-timeframe analysis"],
        "system_prompt": "You are Trade Bot Director, overseeing algorithmic trading projects at COWORK.ARMY.",
    })

    mock_response = LLMResponse(
        stop_reason="end_turn",
        content=[TextBlock(text=mock_json)],
    )

    with patch("backend.services.dynamic_agent_service.get_llm_provider") as mock_provider:
        mock_llm = MagicMock()
        mock_llm.get_response.return_value = mock_response
        mock_provider.return_value = mock_llm

        service = DynamicAgentService()
        result = await service.create_manager_for_project("Build an algorithmic trading bot for Binance using Elliott Wave and SMC")

    assert "error" not in result
    assert result["name"] == "Trade Bot Director"
    assert result["department_id"] == "trade"
    assert "id" in result
    assert result["tier"] == "DIRECTOR"
    assert "elliott-wave-analysis" in result["skills"]


@pytest.mark.asyncio
async def test_create_manager_handles_invalid_json():
    """create_manager_for_project should return error on invalid JSON."""
    from backend.services.dynamic_agent_service import DynamicAgentService
    from backend.agents.llm_providers import TextBlock, LLMResponse

    mock_response = LLMResponse(
        stop_reason="end_turn",
        content=[TextBlock(text="This is not valid JSON at all!")],
    )

    with patch("backend.services.dynamic_agent_service.get_llm_provider") as mock_provider:
        mock_llm = MagicMock()
        mock_llm.get_response.return_value = mock_response
        mock_provider.return_value = mock_llm

        service = DynamicAgentService()
        result = await service.create_manager_for_project("Some project")

    assert "error" in result
