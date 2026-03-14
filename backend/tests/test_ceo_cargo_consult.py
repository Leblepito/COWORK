import pytest
from unittest.mock import AsyncMock, patch, MagicMock
from backend.cargo.consult import _ceo_decide, _convert_to_agent_format, consult_and_route

# --- Unit tests for CEO decision logic ---

def test_ceo_decide_low_confidence_defaults_to_software():
    analysis = {
        "target_department_id": "trade",
        "target_agent_id": "indicator",
        "confidence": 20,
        "reasoning": "Weak match",
    }
    result = _ceo_decide("some random text", "", "", analysis)
    assert result["target_department_id"] == "software"
    assert result["target_agent_id"] == "fullstack"
    assert result["ceo_approved"] is True

def test_ceo_decide_high_confidence_keeps_original():
    analysis = {
        "target_department_id": "trade",
        "target_agent_id": "indicator",
        "confidence": 85,
        "reasoning": "Strong match",
    }
    result = _ceo_decide("BTC analiz sinyal grafik", "", "", analysis)
    assert result["target_department_id"] == "trade"
    assert result["ceo_approved"] is True

def test_convert_to_agent_format_trade():
    result = _convert_to_agent_format("BTC verisi", "data.csv", "trade", "indicator")
    assert "[MARKET DATA]" in result
    assert "Elliott Wave" in result

def test_convert_to_agent_format_medical():
    result = _convert_to_agent_format("Hasta bilgileri", "report.pdf", "medical", "clinic")
    assert "[MEDIKAL DOSYA]" in result

def test_convert_to_agent_format_software_code():
    result = _convert_to_agent_format("def foo(): pass", "main.py", "software", "fullstack")
    assert "[KOD GÖREVİ]" in result
    assert "```py" in result

# --- Integration test for consult_and_route ---

@pytest.mark.asyncio
@patch("backend.cargo.consult.get_db")
async def test_consult_and_route_trade_task(mock_get_db):
    mock_db = AsyncMock()
    mock_db.add_event = AsyncMock()
    mock_db.create_task = AsyncMock(return_value={"id": "task-1"})
    mock_get_db.return_value = mock_db

    result = await consult_and_route(
        title="BTC Elliott Wave Analizi",
        description="BTC için sinyal üret ve grafik analiz yap",
        content="",
        filename="btc_data.csv",
    )
    assert result["success"] is True
    assert result["target_department_id"] == "trade"
    assert result["ceo_approved"] is True
    assert result["cargo_converted"] is True
    mock_db.add_event.assert_called()
