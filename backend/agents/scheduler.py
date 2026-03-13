"""
COWORK.ARMY — AgentScheduler
asyncio.PriorityQueue tabanlı görev zamanlayıcı.
Öncelik sırası: CRITICAL > HIGH > MEDIUM > LOW
Cascade derinlik limiti, idle timeout, kapasite kontrolü.
"""
import asyncio
import logging
import uuid
from dataclasses import dataclass, field
from datetime import datetime
from enum import IntEnum
from typing import Optional, Callable

logger = logging.getLogger("cowork.scheduler")

MAX_CASCADE_DEPTH = 10
MAX_QUEUE_SIZE = 500


class TaskPriority(IntEnum):
    """Lower value = higher priority (PriorityQueue min-heap)."""
    CRITICAL = 0
    HIGH = 1
    MEDIUM = 2
    LOW = 3


@dataclass(order=True)
class ScheduledTask:
    """A task in the priority queue. Ordered by priority (lower = higher priority)."""
    priority: TaskPriority
    created_at: datetime = field(default_factory=datetime.utcnow, compare=False)
    agent_id: str = field(compare=False, default="")
    task: str = field(compare=False, default="")
    cascade_id: Optional[str] = field(compare=False, default=None)
    cascade_depth: int = field(compare=False, default=0)
    thread_id: str = field(compare=False, default_factory=lambda: str(uuid.uuid4()))

    def __init__(
        self,
        agent_id: str,
        task: str,
        priority: TaskPriority,
        cascade_id: Optional[str] = None,
        cascade_depth: int = 0,
    ):
        self.agent_id = agent_id
        self.task = task
        self.priority = priority
        self.cascade_id = cascade_id
        self.cascade_depth = cascade_depth
        self.created_at = datetime.utcnow()
        self.thread_id = str(uuid.uuid4())


class AgentScheduler:
    """
    Öncelik kuyruğu tabanlı görev zamanlayıcı.
    - asyncio.PriorityQueue (CRITICAL=0 en yüksek öncelik)
    - Cascade derinlik limiti: MAX_CASCADE_DEPTH
    - Maksimum kuyruk boyutu: MAX_QUEUE_SIZE
    """

    def __init__(self):
        self._queue: asyncio.PriorityQueue = asyncio.PriorityQueue(maxsize=MAX_QUEUE_SIZE)
        self._active_tasks: dict[str, ScheduledTask] = {}  # agent_id → aktif görev
        self._idle_timers: dict[str, asyncio.Task] = {}   # agent_id → idle timer

    def queue_size(self) -> int:
        return self._queue.qsize()

    def active_task_count(self) -> int:
        return len(self._active_tasks)

    async def enqueue(self, task: ScheduledTask) -> None:
        """Add a task to the priority queue."""
        if task.cascade_id and task.cascade_depth >= MAX_CASCADE_DEPTH:
            raise ValueError(
                f"cascade depth {task.cascade_depth} exceeds limit {MAX_CASCADE_DEPTH}"
            )

        if self._queue.full():
            logger.warning(f"[SCHEDULER] Queue full ({MAX_QUEUE_SIZE}), dropping LOW priority tasks")
            if task.priority > TaskPriority.HIGH:
                logger.warning(f"[SCHEDULER] Dropping task for {task.agent_id}: queue full")
                return

        await self._queue.put(task)
        logger.debug(
            f"[SCHEDULER] Enqueued [{task.priority.name}] for {task.agent_id}: {task.task[:50]}"
        )

    async def dequeue(self) -> ScheduledTask:
        """Get the highest priority task from the queue (blocks if empty)."""
        return await self._queue.get()

    def mark_active(self, agent_id: str, task: ScheduledTask) -> None:
        """Mark an agent as actively working on a task."""
        self._active_tasks[agent_id] = task

    def mark_done(self, agent_id: str) -> None:
        """Mark an agent's task as done."""
        self._active_tasks.pop(agent_id, None)

    def is_agent_busy(self, agent_id: str) -> bool:
        """Returns True if agent has an active task."""
        return agent_id in self._active_tasks

    def start_idle_timer(
        self,
        agent_id: str,
        timeout_seconds: int,
        callback: Callable
    ) -> None:
        """Start an idle timer for an agent. Fires callback when agent is idle too long."""
        if agent_id in self._idle_timers:
            self._idle_timers[agent_id].cancel()

        async def _timer():
            await asyncio.sleep(timeout_seconds)
            if not self.is_agent_busy(agent_id):
                logger.info(
                    f"[SCHEDULER] Agent {agent_id} idle for {timeout_seconds}s, "
                    f"triggering routine task"
                )
                await callback(agent_id)

        self._idle_timers[agent_id] = asyncio.create_task(_timer())

    def cancel_idle_timer(self, agent_id: str) -> None:
        """Cancel an agent's idle timer."""
        if agent_id in self._idle_timers:
            self._idle_timers[agent_id].cancel()
            del self._idle_timers[agent_id]

    def get_stats(self) -> dict:
        """Return scheduler statistics."""
        return {
            "queue_size": self.queue_size(),
            "active_tasks": self.active_task_count(),
            "active_agents": list(self._active_tasks.keys()),
        }


# Global singleton
_scheduler: Optional[AgentScheduler] = None


def get_scheduler() -> AgentScheduler:
    global _scheduler
    if _scheduler is None:
        _scheduler = AgentScheduler()
    return _scheduler
