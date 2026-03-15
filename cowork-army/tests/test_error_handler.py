# cowork-army/tests/test_error_handler.py
import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient
from exceptions import NotFoundError, ValidationError, AuthError
from middleware.error_handler import add_error_handlers


def _make_app() -> FastAPI:
    app = FastAPI()
    add_error_handlers(app)

    @app.get("/ok")
    async def ok():
        return {"status": "ok"}

    @app.get("/not-found")
    async def not_found():
        raise NotFoundError("agent", "xyz")

    @app.get("/validation")
    async def validation():
        raise ValidationError("name is required")

    @app.get("/auth")
    async def auth():
        raise AuthError()

    @app.get("/crash")
    async def crash():
        raise RuntimeError("unexpected")

    return app


client = TestClient(_make_app())


def test_ok_passes_through():
    r = client.get("/ok")
    assert r.status_code == 200


def test_not_found_returns_404_json():
    r = client.get("/not-found")
    assert r.status_code == 404
    body = r.json()
    assert "error" in body
    assert "detail" in body
    assert "request_id" in body
    assert "timestamp" in body


def test_validation_returns_422():
    r = client.get("/validation")
    assert r.status_code == 422


def test_auth_returns_401():
    r = client.get("/auth")
    assert r.status_code == 401


def test_unhandled_returns_500_json():
    r = client.get("/crash")
    assert r.status_code == 500
    body = r.json()
    assert "error" in body
    assert "detail" in body
    assert "request_id" in body
    assert "timestamp" in body
