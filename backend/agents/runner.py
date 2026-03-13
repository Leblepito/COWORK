"""
COWORK.ARMY v8.0 — Agent Runner (Multi-LLM Tool-Calling Lifecycle)
spawn → read workspace → LLM API (real tool_use loop) → write output → done/error

Supports: Anthropic Claude, Google Gemini
DB calls from threads use _sync_db() to bridge async→sync via the main event loop.
"""
from __future__ import annotations
import os
import json
import asyncio
import threading
from pathlib import Path
from datetime import datetime

from ..database import get_db
from ..database.connection import get_event_loop
from ..config import WORKSPACE, AGENT_MAX_TOKENS, AGENT_OUTPUT_MAX_LINES
from .llm_providers import get_llm_provider, TOOL_DEFS
from .tools import read_file, write_file, list_dir, search_files, run_command
from ..departments.trade.tools_impl import TRADE_TOOLS_IMPL, TRADE_TOOL_DEFINITIONS
from ..departments.bots.tools import BOTS_TOOLS_IMPL, BOTS_TOOL_DEFINITIONS
from ..departments.hotel.tools import HOTEL_TOOLS_IMPL, HOTEL_TOOL_DEFINITIONS
from ..departments.medical.tools import MEDICAL_TOOLS_IMPL, MEDICAL_TOOL_DEFINITIONS
from ..departments.software.tools import SOFTWARE_TOOLS_IMPL, SOFTWARE_TOOL_DEFINITIONS
from ..departments.ceo.tools import CEO_TOOLS_IMPL, CEO_TOOL_DEFINITIONS

# Merge all department tool definitions into the global tool registry
ALL_TOOL_DEFS = (
    TOOL_DEFS
    + TRADE_TOOL_DEFINITIONS
    + BOTS_TOOL_DEFINITIONS
    + HOTEL_TOOL_DEFINITIONS
    + MEDICAL_TOOL_DEFINITIONS
    + SOFTWARE_TOOL_DEFINITIONS
    + CEO_TOOL_DEFINITIONS
)

# Combined tool implementation registry (department-specific tools)
ALL_TOOLS_IMPL: dict = {}
ALL_TOOLS_IMPL.update(TRADE_TOOLS_IMPL)
ALL_TOOLS_IMPL.update(BOTS_TOOLS_IMPL)
ALL_TOOLS_IMPL.update(HOTEL_TOOLS_IMPL)
ALL_TOOLS_IMPL.update(MEDICAL_TOOLS_IMPL)
ALL_TOOLS_IMPL.update(SOFTWARE_TOOLS_IMPL)
ALL_TOOLS_IMPL.update(CEO_TOOLS_IMPL)

MAX_TOOL_ROUNDS = 15  # Max tool-calling iterations per task

# Department → tool definitions mapping
_DEPT_TOOL_DEFS: dict[str, list] = {
    "trade": TRADE_TOOL_DEFINITIONS,
    "bots": BOTS_TOOL_DEFINITIONS,
    "hotel": HOTEL_TOOL_DEFINITIONS,
    "medical": MEDICAL_TOOL_DEFINITIONS,
    "software": SOFTWARE_TOOL_DEFINITIONS,
    "management": CEO_TOOL_DEFINITIONS,
}


def get_tools_for_dept(dept_id: str) -> list:
    """Return base tools + department-specific tools for the given department.
    Keeps token count low by not sending irrelevant tool schemas to the LLM.
    """
    dept_tools = _DEPT_TOOL_DEFS.get(dept_id, [])
    return TOOL_DEFS + dept_tools


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


def _workspace_context(agent_id: str) -> str:
    """Read workspace files to give agent context about its environment."""
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
                        parts.append(f"  📋 {d.get('title', '?')}: {d.get('description', '')[:150]}")
                    except Exception:
                        parts.append(f"  📄 {f.name}")
                else:
                    parts.append(f"  📄 {f.name} ({f.stat().st_size}b)")
    return "\n".join(parts)


def _execute_tool(agent_id: str, tool_name: str, tool_input: dict) -> str:
    """Execute a tool call and return the result as a JSON string."""
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
        elif tool_name in ALL_TOOLS_IMPL:
            # Department-specific tools (trade, bots, etc.)
            fn = ALL_TOOLS_IMPL[tool_name]
            result = fn(**tool_input)
        else:
            result = {"error": f"Unknown tool: {tool_name}"}
        return json.dumps(result, ensure_ascii=False, default=str)
    except KeyError as e:
        return json.dumps({"error": f"Missing required parameter: {e}"})
    except Exception as e:
        return json.dumps({"error": str(e)})


def _save_output(agent_id: str, task: str, response: str, proc: AgentProc):
    """Save agent output to workspace."""
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
                proc.log(f"  ✅ {fn}")
            (ws / f"result_{ts}.json").write_text(
                json.dumps(result, indent=2, ensure_ascii=False)
            )
            proc.log(f"  ✅ result_{ts}.json")
        else:
            raise ValueError("No JSON in response")
    except Exception:
        (ws / f"response_{ts}.md").write_text(f"# {task}\n\n{response}")
        proc.log(f"  📄 response_{ts}.md")


