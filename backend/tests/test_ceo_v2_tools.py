import pytest
from unittest.mock import AsyncMock, patch
from backend.departments.ceo.tools_v2 import get_dept_deep_dive, brainstorm_improvements, prioritize_and_delegate

@pytest.mark.asyncio
async def test_get_dept_deep_dive_trade():
    db = AsyncMock()
    db.get_events.return_value = [{"summary": "BTC signal: LONG"}]
    result = await get_dept_deep_dive(db, "trade")
    assert "Trade Departmani -- Derinlemesine Analiz" in result
    assert "BTC signal: LONG" in result

@pytest.mark.asyncio
async def test_brainstorm_improvements():
    context = "Trade departmanı verileri: ..."
    result = await brainstorm_improvements("trade", context)
    assert isinstance(result, list)
    assert len(result) > 0
    assert "description" in result[0]

@pytest.mark.asyncio
@patch("backend.departments.ceo.tools_v2.cargo_delegate_task", new_callable=AsyncMock)
async def test_prioritize_and_delegate(mock_delegate):
    improvements = [
        {"description": "Test görevi 1", "department": "trade", "priority": "high"},
        {"description": "Test görevi 2", "department": "software", "priority": "medium"},
    ]
    result = await prioritize_and_delegate(improvements)
    assert len(result) == 2
    mock_delegate.assert_any_call(title="Test görevi 1", description="[CEO BRAINSTORM] Test görevi 1", target_department_id="trade")
    mock_delegate.assert_any_call(title="Test görevi 2", description="[CEO BRAINSTORM] Test görevi 2", target_department_id="software")
