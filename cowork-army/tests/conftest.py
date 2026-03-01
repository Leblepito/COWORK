"""Shared fixtures for COWORK.ARMY tests (v6 — async PostgreSQL)."""
import pytest


@pytest.fixture
def tmp_workspace(tmp_path):
    """Create a temporary workspace directory with sample files."""
    ws = tmp_path / "workspace"
    ws.mkdir()
    (ws / "hello.txt").write_text("Hello World", encoding="utf-8")
    (ws / "subdir").mkdir()
    (ws / "subdir" / "nested.py").write_text("print('nested')\n", encoding="utf-8")
    return str(ws)
