import pytest, time
from cache import app_cache


def setup_function():
    app_cache.clear()


def test_set_and_get():
    app_cache.set("k1", "v1", ttl=60)
    assert app_cache.get("k1") == "v1"


def test_missing_returns_none():
    assert app_cache.get("nope") is None


def test_expires():
    app_cache.set("exp", "val", ttl=0.1)
    time.sleep(0.2)
    assert app_cache.get("exp") is None


def test_delete():
    app_cache.set("del", "val", ttl=60)
    app_cache.delete("del")
    assert app_cache.get("del") is None


def test_clear():
    app_cache.set("c1", "v1", ttl=60)
    app_cache.clear()
    assert app_cache.get("c1") is None
