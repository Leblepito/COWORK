"""
COWORK.ARMY v7.0 — Autonomous Loop
Periodically checks agent inboxes for pending tasks and spawns idle agents.
"""
import asyncio
import json
import logging
from datetime import datetime
from ..config import WORKSPACE, AUTONOMOUS_TICK_SECONDS
from ..database import get_db
from .runner import PROCS, spawn_agent

logger = logging.getLogger("autonomous")


from ..database.repository import Database

CEO_TICK_INTERVAL = 6  # Run CEO agent every 6 ticks (60 seconds)

class AutonomousLoop:
    def __init__(self):
        self._task: asyncio.Task | None = None
        self._running = False
        self._tick_count = 0

    async def start(self):
        if self._running:
            return
        self._running = True
        self._task = asyncio.create_task(self._loop())
        db = get_db()
        await db.add_event("system", "Otonom dongu baslatildi", "info")

    async def stop(self):
        self._running = False
        if self._task:
            self._task.cancel()
            self._task = None
        db = get_db()
        await db.add_event("system", "Otonom dongu durduruldu", "info")

    async def _loop(self):
        while self._running:
            try:
                await self._tick()
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"Autonomous tick error: {e}")
                try:
                    db = get_db()
                    await db.add_event("system", f"Otonom dongu hatasi: {e}", "error")
                except Exception:
                    pass
            await asyncio.sleep(AUTONOMOUS_TICK_SECONDS)

        async def _tick(self):
        self._tick_count += 1
        db = get_db()

        # Periodically trigger CEO agent
        if self._tick_count % CEO_TICK_INTERVAL == 0:
            await self.trigger_ceo_agent(db)

        agents = await db.get_all_agents()

        for agent in agents:
            aid = agent["id"]
            # Skip CEO agent in the general task check, it has its own trigger
            if aid == "ceo":
                continue

            inbox = WORKSPACE / aid / "inbox"
            if not inbox.exists():
                continue

            tasks = sorted(inbox.glob("TASK-*.json"))
            if not tasks:
                continue

            # Agent idle and has tasks -> spawn
            if aid not in PROCS or not PROCS[aid].alive:
                try:
                    t = json.loads(tasks[0].read_text())
                    dept_id = agent.get("department_id")
                    await db.add_event(
                        aid,
                        f"Inbox'ta gorev bulundu: {t.get('title', '?')[:50]}",
                        "inbox_check",
                        department_id=dept_id,
                    )
                    await spawn_agent(aid, f"{t['title']}: {t.get('description', '')}")
                except Exception as e:
                    logger.error(f"Error spawning agent {aid} from inbox: {e}")

    async def trigger_ceo_agent(self, db: Database):
        """Triggers the CEO agent to perform a system overview and delegate tasks."""
        ceo_id = "ceo"
        if ceo_id in PROCS and PROCS[ceo_id].alive:
            logger.info("CEO agent is already running, skipping trigger.")
            return

        try:
            await db.add_event(
                ceo_id,
                "Periyodik sistem analizi ve görev delegasyonu başlatılıyor.",
                "ceo_trigger",
                department_id="management",
            )
            await spawn_agent(ceo_id, "Sistemin genel durumunu analiz et, gerekli görevleri oluştur ve delege et.")
        except Exception as e:
            logger.error(f"Error triggering CEO agent: {e}")

        self._tick_count += 1
        db = get_db()
        agents = await db.get_all_agents()

        for agent in agents:
            aid = agent["id"]
            inbox = WORKSPACE / aid / "inbox"
            if not inbox.exists():
                continue

            tasks = sorted(inbox.glob("TASK-*.json"))
            if not tasks:
                continue

            # Agent idle and has tasks -> spawn
            if aid not in PROCS or not PROCS[aid].alive:
                try:
                    t = json.loads(tasks[0].read_text())
                    dept_id = agent.get("department_id")
                    await db.add_event(
                        aid,
                        f"Inbox'ta gorev bulundu: {t.get('title', '?')[:50]}",
                        "inbox_check",
                        department_id=dept_id,
                    )
                    await spawn_agent(aid, f"{t['title']}: {t.get('description', '')}")
                except Exception as e:
                    try:
                        await db.add_event(aid, f"Inbox parse hatasi: {e}", "warning")
                    except Exception:
                        pass

    async def status(self) -> dict:
        db = get_db()
        total_events = await db.get_event_count()
        agents = await db.get_all_agents()
        return {
            "running": self._running,
            "tick_count": self._tick_count,
            "total_events": total_events,
            "agents_tracked": len(agents),
            "last_tick": datetime.now().isoformat() if self._tick_count > 0 else None,
        }


# Singleton
autonomous_loop = AutonomousLoop()
