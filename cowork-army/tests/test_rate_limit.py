"""Tests for rate limiting middleware."""
import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient
from middleware.rate_limit import add_rate_limiting


def test_rate_limit_allows_normal_requests():
    app = FastAPI()
    add_rate_limiting(app)

    @app.get("/test")
    async def test_ep():
        return {"ok": True}

    client = TestClient(app)
    r = client.get("/test")
    assert r.status_code == 200
