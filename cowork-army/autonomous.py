"""
COWORK.ARMY — Autonomous Loop (asyncio task-based)
Periodically checks inboxes, triggers agents, logs events.
"""
import asyncio, json
from datetime import datetime
from pathlib import Path
from database import get_db
from runner import spawn_agent, PROCS

WORKSPACE = Path(__file__).parent / "workspace"


class AutonomousLoop:
    def __init__(self):
        self.running = False
        self.tick_count = 0
        self._task: asyncio.Task | None = None
        self.last_tick = None

    async def start(self):
        if self.running: return
        self.running = True
        self._task = asyncio.create_task(self._loop())
        db = get_db()
        await db.add_event("system", "Otonom döngü başlatıldı", "info")

    async def stop(self):
        self.running = False
        if self._task:
            self._task.cancel()
            self._task = None
        db = get_db()
        await db.add_event("system", "Otonom döngü durduruldu", "info")

    async def _loop(self):
        while self.running:
            try:
                await self._tick()
            except asyncio.CancelledError:
                break
            except Exception as e:
                db = get_db()
                await db.add_event("system", f"Tick hatası: {e}", "warning")
            await asyncio.sleep(30)

    async def _tick(self):
        db = get_db()
        self.tick_count += 1
        self.last_tick = datetime.now().isoformat()
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
                    try:
                        await db.add_event(aid, f"Inbox parse hatası: {e}", "warning")
                    except:
                        pass

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
