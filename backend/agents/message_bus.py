"""
COWORK.ARMY — AgentMessageBus
Agent'lar arası mesaj protokolü. PostgreSQL kalıcı kayıt + WebSocket broadcast.
Desteklenen mesaj tipleri: TASK_ASSIGN, TASK_RESULT, CONSULTATION, ESCALATION,
BROADCAST, NEGOTIATION, CAPABILITY_QUERY, AVAILABILITY_RESPONSE, CONTRACT.
"""
import uuid
import logging
from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
from typing import Callable, Optional

logger = logging.getLogger("cowork.message_bus")


class MessageType(str, Enum):
    CAPABILITY_QUERY = "CAPABILITY_QUERY"
    AVAILABILITY_RESPONSE = "AVAILABILITY_RESPONSE"
    NEGOTIATION = "NEGOTIATION"
    CONTRACT = "CONTRACT"
    TASK_ASSIGN = "TASK_ASSIGN"
    TASK_RESULT = "TASK_RESULT"
    CONSULTATION = "CONSULTATION"
    ESCALATION = "ESCALATION"
    BROADCAST = "BROADCAST"


class Priority(str, Enum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
    CRITICAL = "CRITICAL"


class MessageStatus(str, Enum):
    SENT = "SENT"
    RECEIVED = "RECEIVED"
    PROCESSING = "PROCESSING"
    DONE = "DONE"
    FAILED = "FAILED"


@dataclass
class AgentMessage:
    from_agent: str
    to_agent: str
    message_type: MessageType
    priority: Priority
    payload: dict
    id: str = field(default_factory=lambda: str(uuid.uuid4()))
    thread_id: Optional[str] = None
    cascade_id: Optional[str] = None
    status: MessageStatus = MessageStatus.SENT
    created_at: datetime = field(default_factory=datetime.utcnow)


# Global singleton
_bus_instance: Optional["AgentMessageBus"] = None


def get_message_bus() -> "AgentMessageBus":
    global _bus_instance
    if _bus_instance is None:
        _bus_instance = AgentMessageBus()
    return _bus_instance


class AgentMessageBus:
    """
    Central message bus for agent-to-agent communication.
    - Persists all messages to PostgreSQL
    - Broadcasts to WebSocket clients
    - Notifies local subscribers (for scheduler)
    - Max cascade depth: 10
    """

    MAX_CASCADE_DEPTH = 10

    def __init__(self):
        self._subscribers: dict[str, list[Callable]] = {}  # agent_id → callbacks
        self._cascade_depths: dict[str, int] = {}  # cascade_id → depth

    async def send(
        self,
        from_agent: str,
        to_agent: str,
        message_type: MessageType,
        priority: Priority,
        payload: dict,
        thread_id: Optional[str] = None,
        cascade_id: Optional[str] = None,
    ) -> str:
        """Send a message. Returns message id."""
        msg = AgentMessage(
            from_agent=from_agent,
            to_agent=to_agent,
            message_type=message_type,
            priority=priority,
            payload=payload,
            thread_id=thread_id or str(uuid.uuid4()),
            cascade_id=cascade_id,
        )

        # Cascade depth guard
        if cascade_id:
            depth = self._cascade_depths.get(cascade_id, 0) + 1
            if depth > self.MAX_CASCADE_DEPTH:
                logger.warning(
                    f"Cascade {cascade_id} exceeded max depth {self.MAX_CASCADE_DEPTH}, dropping message"
                )
                return msg.id
            self._cascade_depths[cascade_id] = depth

        # Persist to DB
        await self._persist(msg)

        # Broadcast to WebSocket
        await self._broadcast({
            "type": "agent_message",
            "id": msg.id,
            "from_agent": msg.from_agent,
            "to_agent": msg.to_agent,
            "message_type": msg.message_type,
            "priority": msg.priority,
            "payload_summary": self._summarize_payload(msg),
            "thread_id": msg.thread_id,
            "cascade_id": msg.cascade_id,
            "timestamp": str(msg.created_at),
        })

        # Notify local subscribers
        self._notify_subscribers(msg)

        logger.info(f"[BUS] {from_agent} → {to_agent} [{message_type}] [{priority}]")
        return msg.id

    async def _persist(self, msg: AgentMessage) -> str:
        """Save message to PostgreSQL."""
        try:
            from ..database import get_db
            db = get_db()
            return await db.save_agent_message({
                "id": msg.id,
                "from_agent": msg.from_agent,
                "to_agent": msg.to_agent,
                "message_type": msg.message_type,
                "priority": msg.priority,
                "payload": msg.payload,
                "thread_id": msg.thread_id,
                "cascade_id": msg.cascade_id,
                "status": msg.status,
            })
        except Exception as e:
            logger.error(f"[BUS] Failed to persist message: {e}")
            return msg.id

    async def _broadcast(self, event: dict) -> None:
        """Broadcast to all WebSocket clients."""
        try:
            from ..api.websocket import broadcast
            await broadcast(event)
        except Exception as e:
            logger.error(f"[BUS] Failed to broadcast: {e}")

    def _summarize_payload(self, msg: AgentMessage) -> str:
        """Create a short human-readable summary of the payload."""
        p = msg.payload
        if msg.message_type == MessageType.TASK_ASSIGN:
            return str(p.get("task", ""))[:100]
        elif msg.message_type == MessageType.TASK_RESULT:
            return f"{'✅' if p.get('success') else '❌'} {str(p.get('output', ''))[:80]}"
        elif msg.message_type == MessageType.ESCALATION:
            return f"⚠️ {p.get('reason', '')[:80]}"
        elif msg.message_type == MessageType.CONSULTATION:
            return str(p.get("question", ""))[:100]
        elif msg.message_type == MessageType.BROADCAST:
            return str(p.get("announcement", ""))[:100]
        elif msg.message_type == MessageType.NEGOTIATION:
            return str(p.get("proposal", ""))[:100]
        return str(p)[:100]

    def subscribe(self, agent_id: str, callback: Callable) -> None:
        """Subscribe to messages for a specific agent."""
        if agent_id not in self._subscribers:
            self._subscribers[agent_id] = []
        self._subscribers[agent_id].append(callback)

    def unsubscribe(self, agent_id: str, callback: Callable) -> None:
        """Unsubscribe a callback."""
        if agent_id in self._subscribers:
            self._subscribers[agent_id] = [
                cb for cb in self._subscribers[agent_id] if cb != callback
            ]

    def _notify_subscribers(self, msg: AgentMessage) -> None:
        """Notify local subscribers (scheduler, etc.)."""
        callbacks = self._subscribers.get(msg.to_agent, [])
        for cb in callbacks:
            try:
                cb(msg)
            except Exception as e:
                logger.error(f"[BUS] Subscriber callback error: {e}")
