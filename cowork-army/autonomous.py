"""
COWORK.ARMY — Autonomous Loop (asyncio task-based)
Periodically checks inboxes, triggers agents, logs events.
"""
import asyncio, json
import structlog
from datetime import datetime
from pathlib import Path
from database import get_db
from runner import spawn_agent, PROCS, cleanup_finished_agents

logger = structlog.get_logger()

WORKSPACE = Path(__file__).parent / "workspace"


class AutonomousLoop:
    def __init__(self):
        self.running = False
        self.tick_count = 0
        self._task: asyncio.Task | None = None
        self.last_tick = None

    async def start(self) -> dict:
        if self.running:
            return {"status": "already_running"}
        self.running = True
        self._task = asyncio.create_task(self._loop())
        db = get_db()
        await db.add_event("system", "Otonom döngü başlatıldı", "info")
        return {"status": "started"}

    async def stop(self) -> dict:
        self.running = False
        if self._task:
            self._task.cancel()
            self._task = None
        db = get_db()
        await db.add_event("system", "Otonom döngü durduruldu", "info")
        return {"status": "stopped"}

    async def _loop(self) -> None:
        while self.running:
            try:
                await self._tick()
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error("autonomous_loop_error", error=str(e), error_type=type(e).__name__)
                db = get_db()
                await db.add_event("autonomous", f"⚠️ Loop error: {type(e).__name__}: {e}", "warning")
            await asyncio.sleep(30)

    async def _tick(self) -> None:
        cleanup_finished_agents(ttl_seconds=300)
        db = get_db()
        self.tick_count += 1
        self.last_tick = datetime.now().isoformat()

        # Purge old events every 100 ticks
        if self.tick_count % 100 == 0:
            try:
                purged = await db.purge_old_events(days=7)
                if purged:
                    logger.info("events_purged", count=purged, tick=self.tick_count)
                    await db.add_event("system", f"Eski event temizlendi: {purged} kayıt", "info")
            except Exception as e:
                logger.error("event_purge_error", error=str(e))

        agents = await db.get_all_agents()

        for agent in agents:
            aid = agent["id"]
            inbox = WORKSPACE / aid / "inbox"
            if not inbox.exists(): continue

            tasks = list(inbox.glob("TASK-*.json"))
            if not tasks: continue

            # Agent idle and has tasks → spawn
            if aid not in PROCS or not PROCS[aid].alive:
                try:
                    t = json.loads(tasks[0].read_text())
                    await db.add_event(aid, f"Inbox'ta görev bulundu: {t.get('title', '?')[:50]}", "inbox_check")
                    await spawn_agent(aid, f"{t['title']}: {t.get('description', '')}")
                except Exception as e:
                    logger.error("autonomous_spawn_error", agent_id=aid, error=str(e))
                    try:
                        await db.add_event(aid, f"⚠️ Spawn error: {e}", "error")
                    except Exception as event_err:
                        logger.error("event_logging_failed", error=str(event_err))

    async def status(self) -> dict:
        db = get_db()
        event_count = await db.get_event_count()
        agents = await db.get_all_agents()
        return {
            "running": self.running,
            "tick_count": self.tick_count,
            "total_events": event_count,
            "agents_tracked": len(agents),
            "last_tick": self.last_tick,
        }


autonomous = AutonomousLoop()
