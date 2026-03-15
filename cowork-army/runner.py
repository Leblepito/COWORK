"""
COWORK.ARMY — Agent Runner (Multi-LLM lifecycle)
spawn → read workspace → LLM API (with tool_use) → write output → done/error
Supports: Anthropic (Claude), Google (Gemini)

DB calls from threads use _sync_db() to bridge async→sync via the main event loop.
"""
import os, json, asyncio, threading
import collections
import time as _time
import structlog
from pathlib import Path
from datetime import datetime
from database import get_db
from database.connection import get_event_loop
from tools import read_file, write_file, list_dir, search_files, run_command
from llm_providers import get_provider, TOOL_DEFS
from exceptions import NotFoundError
from tenacity import retry, stop_after_attempt, wait_exponential, retry_if_exception_type
from cache import app_cache
from cost_tracking import calculate_cost
from sse import broadcaster

logger = structlog.get_logger()

MAX_TOOL_ROUNDS = 10
WORKSPACE = Path(__file__).parent / "workspace"


def _sync_db(coro) -> object:
    """Run an async DB coroutine from a sync thread context."""
    future = asyncio.run_coroutine_threadsafe(coro, get_event_loop())
    return future.result(timeout=30)


AGENT_TIMEOUT_SECONDS = 300  # 5 minutes


class AgentProc:
    __slots__ = ("agent_id", "status", "lines", "started_at", "thread", "task_text", "_finished_at")
    def __init__(self, agent_id):
        self.agent_id = agent_id
        self.status = "idle"
        self.lines: collections.deque = collections.deque(maxlen=200)
        self.started_at = ""
        self.thread: threading.Thread | None = None
        self.task_text = ""
        self._finished_at: float | None = None
    def log(self, msg):
        ts = datetime.now().strftime('%H:%M:%S')
        self.lines.append(f"[{ts}] {msg}")
    @property
    def alive(self):
        return self.thread is not None and self.thread.is_alive()
    def to_dict(self):
        return {"agent_id": self.agent_id, "status": self.status, "lines": list(self.lines)[-50:],
                "alive": self.alive, "pid": 0, "started_at": self.started_at}


PROCS: dict[str, AgentProc] = {}


@retry(
    stop=stop_after_attempt(3),
    wait=wait_exponential(multiplier=1, min=1, max=8),
    retry=retry_if_exception_type((ConnectionError, TimeoutError, OSError)),
    reraise=True,
)
def _llm_chat_with_retry(provider, sys_prompt, messages, tool_defs):
    return provider.chat(sys_prompt, messages, tool_defs)


def cleanup_finished_agents(ttl_seconds: int = 300) -> None:
    """Remove finished agents from PROCS after TTL expires."""
    now = _time.time()
    to_remove = []
    for aid, proc in PROCS.items():
        if not proc.alive and proc.status in ("done", "error"):
            finished = getattr(proc, "_finished_at", None)
            if finished and (now - finished) > ttl_seconds:
                to_remove.append(aid)
    for aid in to_remove:
        del PROCS[aid]
        logger.info("agent_cleaned_up", agent_id=aid)


def _read_env_value(key: str) -> str:
    """Read a value from environment or .env file."""
    v = os.environ.get(key, "")
    if not v:
        env = Path(__file__).parent / ".env"
        if env.exists():
            for line in env.read_text().splitlines():
                if line.startswith(f"{key}="):
                    v = line.split("=", 1)[1].strip().strip('"')
    return v


def _get_llm_config() -> tuple[str, str, str]:
    """Return (provider_name, api_key, model) from env."""
    provider = _read_env_value("LLM_PROVIDER") or "anthropic"
    if provider == "gemini":
        api_key = _read_env_value("GEMINI_API_KEY")
        model = _read_env_value("GEMINI_MODEL") or ""
    else:
        api_key = _read_env_value("ANTHROPIC_API_KEY")
        model = _read_env_value("ANTHROPIC_MODEL") or ""
    return provider, api_key, model


def _workspace_context(agent_id: str) -> str:
    cache_key = f"workspace_ctx:{agent_id}"
    cached = app_cache.get(cache_key)
    if cached is not None:
        return cached

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
                    except (json.JSONDecodeError, OSError) as e:
                        logger.warning("workspace_file_read_error", file=str(f), error=str(e))
                        parts.append(f"  📄 {f.name}")
                else: parts.append(f"  📄 {f.name} ({f.stat().st_size}b)")
    result = "\n".join(parts)
    app_cache.set(cache_key, result, ttl=60)
    return result


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


