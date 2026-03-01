"""
COWORK.ARMY v7.0 — Agent Runner (Claude API lifecycle)
spawn → read workspace → Claude API → write output → done/error

DB calls from threads use _sync_db() to bridge async→sync via the main event loop.
"""
import os
import json
import asyncio
import threading
from pathlib import Path
from datetime import datetime
from anthropic import Anthropic
from ..database import get_db
from ..database.connection import get_event_loop
from ..config import WORKSPACE, CLAUDE_MODEL, AGENT_MAX_TOKENS, AGENT_OUTPUT_MAX_LINES


def _sync_db(coro):
    """Run an async DB coroutine from a sync thread context."""
    future = asyncio.run_coroutine_threadsafe(coro, get_event_loop())
    return future.result(timeout=30)


class AgentProc:
    __slots__ = ("agent_id", "status", "lines", "started_at", "thread", "task_text")

    def __init__(self, agent_id: str):
        self.agent_id = agent_id
        self.status = "idle"
        self.lines: list[str] = []
        self.started_at = ""
        self.thread: threading.Thread | None = None
        self.task_text = ""

    def log(self, msg: str):
        ts = datetime.now().strftime("%H:%M:%S")
        self.lines.append(f"[{ts}] {msg}")
        self.lines = self.lines[-AGENT_OUTPUT_MAX_LINES:]

    @property
    def alive(self):
        return self.thread is not None and self.thread.is_alive()

    def to_dict(self):
        return {
            "agent_id": self.agent_id,
            "status": self.status,
            "lines": self.lines[-50:],
            "alive": self.alive,
            "pid": 0,
            "started_at": self.started_at,
        }


PROCS: dict[str, AgentProc] = {}


def _get_api_key() -> str:
    k = os.environ.get("ANTHROPIC_API_KEY", "")
    if not k:
        env = Path(__file__).parent.parent / ".env"
        if env.exists():
            for line in env.read_text().splitlines():
                if line.startswith("ANTHROPIC_API_KEY="):
                    k = line.split("=", 1)[1].strip().strip('"')
    return k


def _workspace_context(agent_id: str) -> str:
    ws = WORKSPACE / agent_id
    parts = []
    for name in ["README.md", "gorevler.md"]:
        f = ws / name
        if f.exists():
            parts.append(f"=== {name} ===\n{f.read_text()[:2000]}")
    inbox = ws / "inbox"
    if inbox.exists():
        files = list(inbox.iterdir())
        if files:
            parts.append(f"=== Inbox ({len(files)} dosya) ===")
            for f in files[:10]:
                if f.suffix == ".json":
                    try:
                        d = json.loads(f.read_text())
                        parts.append(f"  {d.get('title', '?')}: {d.get('description', '')[:150]}")
                    except Exception:
                        parts.append(f"  {f.name}")
                else:
                    parts.append(f"  {f.name} ({f.stat().st_size}b)")
    return "\n".join(parts)


def _run(proc: AgentProc, task: str):
    """Run agent in a thread. Uses _sync_db() for async DB calls."""
    db = get_db()
    agent = _sync_db(db.get_agent(proc.agent_id))
    if not agent:
        proc.status = "error"
        proc.log("Agent not found")
        return

    proc.status = "thinking"
    proc.log(f"Claude API baglaniyor ({CLAUDE_MODEL})")

    key = _get_api_key()
    if not key:
        proc.status = "error"
        proc.log("ANTHROPIC_API_KEY bulunamadi!")
        return

    proc.log("Workspace okunuyor...")
    proc.status = "searching"
    ctx = _workspace_context(proc.agent_id)

    dept_id = agent.get("department_id", "")
    sys_prompt = agent["system_prompt"] + """

CIKTI FORMATI (JSON):
{"status":"completed","summary":"Kisa ozet","actions_taken":["Yapilan 1"],"output_files":[{"filename":"x.md","content":"..."}],"notes":"","next_steps":["Sonraki adim"]}"""

    user_msg = f"Gorevin:\n{task}\n\nWorkspace durumun:\n{ctx}\n\nGorevi yap ve JSON formatinda yanitla."
    proc.log(f"Gorev: {task[:80]}")
    proc.log("API cagrisi...")
    proc.status = "working"

    try:
        client = Anthropic(api_key=key)
        collected = ""
        with client.messages.stream(
            model=CLAUDE_MODEL, max_tokens=AGENT_MAX_TOKENS,
            system=sys_prompt, messages=[{"role": "user", "content": user_msg}],
        ) as stream:
            proc.log("Stream aliniyor...")
            for text in stream.text_stream:
                collected += text
                if len(collected) % 200 < len(text):
                    proc.log(f"  ...{collected[-60:].replace(chr(10), ' ')}")
        proc.log(f"Yanit: {len(collected)} karakter")
        proc.status = "coding"
        proc.log("Cikti kaydediliyor...")
        _save_output(proc.agent_id, task, collected, proc)
        proc.status = "done"
        proc.log("Gorev tamamlandi!")
        _sync_db(db.add_event(
            proc.agent_id, f"Gorev tamamlandi: {task[:50]}", "info",
            department_id=dept_id if dept_id else None,
        ))
    except Exception as e:
        proc.status = "error"
        proc.log(f"Hata: {e}")
        try:
            _sync_db(db.add_event(
                proc.agent_id, f"Hata: {e}", "warning",
                department_id=dept_id if dept_id else None,
            ))
        except Exception:
            pass


