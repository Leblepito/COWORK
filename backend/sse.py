"""Server-Sent Events broadcaster for COWORK.ARMY real-time updates."""
import asyncio
import json
from typing import Any
import structlog

logger = structlog.get_logger()

class SSEBroadcaster:
    MAX_CLIENTS = 100

    def __init__(self) -> None:
        self._clients: list[asyncio.Queue] = []

    @property
    def client_count(self) -> int:
        return len(self._clients)

    def subscribe(self, queue: asyncio.Queue) -> bool:
        if len(self._clients) >= self.MAX_CLIENTS:
            logger.warning("sse_max_clients_reached", max=self.MAX_CLIENTS)
            return False
        self._clients.append(queue)
        logger.info("sse_client_connected", total=self.client_count)
        return True

    def unsubscribe(self, queue: asyncio.Queue) -> None:
        if queue in self._clients:
            self._clients.remove(queue)
        logger.info("sse_client_disconnected", total=self.client_count)

    async def broadcast(self, event: str, data: dict[str, Any]) -> None:
        message = {"event": event, "data": data}
        for queue in list(self._clients):
            try:
                queue.put_nowait(message)
            except asyncio.QueueFull:
                pass

broadcaster = SSEBroadcaster()
