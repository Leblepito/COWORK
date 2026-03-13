#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
COWORK.ARMY — tests/test_ceo_tools.py
Tests for CEO-specific tools.
"""
import pytest
from unittest.mock import AsyncMock, MagicMock

from ..departments.ceo.tools import get_system_overview

@pytest.mark.asyncio
async def test_get_system_overview():
    """Test that get_system_overview gathers data from DB and returns a summary."""
    # Mock the database repository
    mock_db = AsyncMock()
    mock_db.get_all_agents.return_value = [
        {"id": "trade_agent_1", "department_id": "trade", "status": "working"},
        {"id": "medical_agent_1", "department_id": "medical", "status": "idle"},
    ]
    mock_db.get_events.return_value = [
        {"summary": "ETH price up", "department_id": "trade"},
    ]
    mock_db.get_tasks.return_value = [
        {"title": "Analyze BTC chart", "status": "pending"}
    ]

    # Mock the scheduler
    mock_scheduler = MagicMock()
    mock_scheduler.queue_size.return_value = 5
    mock_scheduler.active_task_count.return_value = 1

    # Inject mocks
    result = await get_system_overview(_db=mock_db, _scheduler=mock_scheduler)

    assert "Sistem Özeti" in result
    assert "Toplam Agent: 2" in result
    assert "Aktif Agent: 1" in result
    assert "Bekleyen Görev: 1" in result
    assert "Görev Kuyruğu: 5" in result
    assert "Son Olaylar (1)" in result
    assert "- [trade] ETH price up" in result
