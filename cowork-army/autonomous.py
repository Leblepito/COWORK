"""
COWORK.ARMY — Autonomous Loop (asyncio task-based)
Periodically checks inboxes, triggers agents, logs events.
Includes Debugger Agent that monitors and diagnoses errors.
"""
import asyncio, json
from datetime import datetime, timedelta
from pathlib import Path
from database import get_db
from runner import spawn_agent, PROCS, CREDIT_ERROR

WORKSPACE = Path(__file__).parent / "workspace"

# Debugger checks every 3 ticks (~90 seconds)
DEBUGGER_CHECK_INTERVAL = 3
# Max errors before debugger auto-spawns
DEBUGGER_ERROR_THRESHOLD = 1


class AutonomousLoop:
    def __init__(self):
        self.running = False
        self.tick_count = 0
        self._task: asyncio.Task | None = None
        self.last_tick = None
        self._last_debugger_tick = 0
        self._recent_errors: list[dict] = []

    async def start(self):
        if self.running: return
        self.running = True
        self._recent_errors = []
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

        # Skip spawning if API credit error is active
        if CREDIT_ERROR["active"]:
            if self.tick_count % 10 == 0:  # Remind every ~5 minutes
                await db.add_event("system",
                    "⚠ API kredi yetersiz — agent spawn duraklatildi. Dashboard Settings'den API key kontrol edin veya kredi yukleyin.",
                    "warning")
            return

        agents = await db.get_all_agents()

        for agent in agents:
            aid = agent["id"]
            if aid == "debugger":
                continue  # debugger is managed separately

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

        # ── Collect errors from running agents ──
        self._collect_agent_errors()

        # ── Debugger check (every N ticks) ──
        if self.tick_count - self._last_debugger_tick >= DEBUGGER_CHECK_INTERVAL:
            await self._run_debugger_check(db)
            self._last_debugger_tick = self.tick_count

    def _collect_agent_errors(self):
        """Scan PROCS for agents that ended in error status."""
        for aid, proc in PROCS.items():
            if aid == "debugger":
                continue
            if proc.status == "error" and not proc.alive:
                # Check if we already recorded this error
                error_id = f"{aid}_{proc.started_at}"
                if not any(e.get("id") == error_id for e in self._recent_errors):
                    error_lines = [l for l in proc.lines if "Hata" in l or "error" in l.lower() or "bulunamadi" in l]
                    self._recent_errors.append({
                        "id": error_id,
                        "agent_id": aid,
                        "task": proc.task_text[:200],
                        "error_lines": error_lines[-5:],
                        "all_lines": proc.lines[-20:],
                        "timestamp": datetime.now().isoformat(),
                    })
                    # Keep only last 20 errors
                    self._recent_errors = self._recent_errors[-20:]

    async def _run_debugger_check(self, db):
        """Check for recent errors and spawn the debugger if needed."""
        if not self._recent_errors:
            return

        # Don't spawn if debugger is already running
        if "debugger" in PROCS and PROCS["debugger"].alive:
            return

        # Filter errors not yet debugged (from last 5 minutes)
        cutoff = (datetime.now() - timedelta(minutes=5)).isoformat()
        fresh_errors = [e for e in self._recent_errors if e["timestamp"] > cutoff]

        if len(fresh_errors) < DEBUGGER_ERROR_THRESHOLD:
            return

        # Build debug task with error details
        error_summary = []
        for err in fresh_errors[-5:]:  # Last 5 errors max
            error_summary.append(
                f"Agent: {err['agent_id']}\n"
                f"Task: {err['task'][:100]}\n"
                f"Errors: {chr(10).join(err['error_lines'][-3:])}\n"
                f"---"
            )

        task_text = (
            f"🔧 DEBUGGER GÖREVI — {len(fresh_errors)} hata tespit edildi\n\n"
            f"Son hatalar:\n{''.join(error_summary)}\n\n"
            f"Görevlerin:\n"
            f"1. Her hatayı analiz et ve kök nedeni belirle\n"
            f"2. Hata kategorisini belirle (API_KEY_MISSING, RATE_LIMIT, INVALID_PARAMS, NETWORK_ERROR, LLM_ERROR)\n"
            f"3. Her hata için düzeltme önerisi yaz\n"
            f"4. Sonuçları workspace/debugger/output/ altına rapor olarak kaydet\n"
            f"5. Kritik hatalar varsa uyarı ver"
        )

        await db.add_event("debugger", f"🔧 {len(fresh_errors)} hata analiz ediliyor", "info")
        try:
            await spawn_agent("debugger", task_text)
            await db.add_event("debugger", "Debugger agent başlatıldı", "info")
        except Exception as e:
            await db.add_event("debugger", f"Debugger başlatılamadı: {e}", "warning")

        # Mark errors as processed
        for err in fresh_errors:
            err["timestamp"] = "processed"

    async def status(self) -> dict:
        db = get_db()
        event_count = await db.get_event_count()
        agents = await db.get_all_agents()
        fresh_errors = [e for e in self._recent_errors
                        if e.get("timestamp", "") != "processed"
                        and e.get("timestamp", "") > (datetime.now() - timedelta(minutes=5)).isoformat()]
        return {
            "running": self.running,
            "tick_count": self.tick_count,
            "total_events": event_count,
            "agents_tracked": len(agents),
            "last_tick": self.last_tick,
            "debugger_errors": len(fresh_errors),
            "credit_error": CREDIT_ERROR["active"],
            "credit_error_message": CREDIT_ERROR.get("message", ""),
        }


autonomous = AutonomousLoop()
