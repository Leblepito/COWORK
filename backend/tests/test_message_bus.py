"""Tests for AgentMessageBus."""
import pytest
import asyncio
from unittest.mock import AsyncMock, patch
from backend.agents.message_bus import AgentMessageBus, MessageType, Priority


@pytest.fixture
def bus():
    return AgentMessageBus()


@pytest.mark.asyncio
async def test_send_message_returns_id(bus):
    with patch.object(bus, '_persist', new_callable=AsyncMock) as mock_persist:
        with patch.object(bus, '_broadcast', new_callable=AsyncMock):
            mock_persist.return_value = "msg-123"
            msg_id = await bus.send(
                from_agent="trade-indicator",
                to_agent="software-fullstack",
                message_type=MessageType.TASK_ASSIGN,
                priority=Priority.HIGH,
                payload={"task": "algo kodu yaz"},
            )
            assert msg_id is not None
            assert isinstance(msg_id, str)


@pytest.mark.asyncio
async def test_send_message_broadcasts_to_websocket(bus):
    with patch.object(bus, '_persist', new_callable=AsyncMock) as mock_persist:
        with patch.object(bus, '_broadcast', new_callable=AsyncMock) as mock_broadcast:
            mock_persist.return_value = "msg-123"
            await bus.send(
                from_agent="trade-indicator",
                to_agent="software-fullstack",
                message_type=MessageType.TASK_ASSIGN,
                priority=Priority.HIGH,
                payload={"task": "test"},
            )
            mock_broadcast.assert_called_once()
            call_args = mock_broadcast.call_args[0][0]
            assert call_args["type"] == "agent_message"
            assert call_args["from_agent"] == "trade-indicator"
            assert call_args["to_agent"] == "software-fullstack"


@pytest.mark.asyncio
async def test_cascade_depth_limit(bus):
    """Messages exceeding cascade depth limit should be dropped."""
    with patch.object(bus, '_persist', new_callable=AsyncMock) as mock_persist:
        with patch.object(bus, '_broadcast', new_callable=AsyncMock):
            mock_persist.return_value = "id"
            cascade_id = "test-cascade"
            # Simulate 10 cascade steps
            for i in range(bus.MAX_CASCADE_DEPTH):
                bus._cascade_depths[cascade_id] = i
                msg_id = await bus.send(
                    "a", "b", MessageType.CONSULTATION, Priority.MEDIUM,
                    {"question": f"step {i}"},
                    cascade_id=cascade_id,
                )
                assert msg_id is not None
            
            # 11th step should be dropped (returns id but doesn't persist)
            bus._cascade_depths[cascade_id] = bus.MAX_CASCADE_DEPTH
            msg_id = await bus.send(
                "a", "b", MessageType.CONSULTATION, Priority.MEDIUM,
                {"question": "too deep"},
                cascade_id=cascade_id,
            )
            # Returns id but persist was NOT called for this one
            # (persist was called 10 times, not 11)
            assert mock_persist.call_count == bus.MAX_CASCADE_DEPTH


@pytest.mark.asyncio
async def test_subscribe_receives_messages(bus):
    """Subscribers should receive messages sent to their agent_id."""
    received = []
    bus.subscribe("target-agent", lambda msg: received.append(msg))
    
    with patch.object(bus, '_persist', new_callable=AsyncMock) as mock_persist:
        with patch.object(bus, '_broadcast', new_callable=AsyncMock):
            mock_persist.return_value = "id"
            await bus.send(
                "sender", "target-agent", MessageType.CONSULTATION, Priority.LOW,
                {"question": "hello?"},
            )
    
    assert len(received) == 1
    assert received[0].from_agent == "sender"
    assert received[0].to_agent == "target-agent"


@pytest.mark.asyncio
async def test_payload_summary_task_assign(bus):
    """TASK_ASSIGN messages should have task text in summary."""
    with patch.object(bus, '_persist', new_callable=AsyncMock) as mock_persist:
        with patch.object(bus, '_broadcast', new_callable=AsyncMock) as mock_broadcast:
            mock_persist.return_value = "id"
            await bus.send(
                "trade-indicator", "software-fullstack",
                MessageType.TASK_ASSIGN, Priority.HIGH,
                {"task": "BTC alım algoritması yaz"},
            )
            call_args = mock_broadcast.call_args[0][0]
            assert "BTC alım algoritması yaz" in call_args["payload_summary"]


def test_message_types_enum():
    """All required message types should exist."""
    assert MessageType.TASK_ASSIGN == "TASK_ASSIGN"
    assert MessageType.TASK_RESULT == "TASK_RESULT"
    assert MessageType.CONSULTATION == "CONSULTATION"
    assert MessageType.ESCALATION == "ESCALATION"
    assert MessageType.BROADCAST == "BROADCAST"
    assert MessageType.NEGOTIATION == "NEGOTIATION"


def test_priority_enum():
    """All required priorities should exist."""
    assert Priority.LOW == "LOW"
    assert Priority.MEDIUM == "MEDIUM"
    assert Priority.HIGH == "HIGH"
    assert Priority.CRITICAL == "CRITICAL"
