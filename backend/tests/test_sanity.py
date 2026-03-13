"""Basic sanity checks for the COWORK.ARMY backend test suite."""
import pytest


def test_addition():
    assert 1 + 1 == 2


@pytest.mark.asyncio
async def test_async_sanity():
    import asyncio
    await asyncio.sleep(0.01)
    assert True
