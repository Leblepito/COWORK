"""
TDD: Departman bazında tool filtreleme ve cargo upload testleri.
runner.py'yi doğrudan import edemeyiz (relative import), bu yüzden
mantığı bağımsız olarak test ediyoruz.
"""
import json
import sys
import os
import pytest

# Departman tool'larını doğrudan import et
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
from departments.trade.tools_impl import TRADE_TOOL_DEFINITIONS
from departments.bots.tools import BOTS_TOOL_DEFINITIONS
from departments.hotel.tools import HOTEL_TOOL_DEFINITIONS
from departments.medical.tools import MEDICAL_TOOL_DEFINITIONS
from departments.software.tools import SOFTWARE_TOOL_DEFINITIONS

BASE_TOOLS = [
    {"name": "read_file", "description": "Dosya oku", "parameters": {}, "required": []},
    {"name": "write_file", "description": "Dosya yaz", "parameters": {}, "required": []},
    {"name": "list_dir", "description": "Dizin listele", "parameters": {}, "required": []},
    {"name": "search_files", "description": "Dosya ara", "parameters": {}, "required": []},
    {"name": "run_command", "description": "Komut çalıştır", "parameters": {}, "required": []},
]

DEPT_TOOL_DEFS = {
    "trade": TRADE_TOOL_DEFINITIONS,
    "bots": BOTS_TOOL_DEFINITIONS,
    "hotel": HOTEL_TOOL_DEFINITIONS,
    "medical": MEDICAL_TOOL_DEFINITIONS,
    "software": SOFTWARE_TOOL_DEFINITIONS,
}


def get_tools_for_dept(dept_id: str) -> list:
    """Replica of runner.get_tools_for_dept for testing."""
    return BASE_TOOLS + DEPT_TOOL_DEFS.get(dept_id, [])


def test_get_tools_for_dept_trade():
    tools = get_tools_for_dept("trade")
    names = [t["name"] for t in tools]
    assert "analyze_chart" in names
    assert "get_funding_rate" in names
    assert "read_file" in names
    assert "manage_booking" not in names
    assert "manage_patient" not in names
    assert "write_code" not in names


def test_get_tools_for_dept_hotel():
    tools = get_tools_for_dept("hotel")
    names = [t["name"] for t in tools]
    assert "manage_booking" in names
    assert "dynamic_pricing" in names
    assert "search_flights" in names
    assert "read_file" in names
    assert "analyze_chart" not in names
    assert "manage_patient" not in names


def test_get_tools_for_dept_medical():
    tools = get_tools_for_dept("medical")
    names = [t["name"] for t in tools]
    assert "manage_patient" in names
    assert "schedule_room" in names
    assert "read_file" in names
    assert "analyze_chart" not in names
    assert "manage_booking" not in names


def test_get_tools_for_dept_software():
    tools = get_tools_for_dept("software")
    names = [t["name"] for t in tools]
    assert "write_code" in names
    assert "design_api" in names
    assert "run_tests" in names
    assert "read_file" in names
    assert "manage_booking" not in names


def test_get_tools_for_dept_bots():
    tools = get_tools_for_dept("bots")
    names = [t["name"] for t in tools]
    assert "fetch_x_trends" in names
    assert "generate_social_content" in names
    assert "read_file" in names
    assert "analyze_chart" not in names


def test_get_tools_for_dept_unknown_returns_base_only():
    tools = get_tools_for_dept("unknown_dept")
    names = [t["name"] for t in tools]
    assert "read_file" in names
    assert "write_file" in names
    assert "analyze_chart" not in names
    assert "manage_booking" not in names


def test_token_count_per_dept_under_limit():
    """Her departman için tool token sayısı 3000'in altında olmalı."""
    for dept in ["trade", "hotel", "medical", "software", "bots"]:
        tools = get_tools_for_dept(dept)
        token_est = len(json.dumps(tools)) // 4
        assert token_est < 3000, f"{dept} için tool token sayısı çok yüksek: ~{token_est}"


def test_cargo_analyzer_hotel_keywords():
    """Cargo analyzer hotel içeriğini hotel departmanına yönlendirmeli."""
    from cargo.analyzer import analyze_content
    result = analyze_content(
        filename="rezervasyon.pdf",
        content="otel rezervasyon check_in check_out misafir",
        description="Hotel booking request",
    )
    assert result["target_department_id"] == "hotel"
    assert result["confidence"] > 20
    assert "target_agent_id" in result


def test_cargo_analyzer_trade_keywords():
    """Cargo analyzer trade içeriğini trade departmanına yönlendirmeli."""
    from cargo.analyzer import analyze_content
    result = analyze_content(
        content="BTC ETH SOL crypto trade signal buy sell",
        description="Kripto sinyal analizi",
    )
    assert result["target_department_id"] == "trade"


def test_cargo_analyzer_returns_confidence():
    """Cargo analyzer her zaman confidence döndürmeli."""
    from cargo.analyzer import analyze_content
    result = analyze_content(content="random text xyz")
    assert "confidence" in result
    assert isinstance(result["confidence"], int)
    assert 0 <= result["confidence"] <= 100