def _run(proc: AgentProc, task: str):
    """
    Core agent execution loop with real tool-calling support.
    Runs in a background thread.
    """
    db = get_db()
    agent = _sync_db(db.get_agent(proc.agent_id))
    if not agent:
        proc.status = "error"
        proc.log("Agent bulunamadi!")
        return

    proc.log("Workspace okunuyor...")
    proc.status = "searching"
    ctx = _workspace_context(proc.agent_id)
    dept_id = agent.get("department_id", "")

    sys_prompt = agent["system_prompt"] + f"""

WORKSPACE DURUMU:
{ctx if ctx else "(Bos workspace)"}

ARACLARIN (Temel):
- read_file: Workspace veya proje dizininden dosya oku
- write_file: Workspace'e dosya yaz
- list_dir: Dizin icerigi listele
- search_files: Glob pattern ile dosya ara
- run_command: Guvenli shell komutu calistir (ls, cat, grep, python3 vb.)

ARACLARIN (Trade - Gercek Piyasa Verisi):
- analyze_chart: Gercek OHLCV verisi + Elliott Wave + SMC (BOS/CHoCH/OB/FVG) + RSI/MACD/EMA
- get_funding_rate: Gercek zamanli perpetual futures funding rate
- get_multi_exchange_price: Binance/Bybit/OKX karsilastirmali fiyat
- generate_signal: Elliott Wave + SMC + multi-timeframe analiz ile BUY/SELL/HOLD sinyali

ARACLARIN (Bots - Otomasyon):
- fetch_x_trends: Kripto trending konular (CoinGecko gercek veri)
- generate_social_content: Sosyal medya icerik sablonu
- check_website_status: Web sitesi uptime ve yanit suresi kontrolu
- schedule_post: Sosyal medya post zamanlama

KURALLAR:
1. Bir gorevi tamamlamak icin gercekten araclari kullan, hayal etme.
2. Dosya okumak icin read_file kullan, tahmin etme.
3. Ciktilarini write_file ile workspace'e kaydet.
4. Tum adimlarini acikca logla.
5. Gorev bitince JSON formatinda ozet ver:
{{"status":"completed","summary":"Kisa ozet","actions_taken":["Yapilan 1","Yapilan 2"],"output_files":[{{"filename":"x.md","content":"..."}}],"notes":"","next_steps":["Sonraki adim"]}}
"""

    user_msg = f"Gorevin:\n{task}"
    proc.log(f"Gorev: {task[:80]}")
    proc.status = "working"

    try:
        llm = get_llm_provider(task)
        provider_name = type(llm).__name__.replace("Provider", "")
        proc.log(f"LLM: {provider_name} hazir")

        messages = [{"role": "user", "content": user_msg}]
        final_text = ""

        for round_num in range(MAX_TOOL_ROUNDS):
            proc.log(f"Tur {round_num + 1}/{MAX_TOOL_ROUNDS}...")
            dept_tools = get_tools_for_dept(dept_id)
            response = llm.get_response(sys_prompt, messages, dept_tools)

            if response.stop_reason == "tool_use":
                tool_results = []
                assistant_content = []

                for block in response.content:
                    if block.type == "tool_use":
                        proc.log(f"  🔧 {block.name}({json.dumps(block.input)[:80]})")
                        proc.status = "coding"

                        result_str = _execute_tool(proc.agent_id, block.name, block.input)
                        result_preview = result_str[:100].replace("\n", " ")
                        proc.log(f"  ✓ Sonuc: {result_preview}")

                        tool_results.append({
                            "type": "tool_result",
                            "tool_use_id": block.id,
                            "tool_name": block.name,  # Gemini için gerekli; Anthropic provider filtreler
                            "content": result_str,
                        })
                        assistant_content.append({
                            "type": "tool_use",
                            "id": block.id,
                            "name": block.name,
                            "input": block.input,
                        })
                    elif block.type == "text" and block.text:
                        assistant_content.append({"type": "text", "text": block.text})

                messages.append({"role": "assistant", "content": assistant_content})
                messages.append({"role": "user", "content": tool_results})
                proc.status = "working"

            else:
                for block in response.content:
                    if block.type == "text":
                        final_text += block.text
                proc.log(f"Yanit: {len(final_text)} karakter")
                break
        else:
            proc.log(f"Uyari: Max tur sayisina ulasildi ({MAX_TOOL_ROUNDS})")
            final_text = f"Max tur sayisina ulasildi."

        proc.status = "coding"
        proc.log("Cikti kaydediliyor...")
        _save_output(proc.agent_id, task, final_text, proc)
        proc.status = "done"
        proc.log("✅ Gorev tamamlandi!")

        _sync_db(db.add_event(
            proc.agent_id, f"Gorev tamamlandi: {task[:50]}", "info",
            department_id=dept_id if dept_id else None,
        ))

    except Exception as e:
        proc.status = "error"
        proc.log(f"❌ Hata: {e}")
        try:
            _sync_db(db.add_event(
                proc.agent_id, f"Hata: {e}", "warning",
                department_id=dept_id if dept_id else None,
            ))
        except Exception:
            pass


# ── Public API ──

async def spawn_agent(agent_id: str, task: str = "") -> dict:
    """Spawn an agent to execute a task."""
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
    """Stop a running agent."""
    if agent_id not in PROCS:
        return {"error": "Not running"}
    PROCS[agent_id].status = "done"
    PROCS[agent_id].log("Durduruldu")
    return {"status": "killed", "agent_id": agent_id}


async def get_statuses() -> dict:
    """Get status of all agents."""
    db = get_db()
    agents = await db.get_all_agents()
    result = {}
    for agent in agents:
        aid = agent["id"]
        if aid in PROCS:
            result[aid] = PROCS[aid].to_dict()
        else:
            result[aid] = {
                "agent_id": aid, "status": "idle", "lines": [],
                "alive": False, "pid": 0, "started_at": "",
            }
    return result


def get_output(agent_id: str) -> list[str]:
    """Get log lines for an agent."""
    return PROCS[agent_id].lines if agent_id in PROCS else []
