import pytest
import asyncio
from sse import SSEBroadcaster

@pytest.fixture
def bc():
    return SSEBroadcaster()

def test_starts_empty(bc):
    assert bc.client_count == 0

@pytest.mark.asyncio
async def test_broadcast_sends(bc):
    q = asyncio.Queue()
    bc.subscribe(q)
    await bc.broadcast("test", {"msg": "hi"})
    event = await asyncio.wait_for(q.get(), timeout=1.0)
    assert event["event"] == "test"
    assert event["data"]["msg"] == "hi"

@pytest.mark.asyncio
async def test_unsubscribe(bc):
    q = asyncio.Queue()
    bc.subscribe(q)
    bc.unsubscribe(q)
    assert bc.client_count == 0

@pytest.mark.asyncio
async def test_max_clients(bc):
    for i in range(100):
        bc.subscribe(asyncio.Queue())
    assert not bc.subscribe(asyncio.Queue())
    assert bc.client_count == 100
