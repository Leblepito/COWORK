# cowork-army/tests/test_integration_middleware.py
"""Integration test: verify all middleware layers work together."""
import pytest
import os

os.environ.setdefault("COWORK_JWT_SECRET", "test-secret")

from fastapi import FastAPI
from fastapi.testclient import TestClient
from middleware.error_handler import add_error_handlers
from middleware.rate_limit import add_rate_limiting
from middleware.auth import require_auth, create_token
from exceptions import NotFoundError


def _make_app():
    app = FastAPI()
    add_error_handlers(app)
    add_rate_limiting(app)

    @app.get("/public")
    async def public():
        return {"public": True}

    @app.get("/protected")
    async def protected(user=require_auth):
        return {"user": user["sub"]}

    @app.get("/error")
    async def error():
        raise NotFoundError("item", "123")

    return app


client = TestClient(_make_app())


def test_public_endpoint_works():
    r = client.get("/public")
    assert r.status_code == 200
    assert "X-Request-ID" in r.headers


def test_protected_rejects_without_token():
    r = client.get("/protected")
    assert r.status_code == 401


def test_protected_accepts_with_token():
    token = create_token("testuser", "admin")
    r = client.get("/protected", headers={"Authorization": f"Bearer {token}"})
    assert r.status_code == 200
    assert r.json()["user"] == "testuser"


def test_error_returns_structured_json():
    r = client.get("/error")
    assert r.status_code == 404
    body = r.json()
    assert "error" in body
    assert "request_id" in body
    assert "detail" in body
    assert "timestamp" in body
    assert "item" in body["error"]
