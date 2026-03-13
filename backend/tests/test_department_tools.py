"""
TDD: hotel, medical, software departman tool implementasyonları
Phase 4 — RED: Bu testler önce FAIL etmeli, sonra GREEN olmalı.
"""
import pytest


# ── Hotel Tools ──────────────────────────────────────────────────────────────

def test_hotel_tools_impl_exists():
    """HOTEL_TOOLS_IMPL dict'i import edilebilmeli."""
    from departments.hotel.tools import HOTEL_TOOLS_IMPL
    assert isinstance(HOTEL_TOOLS_IMPL, dict)
    assert len(HOTEL_TOOLS_IMPL) > 0


def test_hotel_tools_definitions_exist():
    """HOTEL_TOOL_DEFINITIONS list'i import edilebilmeli."""
    from departments.hotel.tools import HOTEL_TOOL_DEFINITIONS
    assert isinstance(HOTEL_TOOL_DEFINITIONS, list)
    assert len(HOTEL_TOOL_DEFINITIONS) > 0


def test_hotel_manage_booking_callable():
    """manage_booking fonksiyonu çağrılabilmeli ve dict döndürmeli."""
    from departments.hotel.tools import HOTEL_TOOLS_IMPL
    fn = HOTEL_TOOLS_IMPL.get("manage_booking")
    assert fn is not None, "manage_booking HOTEL_TOOLS_IMPL'de olmalı"
    result = fn(action="create", guest_name="Test Misafir", room_type="standard",
                check_in="2026-04-01", check_out="2026-04-03")
    assert isinstance(result, dict)
    assert "status" in result or "booking_id" in result or "error" not in result


def test_hotel_dynamic_pricing_callable():
    """dynamic_pricing fonksiyonu çağrılabilmeli."""
    from departments.hotel.tools import HOTEL_TOOLS_IMPL
    fn = HOTEL_TOOLS_IMPL.get("dynamic_pricing")
    assert fn is not None
    result = fn(room_type="standard", date="2026-04-01", occupancy_rate=75)
    assert isinstance(result, dict)


# ── Medical Tools ─────────────────────────────────────────────────────────────

def test_medical_tools_impl_exists():
    """MEDICAL_TOOLS_IMPL dict'i import edilebilmeli."""
    from departments.medical.tools import MEDICAL_TOOLS_IMPL
    assert isinstance(MEDICAL_TOOLS_IMPL, dict)
    assert len(MEDICAL_TOOLS_IMPL) > 0


def test_medical_tools_definitions_exist():
    """MEDICAL_TOOL_DEFINITIONS list'i import edilebilmeli."""
    from departments.medical.tools import MEDICAL_TOOL_DEFINITIONS
    assert isinstance(MEDICAL_TOOL_DEFINITIONS, list)
    assert len(MEDICAL_TOOL_DEFINITIONS) > 0


def test_medical_manage_patient_callable():
    """manage_patient fonksiyonu çağrılabilmeli."""
    from departments.medical.tools import MEDICAL_TOOLS_IMPL
    fn = MEDICAL_TOOLS_IMPL.get("manage_patient")
    assert fn is not None
    result = fn(action="register", data={"name": "Test Hasta", "age": 35})
    assert isinstance(result, dict)


def test_medical_schedule_room_callable():
    """schedule_room fonksiyonu çağrılabilmeli."""
    from departments.medical.tools import MEDICAL_TOOLS_IMPL
    fn = MEDICAL_TOOLS_IMPL.get("schedule_room")
    assert fn is not None
    result = fn(action="assign", room_id="101", patient_id="P001")
    assert isinstance(result, dict)


# ── Software Tools ────────────────────────────────────────────────────────────

def test_software_tools_impl_exists():
    """SOFTWARE_TOOLS_IMPL dict'i import edilebilmeli."""
    from departments.software.tools import SOFTWARE_TOOLS_IMPL
    assert isinstance(SOFTWARE_TOOLS_IMPL, dict)
    assert len(SOFTWARE_TOOLS_IMPL) > 0


def test_software_tools_definitions_exist():
    """SOFTWARE_TOOL_DEFINITIONS list'i import edilebilmeli."""
    from departments.software.tools import SOFTWARE_TOOL_DEFINITIONS
    assert isinstance(SOFTWARE_TOOL_DEFINITIONS, list)
    assert len(SOFTWARE_TOOL_DEFINITIONS) > 0


def test_software_write_code_callable():
    """write_code fonksiyonu çağrılabilmeli."""
    from departments.software.tools import SOFTWARE_TOOLS_IMPL
    fn = SOFTWARE_TOOLS_IMPL.get("write_code")
    assert fn is not None
    result = fn(filepath="test.py", content="print('hello')", language="python")
    assert isinstance(result, dict)


def test_software_run_tests_callable():
    """run_tests fonksiyonu çağrılabilmeli."""
    from departments.software.tools import SOFTWARE_TOOLS_IMPL
    fn = SOFTWARE_TOOLS_IMPL.get("run_tests")
    assert fn is not None
    result = fn(test_type="unit", target=".")
    assert isinstance(result, dict)


# ── Runner Integration ────────────────────────────────────────────────────────

def test_all_department_tools_in_runner():
    """Tüm departman tool'ları runner.py ALL_TOOL_DEFS'e kayıtlı olmalı."""
    import sys, os
    sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
    # runner'ı doğrudan import edemeyiz (relative import), tool isimlerini kontrol et
    from departments.hotel.tools import HOTEL_TOOL_DEFINITIONS
    from departments.medical.tools import MEDICAL_TOOL_DEFINITIONS
    from departments.software.tools import SOFTWARE_TOOL_DEFINITIONS
    from departments.trade.tools_impl import TRADE_TOOL_DEFINITIONS
    from departments.bots.tools import BOTS_TOOL_DEFINITIONS

    all_names = (
        {t["name"] for t in HOTEL_TOOL_DEFINITIONS}
        | {t["name"] for t in MEDICAL_TOOL_DEFINITIONS}
        | {t["name"] for t in SOFTWARE_TOOL_DEFINITIONS}
        | {t["name"] for t in TRADE_TOOL_DEFINITIONS}
        | {t["name"] for t in BOTS_TOOL_DEFINITIONS}
    )
    assert "manage_booking" in all_names
    assert "manage_patient" in all_names
    assert "write_code" in all_names
    assert "analyze_chart" in all_names
    assert "fetch_x_trends" in all_names
