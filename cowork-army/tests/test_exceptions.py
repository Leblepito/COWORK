# cowork-army/tests/test_exceptions.py
import pytest
from exceptions import AppException, NotFoundError, ValidationError, AuthError

def test_app_exception_has_status_and_detail():
    exc = AppException(status_code=500, detail="boom")
    assert exc.status_code == 500
    assert exc.detail == "boom"

def test_not_found_error_defaults():
    exc = NotFoundError("agent", "xyz")
    assert exc.status_code == 404
    assert "agent" in exc.detail
    assert "xyz" in exc.detail

def test_validation_error_defaults():
    exc = ValidationError("name is required")
    assert exc.status_code == 422
    assert exc.detail == "name is required"

def test_auth_error_defaults():
    exc = AuthError()
    assert exc.status_code == 401
    assert "auth" in exc.detail.lower() or "unauthorized" in exc.detail.lower()
