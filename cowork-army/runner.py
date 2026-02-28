"""
COWORK.ARMY — Agent Runner
Manages agent lifecycle: spawn → run (Claude API + tools) → done/error/kill.
Each agent runs as an asyncio.Task, non-blocking.
Agents are loaded from DB (supports dynamic agents).
"""
from __future__ import annotations

import asyncio
import json
import logging
import os
from collections import deque
from datetime import datetime, timezone
from typing import Any, Callable, TYPE_CHECKING

import anthropic

from registry import agent_def_from_db_row
from tools import TOOL_DEFINITIONS, DELEGATION_TOOLS, ToolExecutor, DelegationExecutor

if TYPE_CHECKING:
    from database import Database

logger = logging.getLogger("cowork-army.runner")

MAX_ROUNDS = 30          # max tool-use iterations per spawn
MODEL = "claude-sonnet-4-20250514"
MAX_TOKENS = 4096
OUTPUT_BUFFER_SIZE = 500  # lines per agent


def _now_iso() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


class AgentProcess:
    """State for a single agent slot."""

    __slots__ = (
        "agent_id", "status", "output_buffer", "alive",
        "started_at", "task_description", "task_handle",
        "cancel_event", "pid_counter", "task_id",
    )

    def __init__(self, agent_id: str) -> None:
        self.agent_id = agent_id
        self.status: str = "idle"
        self.output_buffer: deque[str] = deque(maxlen=OUTPUT_BUFFER_SIZE)
        self.alive: bool = False
        self.started_at: str | None = None
        self.task_description: str | None = None
        self.task_handle: asyncio.Task[None] | None = None
        self.cancel_event = asyncio.Event()
        self.pid_counter: int = 0
        self.task_id: str | None = None


