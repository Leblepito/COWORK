# cowork-army/tests/test_logging_config.py
import json
import pytest


def test_configure_logging_returns_json(capsys):
    from logging_config import configure_logging
    import structlog
    configure_logging()
    logger = structlog.get_logger("test")
    logger.info("hello", key="value")
    captured = capsys.readouterr()
    line = captured.out.strip().split("\n")[-1]
    data = json.loads(line)
    assert data["event"] == "hello"
    assert data["key"] == "value"


def test_configure_logging_includes_timestamp(capsys):
    from logging_config import configure_logging
    import structlog
    configure_logging()
    logger = structlog.get_logger("test")
    logger.info("ts_test")
    captured = capsys.readouterr()
    line = captured.out.strip().split("\n")[-1]
    data = json.loads(line)
    assert "timestamp" in data
