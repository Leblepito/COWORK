"""Tests for AgentScheduler."""
import pytest
import asyncio
from backend.agents.scheduler import (
    AgentScheduler, ScheduledTask, TaskPriority, MAX_CASCADE_DEPTH
)


@pytest.fixture
def scheduler():
    return AgentScheduler()


def test_scheduler_initializes_empty(scheduler):
    assert scheduler.queue_size() == 0
    assert scheduler.active_task_count() == 0


@pytest.mark.asyncio
async def test_enqueue_task(scheduler):
    task = ScheduledTask(
        agent_id="trade-indicator",
        task="BTC fiyatını analiz et",
        priority=TaskPriority.MEDIUM,
    )
    await scheduler.enqueue(task)
    assert scheduler.queue_size() == 1


@pytest.mark.asyncio
async def test_high_priority_before_low(scheduler):
    """HIGH priority tasks should be dequeued before LOW priority tasks."""
    low_task = ScheduledTask("agent-a", "düşük öncelik", TaskPriority.LOW)
    high_task = ScheduledTask("agent-b", "yüksek öncelik", TaskPriority.HIGH)
    await scheduler.enqueue(low_task)
    await scheduler.enqueue(high_task)

    next_task = await scheduler.dequeue()
    assert next_task.priority == TaskPriority.HIGH


@pytest.mark.asyncio
async def test_critical_priority_first(scheduler):
    """CRITICAL tasks should be dequeued before HIGH, MEDIUM, LOW."""
    await scheduler.enqueue(ScheduledTask("a", "low", TaskPriority.LOW))
    await scheduler.enqueue(ScheduledTask("b", "medium", TaskPriority.MEDIUM))
    await scheduler.enqueue(ScheduledTask("c", "critical", TaskPriority.CRITICAL))
    await scheduler.enqueue(ScheduledTask("d", "high", TaskPriority.HIGH))

    first = await scheduler.dequeue()
    assert first.priority == TaskPriority.CRITICAL


@pytest.mark.asyncio
async def test_cascade_depth_limit(scheduler):
    """Tasks exceeding cascade depth limit should raise ValueError."""
    assert MAX_CASCADE_DEPTH == 10

    # Tasks within limit should be accepted
    for i in range(MAX_CASCADE_DEPTH):
        task = ScheduledTask("agent", f"task {i}", TaskPriority.MEDIUM,
                             cascade_id="cascade-1", cascade_depth=i)
        await scheduler.enqueue(task)

    # Task at limit should raise
    with pytest.raises(ValueError, match="cascade depth"):
        task = ScheduledTask("agent", "too deep", TaskPriority.MEDIUM,
                             cascade_id="cascade-1", cascade_depth=MAX_CASCADE_DEPTH)
        await scheduler.enqueue(task)


def test_mark_active_and_done(scheduler):
    task = ScheduledTask("agent-x", "test", TaskPriority.MEDIUM)
    scheduler.mark_active("agent-x", task)
    assert scheduler.is_agent_busy("agent-x") is True
    assert scheduler.active_task_count() == 1

    scheduler.mark_done("agent-x")
    assert scheduler.is_agent_busy("agent-x") is False
    assert scheduler.active_task_count() == 0


def test_get_stats(scheduler):
    stats = scheduler.get_stats()
    assert "queue_size" in stats
    assert "active_tasks" in stats
    assert "active_agents" in stats


def test_task_priority_ordering():
    """TaskPriority values should be ordered CRITICAL < HIGH < MEDIUM < LOW."""
    assert TaskPriority.CRITICAL < TaskPriority.HIGH
    assert TaskPriority.HIGH < TaskPriority.MEDIUM
    assert TaskPriority.MEDIUM < TaskPriority.LOW
