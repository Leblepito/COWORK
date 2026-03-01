"""
COWORK.ARMY — Agent Runner (Claude API lifecycle)
spawn → read workspace → Claude API (with tool_use) → write output → done/error

DB calls from threads use _sync_db() to bridge async→sync via the main event loop.
"""
import os, json, asyncio, threading
from pathlib import Path
from datetime import datetime
from anthropic import Anthropic
from database import get_db
from database.connection import get_event_loop
from tools import read_file, write_file, list_dir, search_files, run_command

MODEL = "claude-sonnet-4-20250514"
MAX_TOKENS = 4096
MAX_TOOL_ROUNDS = 10
WORKSPACE = Path(__file__).parent / "workspace"

# Claude API tool definitions (proper schema format)
CLAUDE_TOOLS = [
    {
        "name": "read_file",
        "description": "Read a file from agent workspace or project directory.",
        "input_schema": {
            "type": "object",
            "properties": {
                "path": {"type": "string", "description": "File path (relative to workspace or absolute)"}
            },
            "required": ["path"]
        }
    },
    {
        "name": "write_file",
        "description": "Write content to a file in agent's workspace.",
        "input_schema": {
            "type": "object",
            "properties": {
                "path": {"type": "string", "description": "File path relative to workspace"},
                "content": {"type": "string", "description": "File content to write"}
            },
            "required": ["path", "content"]
        }
    },
    {
        "name": "list_dir",
        "description": "List files and directories in a directory.",
        "input_schema": {
            "type": "object",
            "properties": {
                "path": {"type": "string", "description": "Directory path (empty string for workspace root)"}
            },
            "required": []
        }
    },
    {
        "name": "search_files",
        "description": "Search for files matching a glob pattern.",
        "input_schema": {
            "type": "object",
            "properties": {
                "pattern": {"type": "string", "description": "Glob pattern like *.py or *.md"},
                "directory": {"type": "string", "description": "Search directory (empty for workspace root)"}
            },
            "required": ["pattern"]
        }
    },
    {
        "name": "run_command",
        "description": "Run a shell command (limited to safe commands: ls, cat, head, tail, grep, find, python3, node, npm, git status/log/diff).",
        "input_schema": {
            "type": "object",
            "properties": {
                "command": {"type": "string", "description": "Shell command to run"},
                "cwd": {"type": "string", "description": "Working directory (empty for workspace root)"}
            },
            "required": ["command"]
        }
    },
]


def _sync_db(coro):
    """Run an async DB coroutine from a sync thread context."""
    future = asyncio.run_coroutine_threadsafe(coro, get_event_loop())
    return future.result(timeout=30)


class AgentProc:
    __slots__ = ("agent_id", "status", "lines", "started_at", "thread", "task_text")
    def __init__(self, agent_id):
        self.agent_id = agent_id
        self.status = "idle"
        self.lines: list[str] = []
        self.started_at = ""
        self.thread: threading.Thread | None = None
        self.task_text = ""
    def log(self, msg):
        ts = datetime.now().strftime('%H:%M:%S')
        self.lines.append(f"[{ts}] {msg}")
        self.lines = self.lines[-200:]
    @property
    def alive(self):
        return self.thread is not None and self.thread.is_alive()
    def to_dict(self):
        return {"agent_id": self.agent_id, "status": self.status, "lines": self.lines[-50:],
                "alive": self.alive, "pid": 0, "started_at": self.started_at}


PROCS: dict[str, AgentProc] = {}


def _get_api_key() -> str:
    k = os.environ.get("ANTHROPIC_API_KEY", "")
    if not k:
        env = Path(__file__).parent / ".env"
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
        if f.exists(): parts.append(f"=== {name} ===\n{f.read_text()[:2000]}")
    inbox = ws / "inbox"
    if inbox.exists():
        files = list(inbox.iterdir())
        if files:
            parts.append(f"=== Inbox ({len(files)} dosya) ===")
            for f in files[:10]:
                if f.suffix == ".json":
                    try:
                        d = json.loads(f.read_text())
                        parts.append(f"  📋 {d.get('title','?')}: {d.get('description','')[:150]}")
                    except: parts.append(f"  📄 {f.name}")
                else: parts.append(f"  📄 {f.name} ({f.stat().st_size}b)")
    return "\n".join(parts)


def _execute_tool(agent_id: str, tool_name: str, tool_input: dict) -> str:
    """Execute a tool call and return the result as a string."""
    try:
        if tool_name == "read_file":
            result = read_file(agent_id, tool_input["path"])
        elif tool_name == "write_file":
            result = write_file(agent_id, tool_input["path"], tool_input["content"])
        elif tool_name == "list_dir":
            result = list_dir(agent_id, tool_input.get("path", ""))
        elif tool_name == "search_files":
            result = search_files(agent_id, tool_input["pattern"], tool_input.get("directory", ""))
        elif tool_name == "run_command":
            result = run_command(agent_id, tool_input["command"], tool_input.get("cwd", ""))
        else:
            result = {"error": f"Unknown tool: {tool_name}"}
        return json.dumps(result, ensure_ascii=False)
    except Exception as e:
        return json.dumps({"error": str(e)})


