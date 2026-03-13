"""Tests for Agent World DB models."""
import pytest
from backend.database.models import (
    AgentMessage, AgentWorldModel, AgentEpisode,
    SharedKnowledge, CascadeChain
)


def test_agent_message_model_exists():
    msg = AgentMessage(
        id="test-uuid",
        from_agent="trade-indicator",
        to_agent="software-fullstack",
        message_type="TASK_ASSIGN",
        priority="HIGH",
        payload={"task": "test"},
        thread_id="thread-1",
        status="SENT"
    )
    assert msg.from_agent == "trade-indicator"
    assert msg.priority == "HIGH"
    assert msg.status == "SENT"


def test_agent_world_model_exists():
    wm = AgentWorldModel(
        agent_id="trade-indicator",
        expertise_score=0.7,
        energy_level=0.9,
        idle_timeout_seconds=300
    )
    assert wm.expertise_score == 0.7
    assert wm.energy_level == 0.9


def test_cascade_chain_model_exists():
    cc = CascadeChain(
        cascade_id="cascade-1",
        trigger_source="binance",
        trigger_summary="BTC -3%",
        affected_departments=["trade", "software"],
        depth=0
    )
    assert cc.trigger_source == "binance"
    assert "trade" in cc.affected_departments


def test_agent_episode_model_exists():
    ep = AgentEpisode(
        id="ep-1",
        agent_id="trade-indicator",
        task_summary="BTC analizi",
        outcome="SUCCESS",
        duration_seconds=42
    )
    assert ep.outcome == "SUCCESS"


def test_shared_knowledge_model_exists():
    sk = SharedKnowledge(
        id="sk-1",
        author_agent="trade-indicator",
        category="market",
        content="BTC 100k üzerinde",
        relevance_score=0.9
    )
    assert sk.category == "market"
    assert sk.relevance_score == 0.9
