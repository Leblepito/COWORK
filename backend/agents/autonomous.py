"""
COWORK.ARMY v7.1 — Autonomous Loop
Periodically checks agent inboxes for pending tasks and spawns idle agents.
CEO agent runs every hour via generate_continuous_tasks (Gemini brainstorming).
"""
import asyncio
import json
import logging
from datetime import datetime
from ..config import WORKSPACE, AUTONOMOUS_TICK_SECONDS
from ..database import get_db
from .runner import PROCS, spawn_agent
from ..departments.ceo.tools_v2 import generate_continuous_tasks

logger = logging.getLogger("autonomous")

from ..database.repository import Database

CEO_TICK_INTERVAL = 120  # 120 ticks x 30s = 3600s = 1 hour

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
                    try:
                        await db.add_event(aid, f"Inbox parse hatasi: {e}", "warning")
                    except Exception:
                        pass

    async def trigger_ceo_agent(self, db: Database):
        """
        CEO agent tetikleyici:
        1. generate_continuous_tasks ile Gemini brainstorming + gorev delegasyonu
        2. CEO agent spawn edilir (LLM seviyesinde stratejik analiz)
        """
        ceo_id = "ceo"
        if ceo_id in PROCS and PROCS[ceo_id].alive:
            logger.info("CEO agent is already running, skipping trigger.")
            return

        try:
            # Step 1: Gemini brainstorming + cargo delegation
            logger.info("CEO: generate_continuous_tasks basladi")
            report = await generate_continuous_tasks(db)
            total = report.get("total_improvements", 0)
            delegated = report.get("delegated_count", 0)
            logger.info(f"CEO: {total} oneri uretildi, {delegated} gorev delege edildi")

            # Step 2: CEO agent spawn (LLM analizi)
            await db.add_event(
                ceo_id,
                f"CEO saatlik analiz: {total} oneri, {delegated} gorev delege edildi.",
                "ceo_trigger",
                department_id="management",
            )
            await spawn_agent(
                ceo_id,
                (
                    f"Saatlik stratejik analiz tamamlandi. "
                    f"Bu saat {total} iyilestirme onerisi uretildi ve "
                    f"{delegated} gorev delege edildi. "
                    "Simdi her departmanin durumunu gozden gecir, kritik riskleri tespit et ve "
                    "gerekirse ek gorevler olustur."
                ),
            )
        except Exception as e:
            logger.error(f"Error triggering CEO agent: {e}")

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