class AgentRunner:
    """Manages agent processes — supports both base and dynamic agents."""

    def __init__(
        self,
        cowork_root: str,
        anthropic_api_key: str,
        event_callback: Callable[[str, str, str], None],
        db: Database,
    ) -> None:
        self.cowork_root = cowork_root
        self.api_key = anthropic_api_key
        self.event_callback = event_callback
        self.db = db
        self._pid_seq = 0
        self.processes: dict[str, AgentProcess] = {}
        # Pre-create processes for existing agents
        for agent in db.get_all_agents():
            self.processes[agent["id"]] = AgentProcess(agent["id"])

    def ensure_process(self, agent_id: str) -> AgentProcess:
        """Get or create an AgentProcess for any agent (including dynamic)."""
        if agent_id not in self.processes:
            self.processes[agent_id] = AgentProcess(agent_id)
        return self.processes[agent_id]

    # ── Public API ──────────────────────────────────────

    async def spawn(
        self,
        agent_id: str,
        task: str | None = None,
        task_id: str | None = None,
    ) -> dict:
        """Spawn an agent. Returns AgentStatus dict immediately."""
        agent_row = self.db.get_agent(agent_id)
        if not agent_row:
            return {"error": "unknown agent"}

        proc = self.ensure_process(agent_id)
        if proc.alive:
            return self._status_dict(proc)

        self._pid_seq += 1
        proc.pid_counter = self._pid_seq
        proc.alive = True
        proc.status = "thinking"
        proc.started_at = _now_iso()
        proc.task_description = task or "Workspace'i keşfet ve durum raporu ver."
        proc.task_id = task_id
        proc.output_buffer.clear()
        proc.cancel_event.clear()

        self._log(proc, f"Agent spawned — task: {proc.task_description[:100]}")
        proc.task_handle = asyncio.create_task(self._run_agent(agent_id, proc))
        return self._status_dict(proc)

    async def kill(self, agent_id: str) -> dict:
        """Kill a running agent."""
        proc = self.processes.get(agent_id)
        if not proc:
            return {"status": "error", "agent_id": agent_id}
        if proc.task_handle and not proc.task_handle.done():
            proc.cancel_event.set()
            proc.task_handle.cancel()
        proc.alive = False
        proc.status = "idle"
        self._log(proc, "Agent killed by user")
        return {"status": "killed", "agent_id": agent_id}

    def get_status(self, agent_id: str) -> dict:
        proc = self.processes.get(agent_id)
        if not proc:
            return {}
        return self._status_dict(proc)

    def get_all_statuses(self) -> dict[str, dict]:
        # Include all agents from DB (even if no process yet)
        result = {}
        for agent in self.db.get_all_agents():
            aid = agent["id"]
            proc = self.processes.get(aid)
            if proc:
                result[aid] = self._status_dict(proc)
            else:
                result[aid] = {
                    "agent_id": aid,
                    "status": "idle",
                    "lines": [],
                    "alive": False,
                    "pid": 0,
                    "started_at": "",
                }
        return result

    def get_output(self, agent_id: str) -> list[str]:
        proc = self.processes.get(agent_id)
        if not proc:
            return []
        return list(proc.output_buffer)

    # ── Agent Execution Loop ────────────────────────────

    async def _spawn_for_delegation(
        self, agent_id: str, task: str, task_id: str | None = None,
    ) -> str:
        """Internal spawn used by Kargocu delegation tool."""
        result = await self.spawn(agent_id, task, task_id)
        if "error" in result:
            return f"ERROR: {result['error']}"
        return f"OK: {agent_id} başlatıldı"

    async def _run_agent(self, agent_id: str, proc: AgentProcess) -> None:
        agent_row = self.db.get_agent(agent_id)
        if not agent_row:
            proc.status = "error"
            self._log(proc, "ERROR: Agent not found in database")
            proc.alive = False
            return

        agent_def = agent_def_from_db_row(agent_row)
        workspace = os.path.join(self.cowork_root, agent_def.workspace_dir)
        executor = ToolExecutor(workspace)

        # Kargocu gets delegation tools in addition to standard tools
        is_kargocu = agent_id == "kargocu"
        delegation_exec: DelegationExecutor | None = None
        if is_kargocu:
            delegation_exec = DelegationExecutor(
                db=self.db,
                agent_spawner=self._spawn_for_delegation,
                event_callback=self.event_callback,
            )

        tools_for_agent = list(TOOL_DEFINITIONS)
        if is_kargocu:
            tools_for_agent.extend(DELEGATION_TOOLS)

        if not self.api_key:
            proc.status = "error"
            self._log(proc, "ERROR: ANTHROPIC_API_KEY not set")
            self.event_callback(agent_id, "API key eksik — agent çalışamıyor", "warning")
            proc.alive = False
            return

        client = anthropic.AsyncAnthropic(api_key=self.api_key)
        messages: list[dict[str, Any]] = [
            {"role": "user", "content": proc.task_description or "Merhaba"},
        ]

        final_status = "done"
        try:
            for round_num in range(MAX_ROUNDS):
                if proc.cancel_event.is_set():
                    break

                proc.status = "thinking"
                self._log(proc, f"[Round {round_num + 1}/{MAX_ROUNDS}] Düşünüyor...")

                response = await client.messages.create(
                    model=MODEL,
                    max_tokens=MAX_TOKENS,
                    system=agent_def.system_prompt,
                    tools=tools_for_agent,
                    messages=messages,
                )

                # Process response content blocks
                assistant_content = response.content
                tool_use_blocks: list[Any] = []

                for block in assistant_content:
                    if block.type == "text" and block.text:
                        proc.status = self._infer_status(block.text)
                        for line in block.text.split("\n"):
                            if line.strip():
                                self._log(proc, line.strip()[:200])
                    elif block.type == "tool_use":
                        tool_use_blocks.append(block)

                # Append assistant message
                messages.append({"role": "assistant", "content": assistant_content})

                # Execute tools if any
                if tool_use_blocks:
                    tool_results = []
                    for tb in tool_use_blocks:
                        proc.status = self._tool_status(tb.name)
                        input_summary = json.dumps(tb.input, ensure_ascii=False)[:150]
                        self._log(proc, f"[Tool: {tb.name}] {input_summary}")

                        # Delegation tools handled by DelegationExecutor
                        if is_kargocu and delegation_exec and tb.name in (
                            "list_agents", "delegate_task",
                        ):
                            result = await delegation_exec.execute(tb.name, tb.input)
                        else:
                            result = await executor.execute(tb.name, tb.input)

                        result_preview = result[:200].replace("\n", " ")
                        self._log(proc, f"  → {result_preview}")

                        self.event_callback(
                            agent_id,
                            f"{tb.name}: {input_summary[:60]}",
                            "info",
                        )

                        tool_results.append({
                            "type": "tool_result",
                            "tool_use_id": tb.id,
                            "content": result,
                        })

                    messages.append({"role": "user", "content": tool_results})
                else:
                    break

                if response.stop_reason == "end_turn":
                    break
            else:
                # MAX_ROUNDS exhausted without natural stop
                final_status = "needs_continuation"
                self._log(proc, f"⚠ Maksimum tur sayısına ulaşıldı ({MAX_ROUNDS}), devam gerekiyor")

            proc.status = final_status
            if final_status == "done":
                self._log(proc, "✓ Görev tamamlandı")
                self.event_callback(agent_id, "Görev tamamlandı", "info")
            else:
                self.event_callback(agent_id, "Görev devam edecek — tur limiti aşıldı", "warning")

            # Update linked task status in DB
            if proc.task_id:
                if final_status == "done":
                    self.db.update_task_status(proc.task_id, "done", "Agent görevi tamamladı")
                elif final_status == "needs_continuation":
                    self.db.update_task_status(
                        proc.task_id, "in_progress",
                        f"Tur limiti ({MAX_ROUNDS}) aşıldı — otonom döngü yeniden başlatacak",
                    )

        except asyncio.CancelledError:
            proc.status = "idle"
            self._log(proc, "Agent iptal edildi")
        except anthropic.APIError as e:
            proc.status = "error"
            self._log(proc, f"API Error: {e}")
            self.event_callback(agent_id, f"API hatası: {str(e)[:80]}", "warning")
            if proc.task_id:
                self.db.update_task_status(proc.task_id, "in_progress", f"API hatası — yeniden denenecek: {str(e)[:60]}")
        except Exception as e:
            proc.status = "error"
            self._log(proc, f"Error: {type(e).__name__}: {e}")
            self.event_callback(agent_id, f"Hata: {str(e)[:80]}", "warning")
            logger.exception("Agent %s crashed", agent_id)
            if proc.task_id:
                self.db.update_task_status(proc.task_id, "in_progress", f"Hata — yeniden denenecek: {str(e)[:60]}")
        finally:
            proc.alive = False

    # ── Helpers ─────────────────────────────────────────

    def _log(self, proc: AgentProcess, message: str) -> None:
        ts = datetime.now(timezone.utc).strftime("%H:%M:%S")
        proc.output_buffer.append(f"[{ts}] {message}")

    def _status_dict(self, proc: AgentProcess) -> dict:
        return {
            "agent_id": proc.agent_id,
            "status": proc.status,
            "lines": list(proc.output_buffer)[-10:],
            "alive": proc.alive,
            "pid": proc.pid_counter,
            "started_at": proc.started_at or "",
        }

    @staticmethod
    def _infer_status(text: str) -> str:
        t = text.lower()
        if any(w in t for w in ["analiz", "düşün", "değerlendir", "incele"]):
            return "thinking"
        if any(w in t for w in ["plan", "strateji", "tasarla"]):
            return "planning"
        if any(w in t for w in ["kod", "yaz", "oluştur", "implement", "write"]):
            return "coding"
        if any(w in t for w in ["ara", "bul", "tara", "search", "find"]):
            return "searching"
        return "working"

    @staticmethod
    def _tool_status(tool_name: str) -> str:
        return {
            "read_file": "searching",
            "write_file": "coding",
            "list_directory": "searching",
            "search_code": "searching",
            "run_command": "working",
        }.get(tool_name, "working")
