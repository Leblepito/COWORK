"""
COWORK.ARMY v7.0 — WebSocket Hub
Real-time agent status and event streaming.
"""
import asyncio
import json
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from ..agents.runner import get_statuses
from ..database import get_db

router = APIRouter(tags=["websocket"])

# Connected clients
_clients: set[WebSocket] = set()


@router.websocket("/ws/events")
async def websocket_events(websocket: WebSocket):
    """
    WebSocket endpoint for real-time updates.
    Sends agent statuses and events every 2 seconds.
    """
    await websocket.accept()
    _clients.add(websocket)
    last_event_count = 0

    try:
        while True:
            # Gather statuses
            statuses = await get_statuses()

            # Gather recent events
            db = get_db()
            events = await db.get_events(limit=10)
            event_count = await db.get_event_count()

            payload = {
                "type": "update",
                "statuses": statuses,
                "events": events,
                "new_events": event_count > last_event_count,
            }
            last_event_count = event_count

            await websocket.send_text(json.dumps(payload, default=str))
            await asyncio.sleep(2)
    except WebSocketDisconnect:
        pass
    except Exception:
        pass
    finally:
        _clients.discard(websocket)


async def broadcast(message: dict):
    """Broadcast a message to all connected WebSocket clients."""
    text = json.dumps(message, default=str)
    dead = set()
    for ws in _clients:
        try:
            await ws.send_text(text)
        except Exception:
            dead.add(ws)
    _clients -= dead