def _run(proc: AgentProc, task: str) -> None:
    """Run agent in a thread with tool_use support. Uses _sync_db() for async DB calls."""
    db = get_db()
    agent = _sync_db(db.get_agent(proc.agent_id))
    if not agent:
        proc.status = "error"
        proc._finished_at = _time.time()
        proc.log("Agent not found")
        return

    proc.status = "thinking"

    provider_name, api_key, model = _get_llm_config()
    provider_label = "Gemini" if provider_name == "gemini" else "Claude"
    proc.log(f"{provider_label} API baglaniyor ({model or 'default'})")

    if not api_key:
        key_name = "GEMINI_API_KEY" if provider_name == "gemini" else "ANTHROPIC_API_KEY"
        proc.status = "error"
        proc._finished_at = _time.time()
        proc.log(f"{key_name} bulunamadi!")
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
        provider = get_provider(provider_name, api_key, model)
        messages = [{"role": "user", "content": user_msg}]
        collected_text = ""

        for round_num in range(MAX_TOOL_ROUNDS):
            if proc.status == "done":
                break  # killed externally

            text, tool_calls = _llm_chat_with_retry(provider, sys_prompt, messages, TOOL_DEFS)

            # Record cost after each LLM call
            try:
                usage = provider.get_last_usage() if hasattr(provider, "get_last_usage") else {}
                in_tok = int(usage.get("input_tokens", 0) or 0)
                out_tok = int(usage.get("output_tokens", 0) or 0)
                if in_tok > 0 or out_tok > 0:
                    model_name = os.environ.get("LLM_MODEL",
                        os.environ.get("ANTHROPIC_MODEL",
                        os.environ.get("GEMINI_MODEL", "claude-sonnet-4-20250514")))
                    cost = calculate_cost(model_name, in_tok, out_tok)
                    _sync_db(db.record_llm_usage(
                        agent_id=proc.agent_id,
                        provider=os.environ.get("LLM_PROVIDER", "anthropic"),
                        model=model_name,
                        input_tokens=in_tok,
                        output_tokens=out_tok,
                        cost_usd=cost,
                    ))
            except Exception as e:
                logger.warning("cost_tracking_failed", error=str(e))

            # Budget check after cost recording
            try:
                from cost_tracking import get_budget_status
                daily = _sync_db(db.get_daily_spend())
                budget = get_budget_status(daily)
                if budget["warning"]:
                    asyncio.run_coroutine_threadsafe(
                        broadcaster.broadcast("budget_warning", budget), get_event_loop()
                    )
            except Exception as e:
                logger.warning("budget_check_failed", error=str(e))

            if text:
                collected_text += text
                preview = text[:80].replace('\n', ' ')
                proc.log(f"  {preview}")

            for tc in tool_calls:
                proc.log(f"  Tool: {tc.name}({json.dumps(tc.input, ensure_ascii=False)[:60]})")

            # Add assistant message to history
            messages.append(provider.format_assistant_message(text, tool_calls))

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
                tool_results.append(provider.format_tool_result(tc, result_str))
                preview = result_str[:80].replace('\n', ' ')
                proc.log(f"    Sonuc: {preview}")

            messages.append({"role": "user", "content": tool_results})
            proc.status = "working"
            proc.log(f"  Round {round_num + 1}/{MAX_TOOL_ROUNDS} tamamlandi")

        proc.status = "coding"
        proc.log("Cikti kaydediliyor...")
        _save_output(proc.agent_id, task, collected_text, proc)
        proc.status = "done"
        proc._finished_at = _time.time()
        proc.log("Gorev tamamlandi!")
        _sync_db(db.add_event(proc.agent_id, f"Gorev tamamlandi: {task[:50]}", "info"))
    except Exception as e:
        proc.status = "error"
        proc._finished_at = _time.time()
        proc.log(f"❌ Error: {type(e).__name__}: {e}")
        logger.error("agent_run_error", agent_id=proc.agent_id, error=str(e), error_type=type(e).__name__)
        _sync_db(db.add_event(proc.agent_id, f"Hata: {e}", "warning"))


def _save_output(agent_id: str, task: str, response: str, proc: AgentProc) -> None:
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
    except (json.JSONDecodeError, KeyError, ValueError) as e:
        logger.warning("output_parse_fallback", agent_id=agent_id, error=str(e))
        (ws / f"response_{ts}.md").write_text(f"# {task}\n\n{response}")
        proc.log(f"  💾 response_{ts}.md")


# ── Public API ──

async def spawn_agent(agent_id: str, task: str = "") -> dict:
    db = get_db()
    agent = await db.get_agent(agent_id)
    if not agent:
        raise NotFoundError("agent", agent_id)
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
                except (json.JSONDecodeError, KeyError, OSError) as e:
                    logger.warning("inbox_task_parse_error", file=str(f), error=str(e))
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

    async def _timeout_kill():
        await asyncio.sleep(AGENT_TIMEOUT_SECONDS)
        if proc.alive:
            proc.status = "error"
            proc.log(f"⏰ Timeout after {AGENT_TIMEOUT_SECONDS}s")
            proc._finished_at = _time.time()
            logger.warning("agent_timeout", agent_id=agent_id, timeout=AGENT_TIMEOUT_SECONDS)

    asyncio.create_task(_timeout_kill())
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