def _run(proc: AgentProc, task: str):
    """Run agent in a thread with tool_use support. Uses _sync_db() for async DB calls."""
    db = get_db()
    agent = _sync_db(db.get_agent(proc.agent_id))
    if not agent:
        proc.status = "error"; proc.log("Agent not found"); return

    proc.status = "thinking"
    proc.log(f"Claude API baglaniyor ({MODEL})")

    key = _get_api_key()
    if not key:
        proc.status = "error"
        proc.log("ANTHROPIC_API_KEY bulunamadi!")
        proc.log("Dashboard'dan API Key girin veya .env dosyasina ekleyin")
        return

    proc.log("Workspace okunuyor...")
    proc.status = "searching"
    ctx = _workspace_context(proc.agent_id)

    sys_prompt = agent["system_prompt"] + """

Sana verilen tool'lari kullanarak gorevini tamamla.
Dosya okuma, yazma, dizin listeleme, arama ve komut calistirma yapabilirsin.
Isini bitirdiginde sonucu ozetle."""

    user_msg = f"Gorevin:\n{task}\n\nWorkspace durumun:\n{ctx}\n\nGorevi yap."
    proc.log(f"Gorev: {task[:80]}")
    proc.log("API cagrisi...")
    proc.status = "working"

    try:
        client = Anthropic(api_key=key)
        messages = [{"role": "user", "content": user_msg}]
        collected_text = ""

        for round_num in range(MAX_TOOL_ROUNDS):
            if proc.status == "done":
                break  # killed externally

            response = client.messages.create(
                model=MODEL, max_tokens=MAX_TOKENS, system=sys_prompt,
                messages=messages, tools=CLAUDE_TOOLS,
            )

            # Process response content blocks
            assistant_content = []
            tool_calls = []

            for block in response.content:
                if block.type == "text":
                    collected_text += block.text
                    preview = block.text[:80].replace('\n', ' ')
                    proc.log(f"  {preview}")
                    assistant_content.append(block)
                elif block.type == "tool_use":
                    tool_calls.append(block)
                    assistant_content.append(block)
                    proc.log(f"  Tool: {block.name}({json.dumps(block.input, ensure_ascii=False)[:60]})")

            # Add assistant message
            messages.append({"role": "assistant", "content": assistant_content})

            # If no tool calls, we're done
            if not tool_calls:
                proc.log(f"Yanit: {len(collected_text)} karakter")
                break

            # Execute tool calls and add results
            proc.status = "coding"
            tool_results = []
            for tc in tool_calls:
                proc.log(f"  Tool calistiriliyor: {tc.name}")
                result_str = _execute_tool(proc.agent_id, tc.name, tc.input)
                tool_results.append({
                    "type": "tool_result",
                    "tool_use_id": tc.id,
                    "content": result_str,
                })
                # Log result preview
                preview = result_str[:80].replace('\n', ' ')
                proc.log(f"    Sonuc: {preview}")

            messages.append({"role": "user", "content": tool_results})
            proc.status = "working"
            proc.log(f"  Round {round_num + 1}/{MAX_TOOL_ROUNDS} tamamlandi")

        proc.status = "coding"
        proc.log("Cikti kaydediliyor...")
        _save_output(proc.agent_id, task, collected_text, proc)
        proc.status = "done"
        proc.log("Gorev tamamlandi!")
        _sync_db(db.add_event(proc.agent_id, f"Gorev tamamlandi: {task[:50]}", "info"))
    except Exception as e:
        proc.status = "error"
        proc.log(f"Hata: {e}")
        _sync_db(db.add_event(proc.agent_id, f"Hata: {e}", "warning"))


def _save_output(agent_id: str, task: str, response: str, proc: AgentProc):
    ws = WORKSPACE / agent_id / "output"
    ws.mkdir(parents=True, exist_ok=True)
    ts = datetime.now().strftime('%Y%m%d_%H%M%S')
    try:
        j0 = response.find('{'); j1 = response.rfind('}') + 1
        if j0 >= 0 and j1 > j0:
            result = json.loads(response[j0:j1])
            for fi in result.get("output_files", []):
                fn = fi.get("filename", f"out_{ts}.md")
                (ws / fn).write_text(fi.get("content", ""))
                proc.log(f"  💾 {fn}")
            (ws / f"result_{ts}.json").write_text(json.dumps(result, indent=2, ensure_ascii=False))
            proc.log(f"  💾 result_{ts}.json")
        else: raise ValueError
    except:
        (ws / f"response_{ts}.md").write_text(f"# {task}\n\n{response}")
        proc.log(f"  💾 response_{ts}.md")


# ── Public API ──

async def spawn_agent(agent_id: str, task: str = "") -> dict:
    db = get_db()
    agent = await db.get_agent(agent_id)
    if not agent: return {"error": f"Unknown agent: {agent_id}"}
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
                except: pass
    if not task:
        task = f"{agent['desc']} — Genel durum kontrolü, inbox tara, rapor üret."

    proc = AgentProc(agent_id)
    proc.started_at = datetime.now().isoformat()
    proc.task_text = task
    proc.log(f"═══ {agent['icon']} {agent['name']} BAŞLATILIYOR ═══")
    proc.log(f"📂 workspace/{agent_id}/")
    proc.log(f"🎯 {agent['domain']}")
    t = threading.Thread(target=_run, args=(proc, task), daemon=True)
    proc.thread = t
    PROCS[agent_id] = proc
    t.start()
    return proc.to_dict()


def kill_agent(agent_id: str) -> dict:
    if agent_id not in PROCS: return {"error": "Not running"}
    PROCS[agent_id].status = "done"
    PROCS[agent_id].log("⏹ Durduruldu")
    return {"status": "killed", "agent_id": agent_id}


async def get_statuses() -> dict:
    db = get_db()
    agents = await db.get_all_agents()
    agent_ids = [a["id"] for a in agents]
    result = {}
    for aid in agent_ids:
        if aid in PROCS: result[aid] = PROCS[aid].to_dict()
        else: result[aid] = {"agent_id": aid, "status": "idle", "lines": [], "alive": False, "pid": 0, "started_at": ""}
    return result


def get_output(agent_id: str) -> list[str]:
    return PROCS[agent_id].lines if agent_id in PROCS else []
