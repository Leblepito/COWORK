"""
COWORK.ARMY — test_websocket.py
TDD: broadcast() fonksiyonu için davranış testleri.

Kapsanan davranışlar:
1. broadcast() bağlı client'lara mesaj gönderir
2. broadcast() bağlantısı kopmuş client'ları sessizce temizler (UnboundLocalError olmaz)
3. broadcast() hiç client yoksa hata vermez
4. broadcast() birden fazla client'a paralel gönderir
5. broadcast() iteration sırasında set değişmez (RuntimeError olmaz)
"""
import asyncio
import json
import pytest
from unittest.mock import AsyncMock, MagicMock, patch


# ── Yardımcı: sahte WebSocket ──────────────────────────────────────────────

class FakeWebSocket:
    """Minimal WebSocket mock — send_text kaydeder veya hata fırlatır."""

    def __init__(self, fail: bool = False):
        self.sent: list[str] = []
        self._fail = fail

    async def send_text(self, text: str) -> None:
        if self._fail:
            raise RuntimeError("connection closed")
        self.sent.append(text)


# ── Testler ────────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_broadcast_sends_to_connected_client():
    """broadcast() bağlı bir client'a mesajı JSON olarak gönderir."""
    from backend.api.websocket import broadcast, _clients

    ws = FakeWebSocket()
    _clients.add(ws)
    try:
        await broadcast({"type": "test", "value": 42})
        assert len(ws.sent) == 1
        payload = json.loads(ws.sent[0])
        assert payload["type"] == "test"
        assert payload["value"] == 42
    finally:
        _clients.discard(ws)


@pytest.mark.asyncio
async def test_broadcast_removes_dead_client_without_error():
    """broadcast() kopuk client'ı kaldırır — UnboundLocalError veya RuntimeError fırlatmaz."""
    from backend.api.websocket import broadcast, _clients

    dead_ws = FakeWebSocket(fail=True)
    live_ws = FakeWebSocket(fail=False)
    _clients.add(dead_ws)
    _clients.add(live_ws)
    try:
        # Bu satır önceden UnboundLocalError fırlatıyordu (_clients -= dead)
        await broadcast({"type": "ping"})
        # Kopuk client temizlendi mi?
        assert dead_ws not in _clients
        # Canlı client mesajı aldı mı?
        assert len(live_ws.sent) == 1
    finally:
        _clients.discard(dead_ws)
        _clients.discard(live_ws)


@pytest.mark.asyncio
async def test_broadcast_with_no_clients_does_not_raise():
    """broadcast() hiç client yokken sessizce tamamlanır."""
    from backend.api.websocket import broadcast, _clients

    # _clients'ın boş olduğundan emin ol (diğer testlerden kirlenme)
    original = set(_clients)
    _clients.clear()
    try:
        await broadcast({"type": "empty"})  # hata fırlatmamalı
    finally:
        _clients.update(original)


@pytest.mark.asyncio
async def test_broadcast_sends_to_multiple_clients():
    """broadcast() birden fazla client'a aynı mesajı gönderir."""
    from backend.api.websocket import broadcast, _clients

    clients = [FakeWebSocket() for _ in range(3)]
    for ws in clients:
        _clients.add(ws)
    try:
        await broadcast({"type": "multi", "n": 3})
        for ws in clients:
            assert len(ws.sent) == 1
            assert json.loads(ws.sent[0])["n"] == 3
    finally:
        for ws in clients:
            _clients.discard(ws)


@pytest.mark.asyncio
async def test_broadcast_iteration_safe_when_client_fails():
    """broadcast() iteration sırasında set değişse de RuntimeError fırlatmaz."""
    from backend.api.websocket import broadcast, _clients

    # 2 kopuk + 1 canlı
    dead1 = FakeWebSocket(fail=True)
    dead2 = FakeWebSocket(fail=True)
    live = FakeWebSocket(fail=False)
    for ws in [dead1, dead2, live]:
        _clients.add(ws)
    try:
        await broadcast({"type": "safe"})
        assert dead1 not in _clients
        assert dead2 not in _clients
        assert len(live.sent) == 1
    finally:
        for ws in [dead1, dead2, live]:
            _clients.discard(ws)
