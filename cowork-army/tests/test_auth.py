"""Tests for JWT auth middleware."""
import pytest
import os
from fastapi import FastAPI
from fastapi.testclient import TestClient

os.environ.setdefault("COWORK_JWT_SECRET", "test-secret-key-for-testing")

from middleware.auth import require_auth, create_token, verify_token


def test_create_and_verify_token():
    token = create_token(subject="admin", role="admin")
    payload = verify_token(token)
    assert payload["sub"] == "admin"
    assert payload["role"] == "admin"


def test_verify_invalid_token():
    payload = verify_token("invalid.token.here")
    assert payload is None


def test_verify_expired_token():
    token = create_token(subject="admin", role="admin", expires_minutes=-1)
    payload = verify_token(token)
    assert payload is None


def test_protected_endpoint_rejects_no_token():
    app = FastAPI()

    @app.get("/protected")
    async def protected(user=require_auth):
        return {"user": user}

    client = TestClient(app)
    r = client.get("/protected")
    assert r.status_code == 401


def test_protected_endpoint_accepts_valid_token():
    app = FastAPI()

    @app.get("/protected")
    async def protected(user=require_auth):
        return {"user": user}

    client = TestClient(app)
    token = create_token(subject="admin", role="admin")
    r = client.get("/protected", headers={"Authorization": f"Bearer {token}"})
    assert r.status_code == 200
    assert r.json()["user"]["sub"] == "admin"