def _save_output(agent_id: str, task: str, response: str, proc: AgentProc):
    ws = WORKSPACE / agent_id / "output"
    ws.mkdir(parents=True, exist_ok=True)
    ts = datetime.now().strftime("%Y%m%d_%H%M%S")
    try:
        j0 = response.find("{")
        j1 = response.rfind("}") + 1
        if j0 >= 0 and j1 > j0:
            result = json.loads(response[j0:j1])
            for fi in result.get("output_files", []):
                fn = fi.get("filename", f"out_{ts}.md")
                (ws / fn).write_text(fi.get("content", ""))
                proc.log(f"  {fn}")
            (ws / f"result_{ts}.json").write_text(
                json.dumps(result, indent=2, ensure_ascii=False)
            )
            proc.log(f"  result_{ts}.json")
        else:
            raise ValueError("No JSON in response")
    except Exception:
        (ws / f"response_{ts}.md").write_text(f"# {task}\n\n{response}")
        proc.log(f"  response_{ts}.md")


# ── Public API ──


async def spawn_agent(agent_id: str, task: str = "") -> dict:
    db = get_db()
    agent = await db.get_agent(agent_id)
    if not agent:
        return {"error": f"Unknown agent: {agent_id}"}
    if agent_id in PROCS and PROCS[agent_id].alive:
        return {"error": "Already running", **PROCS[agent_id].to_dict()}

    if not task:
        inbox = WORKSPACE / agent_id / "inbox"
        if inbox.exists():
            for f in sorted(inbox.glob("TASK-*.json")):
                try:
                    d = json.loads(f.read_text())
                    task = f"{d['title']}: {d.get('description', '')}"
                    break
                except Exception:
                    pass
    if not task:
        task = f"{agent.get('desc', agent['name'])} — Genel durum kontrolu, inbox tara, rapor uret."

    proc = AgentProc(agent_id)
    proc.started_at = datetime.now().isoformat()
    proc.task_text = task
    proc.log(f"=== {agent.get('icon', '')} {agent['name']} BASLATILIYOR ===")
    proc.log(f"workspace/{agent_id}/")
    proc.log(f"{agent.get('domain', '')}")
    t = threading.Thread(target=_run, args=(proc, task), daemon=True)
    proc.thread = t
    PROCS[agent_id] = proc
    t.start()
    return proc.to_dict()


def kill_agent(agent_id: str) -> dict:
    if agent_id not in PROCS:
        return {"error": "Not running"}
    PROCS[agent_id].status = "done"
    PROCS[agent_id].log("Durduruldu")
    return {"status": "killed", "agent_id": agent_id}


async def get_statuses() -> dict:
    db = get_db()
    agents = await db.get_all_agents()
    agent_ids = [a["id"] for a in agents]
    result = {}
    for aid in agent_ids:
        if aid in PROCS:
            result[aid] = PROCS[aid].to_dict()
        else:
            result[aid] = {
                "agent_id": aid, "status": "idle", "lines": [],
                "alive": False, "pid": 0, "started_at": "",
            }
    return result


def get_output(agent_id: str) -> list[str]:
    return PROCS[agent_id].lines if agent_id in PROCS else []
