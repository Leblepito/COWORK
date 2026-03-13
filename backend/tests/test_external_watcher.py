"""Tests for ExternalDataWatcher."""
import pytest
import asyncio
from unittest.mock import AsyncMock, patch, MagicMock
from backend.agents.external_watcher import (
    ExternalDataWatcher, MarketDataStream, ExternalEvent, Severity
)


def test_watcher_has_5_streams():
    watcher = ExternalDataWatcher()
    assert len(watcher.streams) == 5


def test_stream_names():
    watcher = ExternalDataWatcher()
    names = {s.name for s in watcher.streams}
    assert names == {"market", "news", "social", "operational", "system"}


def test_external_event_creation():
    event = ExternalEvent(
        source="binance",
        category="market",
        raw_data={"symbol": "BTC", "change_pct": -3.5},
        severity=Severity.HIGH,
        summary="BTC -3.5% son 1 saatte",
        target_departments=["trade"],
    )
    assert event.severity == Severity.HIGH
    assert "trade" in event.target_departments
    assert event.source == "binance"


def test_market_stream_severity_levels():
    stream = MarketDataStream()
    assert stream._change_to_severity(0.5) is None  # Küçük değişim tetiklemez
    assert stream._change_to_severity(1.0) == Severity.MEDIUM
    assert stream._change_to_severity(2.0) == Severity.HIGH
    assert stream._change_to_severity(5.0) == Severity.CRITICAL


def test_market_stream_evaluate_trigger():
    stream = MarketDataStream()
    low_event = ExternalEvent("src", "market", {}, Severity.LOW, "", ["trade"])
    med_event = ExternalEvent("src", "market", {}, Severity.MEDIUM, "", ["trade"])
    high_event = ExternalEvent("src", "market", {}, Severity.HIGH, "", ["trade"])
    crit_event = ExternalEvent("src", "market", {}, Severity.CRITICAL, "", ["trade"])
    
    assert stream.evaluate_trigger(low_event) is False
    assert stream.evaluate_trigger(med_event) is True
    assert stream.evaluate_trigger(high_event) is True
    assert stream.evaluate_trigger(crit_event) is True


@pytest.mark.asyncio
async def test_watcher_broadcasts_on_handle_event():
    watcher = ExternalDataWatcher()
    broadcast_calls = []

    async def mock_broadcast(event):
        broadcast_calls.append(event)

    with patch("backend.agents.external_watcher.broadcast_external_trigger", new=mock_broadcast):
        await watcher._handle_event(ExternalEvent(
            source="binance",
            category="market",
            raw_data={"symbol": "BTC", "change_pct": -2.1},
            severity=Severity.HIGH,
            summary="BTC -2.1%",
            target_departments=["trade"],
        ))

    assert len(broadcast_calls) == 1
    assert broadcast_calls[0]["type"] == "external_trigger"
    assert broadcast_calls[0]["severity"] == "HIGH"
    assert broadcast_calls[0]["source"] == "binance"


@pytest.mark.asyncio
async def test_watcher_start_stop():
    """Watcher should start and stop without errors."""
    watcher = ExternalDataWatcher()
    # Mock all stream fetch methods to avoid real network calls
    for stream in watcher.streams:
        stream.fetch = AsyncMock(return_value=[])
    
    await watcher.start()
    assert watcher._running is True
    assert len(watcher._tasks) == 5
    
    await watcher.stop()
    assert watcher._running is False
    assert len(watcher._tasks) == 0


def test_severity_enum():
    assert Severity.LOW == "LOW"
    assert Severity.MEDIUM == "MEDIUM"
    assert Severity.HIGH == "HIGH"
    assert Severity.CRITICAL == "CRITICAL"
