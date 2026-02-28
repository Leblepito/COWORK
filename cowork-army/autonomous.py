"""
COWORK.ARMY — Autonomous Loop
Background tick that monitors agents, auto-spawns pending tasks, generates events.
Events persisted to SQLite.
"""
from __future__ import annotations

import asyncio
import logging
from datetime import datetime, timezone
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from runner import AgentRunner
    from database import Database

logger = logging.getLogger("cowork-army.autonomous")

TICK_INTERVAL = 30       # seconds
MAX_TASK_RETRIES = 5     # max re-spawn attempts per task


def _now_iso() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


class AutonomousLoop:
    """Background loop that ticks every 30 seconds. Events stored in DB."""

    def __init__(self, runner: AgentRunner, db: Database) -> None:
        self.runner = runner
        self.db = db
        self.running: bool = False
        self.tick_count: int = 0
        self.last_tick: str | None = None
        self._task: asyncio.Task[None] | None = None

    # ── Control ─────────────────────────────────────────

    def start(self) -> None:
        if self.running:
            return
        self.running = True
        self._task = asyncio.create_task(self._loop())
        self.add_event("commander", "Otonom döngü başlatıldı", "info")
        logger.info("Autonomous loop started")

    def stop(self) -> None:
        self.running = False
        if self._task and not self._task.done():
            self._task.cancel()
        self.add_event("commander", "Otonom döngü durduruldu", "info")
        logger.info("Autonomous loop stopped")

    # ── Events ──────────────────────────────────────────

    def add_event(
        self,
        agent_id: str,
        message: str,
        event_type: str = "info",
    ) -> None:
        self.db.add_event(agent_id, message, event_type)

    def get_status(self) -> dict:
        return {
            "running": self.running,
            "tick_count": self.tick_count,
            "total_events": self.db.get_event_count(),
            "agents_tracked": len(self.db.get_all_agents()),
            "last_tick": self.last_tick,
        }

    def get_events(self, limit: int = 50, since: str = "") -> list[dict]:
        return self.db.get_events(limit=limit, since=since)

    # ── Loop ────────────────────────────────────────────

    async def _loop(self) -> None:
        while self.running:
            try:
                await self._tick()
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.exception("Autonomous tick error")
                self.add_event("commander", f"Döngü hatası: {e}", "warning")
            await asyncio.sleep(TICK_INTERVAL)

    async def _tick(self) -> None:
        self.tick_count += 1
        self.last_tick = _now_iso()

        # 1. Report alive agents
        alive = [
            aid for aid, proc in self.runner.processes.items()
            if proc.alive
        ]
        if alive:
            names = ", ".join(alive)
            self.add_event(
                "commander",
                f"Tick #{self.tick_count}: {len(alive)} aktif agent — {names}",
                "info",
            )
        else:
            self.add_event(
                "commander",
                f"Tick #{self.tick_count}: tüm agentlar boşta",
                "info",
            )

        # 2. Auto-spawn pending tasks
        pending = [t for t in self.db.list_tasks() if t["status"] == "pending"]
        for task in pending[:3]:
            agent_id = task["assigned_to"]
            proc = self.runner.processes.get(agent_id)
            if proc and not proc.alive:
                self.add_event(
                    agent_id,
                    f"Otomatik başlatılıyor — görev: {task['title'][:60]}",
                    "task_created",
                )
                desc = f"{task['title']}: {task['description']}" if task["description"] else task["title"]
                await self.runner.spawn(agent_id, desc, task_id=task["id"])
                self.db.update_task_status(
                    task["id"], "in_progress", "Otonom döngü tarafından başlatıldı",
                )

        # 3. Re-spawn stalled in_progress tasks (agent stopped but task not done)
        in_progress = [t for t in self.db.list_tasks() if t["status"] == "in_progress"]
        for task in in_progress[:3]:
            agent_id = task["assigned_to"]
            proc = self.runner.processes.get(agent_id)
            if not proc or proc.alive:
                continue  # Agent still running or unknown

            # Count retries from task log
            retry_count = sum(
                1 for entry in task.get("log", [])
                if "yeniden başlatıldı" in entry
            )
            if retry_count >= MAX_TASK_RETRIES:
                if retry_count == MAX_TASK_RETRIES:
                    self.db.update_task_status(
                        task["id"], "error",
                        f"Maksimum yeniden deneme sayısına ulaşıldı ({MAX_TASK_RETRIES})",
                    )
                    self.add_event(
                        agent_id,
                        f"Görev başarısız — {MAX_TASK_RETRIES} deneme tükendi: {task['title'][:40]}",
                        "warning",
                    )
                continue

            # Re-spawn the agent to continue the task
            self.add_event(
                agent_id,
                f"Görev devam ediyor (deneme {retry_count + 1}/{MAX_TASK_RETRIES}): {task['title'][:50]}",
                "task_created",
            )
            desc = f"{task['title']}: {task['description']}" if task["description"] else task["title"]
            await self.runner.spawn(agent_id, desc, task_id=task["id"])
            self.db.update_task_status(
                task["id"], "in_progress",
                f"Otonom döngü tarafından yeniden başlatıldı (deneme {retry_count + 1})",
            )

        # 4. Supervisor inbox check (every 5th tick)
        if self.tick_count % 5 == 0:
            self.add_event("supervisor", "Inbox kontrolü — agent çıktıları inceleniyor", "inbox_check")

        # 5. Quant-lab self-improve (every 10th tick)
        if self.tick_count % 10 == 0:
            self.add_event("quant-lab", "Performans metrikleri analiz ediliyor", "self_improve")
