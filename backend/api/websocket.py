"""\nCOWORK.ARMY v7.0 — WebSocket Hub\nReal-time agent status and event streaming.\n\nDesteklenen event tipleri:\n- update: 2 saniyelik polling (statuses + events + world_models + scheduler_stats)\n- agent_message: agent'lar arası mesaj (AgentMessageBus tarafından gönderilir)\n- external_trigger: dış veri tetiklemesi (ExternalDataWatcher tarafından)\n- cascade_event: cascade zinciri adımı\n- cascade_complete: cascade zinciri tamamlandı\n"""
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

            # World model snapshots
            try:
                from ..agents.world_model import get_world_model_manager
                from ..agents.scheduler import get_scheduler
                world_models = get_world_model_manager().get_snapshot()
                scheduler_stats = get_scheduler().get_stats()
            except Exception:
                world_models = []
                scheduler_stats = {}

            payload = {
                "type": "update",
                "statuses": statuses,
                "events": events,
                "new_events": event_count > last_event_count,
                "world_models": world_models,
                "scheduler_stats": scheduler_stats,
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
