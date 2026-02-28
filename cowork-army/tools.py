"""
COWORK.ARMY — Claude Tool Definitions + Sandboxed Executor
Her agent kendi workspace_dir'i içinde dosya okur/yazar/komut çalıştırır.
Kargocu agent'a özel delegation tool'ları da burada tanımlıdır.
"""
from __future__ import annotations

import asyncio
import json
import os
import re
from pathlib import Path
from typing import Any, Callable, TYPE_CHECKING

if TYPE_CHECKING:
    from database import Database

# ── Tool Definitions (Anthropic tool_use format) ────────

TOOL_DEFINITIONS = [
    {
        "name": "read_file",
        "description": "Read the contents of a file in the workspace.",
        "input_schema": {
            "type": "object",
            "properties": {
                "path": {
                    "type": "string",
                    "description": "File path relative to workspace root",
                },
            },
            "required": ["path"],
        },
    },
    {
        "name": "write_file",
        "description": "Write content to a file in the workspace (creates or overwrites).",
        "input_schema": {
            "type": "object",
            "properties": {
                "path": {
                    "type": "string",
                    "description": "File path relative to workspace root",
                },
                "content": {
                    "type": "string",
                    "description": "Content to write to the file",
                },
            },
            "required": ["path", "content"],
        },
    },
    {
        "name": "list_directory",
        "description": "List files and subdirectories in a directory.",
        "input_schema": {
            "type": "object",
            "properties": {
                "path": {
                    "type": "string",
                    "description": "Directory path relative to workspace root (use '.' for root)",
                },
            },
            "required": ["path"],
        },
    },
    {
        "name": "search_code",
        "description": "Search for a regex pattern across files in the workspace.",
        "input_schema": {
            "type": "object",
            "properties": {
                "pattern": {
                    "type": "string",
                    "description": "Regex pattern to search for",
                },
                "path": {
                    "type": "string",
                    "description": "Directory to search in (relative, default '.')",
                },
                "glob": {
                    "type": "string",
                    "description": "File glob filter (e.g. '*.py', '*.ts')",
                },
            },
            "required": ["pattern"],
        },
    },
    {
        "name": "run_command",
        "description": "Run a shell command in the workspace directory.",
        "input_schema": {
            "type": "object",
            "properties": {
                "command": {
                    "type": "string",
                    "description": "Shell command to execute",
                },
            },
            "required": ["command"],
        },
    },
]

# ── Blocked Commands ────────────────────────────────────

_BLOCKED_PATTERNS = [
    r"rm\s+-rf\s+/",
    r"\bsudo\b",
    r"\bmkfs\b",
    r"\bdd\s+if=",
    r"\bshutdown\b",
    r"\breboot\b",
    r"\bformat\b\s+[a-zA-Z]:",
    r"del\s+/[sfq]",
]
_BLOCKED_RE = re.compile("|".join(_BLOCKED_PATTERNS), re.IGNORECASE)

MAX_FILE_SIZE = 50_000  # 50KB read limit
MAX_OUTPUT = 10_000     # 10K chars command output
CMD_TIMEOUT = 30        # seconds


class ToolExecutor:
    """Executes Claude tools scoped to a workspace directory."""

    def __init__(self, workspace_root: str):
        self.workspace_root = os.path.realpath(workspace_root)

    # ── Path Safety ─────────────────────────────────────

    def _resolve(self, relative_path: str) -> str:
        """Resolve relative path and ensure it stays in workspace."""
        if not relative_path or relative_path in (".", "/", "\\"):
            return self.workspace_root

        full = os.path.realpath(os.path.join(self.workspace_root, relative_path))
        if full != self.workspace_root and not full.startswith(self.workspace_root + os.sep):
            raise PermissionError(f"Access denied: path escapes workspace — {relative_path}")
        return full

    # ── Tool Dispatch ───────────────────────────────────

    async def execute(self, tool_name: str, tool_input: dict) -> str:
        """Execute a tool and return string result."""
        try:
            if tool_name == "read_file":
                return self._read_file(tool_input["path"])
            elif tool_name == "write_file":
                return self._write_file(tool_input["path"], tool_input["content"])
            elif tool_name == "list_directory":
                return self._list_directory(tool_input.get("path", "."))
            elif tool_name == "search_code":
                return await self._search_code(
                    tool_input["pattern"],
                    tool_input.get("path", "."),
                    tool_input.get("glob", ""),
                )
            elif tool_name == "run_command":
                return await self._run_command(tool_input["command"])
            else:
                return f"ERROR: Unknown tool '{tool_name}'"
        except PermissionError as e:
            return f"ERROR: {e}"
        except FileNotFoundError as e:
            return f"ERROR: File not found — {e}"
        except Exception as e:
            return f"ERROR: {type(e).__name__}: {e}"

    # ── Tool Implementations ────────────────────────────

    def _read_file(self, path: str) -> str:
        full = self._resolve(path)
        if not os.path.isfile(full):
            return f"ERROR: Not a file — {path}"
        size = os.path.getsize(full)
        if size > MAX_FILE_SIZE:
            return f"ERROR: File too large ({size} bytes, max {MAX_FILE_SIZE})"
        with open(full, "r", encoding="utf-8", errors="replace") as f:
            return f.read()

    def _write_file(self, path: str, content: str) -> str:
        full = self._resolve(path)
        os.makedirs(os.path.dirname(full), exist_ok=True)
        with open(full, "w", encoding="utf-8") as f:
            f.write(content)
        return f"OK: Wrote {len(content)} chars to {path}"

    def _list_directory(self, path: str) -> str:
        full = self._resolve(path)
        if not os.path.isdir(full):
            return f"ERROR: Not a directory — {path}"

        entries = []
        try:
            for entry in sorted(os.listdir(full)):
                entry_path = os.path.join(full, entry)
                if os.path.isdir(entry_path):
                    entries.append(f"  {entry}/")
                else:
                    size = os.path.getsize(entry_path)
                    entries.append(f"  {entry} ({size} bytes)")
        except PermissionError:
            return f"ERROR: Permission denied reading {path}"

        if not entries:
            return f"(empty directory: {path})"
        return f"Contents of {path}:\n" + "\n".join(entries[:100])

    async def _search_code(self, pattern: str, path: str, glob_filter: str) -> str:
        full = self._resolve(path)
        if not os.path.isdir(full):
            return f"ERROR: Not a directory — {path}"

        try:
            compiled = re.compile(pattern, re.IGNORECASE)
        except re.error as e:
            return f"ERROR: Invalid regex — {e}"

        results: list[str] = []
        count = 0
        max_results = 30

        for root, _dirs, files in os.walk(full):
            # Skip common non-code dirs
            rel_root = os.path.relpath(root, full)
            if any(skip in rel_root for skip in ["node_modules", ".git", "__pycache__", ".next", "venv"]):
                continue

            for fname in files:
                if glob_filter:
                    from fnmatch import fnmatch
                    if not fnmatch(fname, glob_filter):
                        continue

                fpath = os.path.join(root, fname)
                try:
                    with open(fpath, "r", encoding="utf-8", errors="ignore") as f:
                        for lineno, line in enumerate(f, 1):
                            if compiled.search(line):
                                rel = os.path.relpath(fpath, full)
                                results.append(f"  {rel}:{lineno}: {line.rstrip()[:120]}")
                                count += 1
                                if count >= max_results:
                                    break
                except (PermissionError, OSError):
                    continue
                if count >= max_results:
                    break
            if count >= max_results:
                break

        if not results:
            return f"No matches for pattern '{pattern}' in {path}"
        header = f"Found {count} matches for '{pattern}':\n"
        return header + "\n".join(results)

    async def _run_command(self, command: str) -> str:
        if _BLOCKED_RE.search(command):
            return "ERROR: Command blocked for security reasons"

        try:
            proc = await asyncio.create_subprocess_shell(
                command,
                cwd=self.workspace_root,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
            )
            stdout, stderr = await asyncio.wait_for(
                proc.communicate(), timeout=CMD_TIMEOUT,
            )
        except asyncio.TimeoutError:
            proc.kill()  # type: ignore[union-attr]
            return f"ERROR: Command timed out after {CMD_TIMEOUT}s"

        out = stdout.decode("utf-8", errors="replace")[:MAX_OUTPUT]
        if stderr:
            err = stderr.decode("utf-8", errors="replace")[:2000]
            out += f"\nSTDERR:\n{err}"
        if proc.returncode != 0:
            out += f"\n(exit code: {proc.returncode})"
        return out or "(no output)"


# ── Delegation Tools (Kargocu agent only) ─────────────────

DELEGATION_TOOLS = [
    {
        "name": "list_agents",
        "description": (
            "Tüm mevcut agent'ları listele. "
            "Her agent'ın ID, isim, tier, domain, skills ve system_prompt bilgisi döner. "
            "Görevi hangi agent'a yönlendireceğine karar vermek için kullan."
        ),
        "input_schema": {
            "type": "object",
            "properties": {},
            "required": [],
        },
    },
    {
        "name": "delegate_task",
        "description": (
            "Bir görevi belirli bir agent'a formatlanmış şekilde ilet ve agent'ı başlat. "
            "description alanı hedef agent'ın system prompt'una uygun şekilde formatlanmalı."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "agent_id": {
                    "type": "string",
                    "description": "Hedef agent ID (ör: game-dev, web-dev, tech-analyst)",
                },
                "title": {
                    "type": "string",
                    "description": "Görev başlığı (kısa, öz)",
                },
                "description": {
                    "type": "string",
                    "description": (
                        "Hedef agent'ın anlayacağı formatta detaylı görev açıklaması. "
                        "Agent'ın system prompt'undaki terminolojiyi ve beklenen formatı kullan."
                    ),
                },
                "priority": {
                    "type": "string",
                    "enum": ["low", "medium", "high", "critical"],
                    "description": "Görev önceliği",
                },
            },
            "required": ["agent_id", "title", "description"],
        },
    },
]


class DelegationExecutor:
    """Executes delegation tools for the Kargocu agent."""

    def __init__(
        self,
        db: Database,
        agent_spawner: Callable[..., Any],
        event_callback: Callable[[str, str, str], None],
    ) -> None:
        self.db = db
        self.agent_spawner = agent_spawner
        self.event_callback = event_callback

    async def execute(self, tool_name: str, tool_input: dict) -> str:
        try:
            if tool_name == "list_agents":
                return self._list_agents()
            elif tool_name == "delegate_task":
                return await self._delegate_task(tool_input)
            return f"ERROR: Unknown delegation tool '{tool_name}'"
        except Exception as e:
            return f"ERROR: {type(e).__name__}: {e}"

    def _list_agents(self) -> str:
        agents = self.db.get_all_agents()
        lines: list[str] = []
        for a in agents:
            if a["id"] == "kargocu":
                continue
            skills = ", ".join(a.get("skills", [])[:10])
            triggers = ", ".join(a.get("triggers", [])[:10])
            prompt_preview = (a.get("system_prompt", "") or "")[:200]
            lines.append(
                f"━━━ [{a['id']}] {a['name']} ({a['tier']}) ━━━\n"
                f"  Domain: {a.get('domain', '-')}\n"
                f"  Skills: {skills}\n"
                f"  Triggers: {triggers}\n"
                f"  System Prompt (özet): {prompt_preview}..."
            )
        return f"Toplam {len(lines)} agent:\n\n" + "\n\n".join(lines)

    async def _delegate_task(self, inp: dict) -> str:
        agent_id = inp["agent_id"]
        title = inp["title"]
        desc = inp["description"]
        priority = inp.get("priority", "medium")

        agent = self.db.get_agent(agent_id)
        if not agent:
            return f"ERROR: Agent '{agent_id}' bulunamadı. list_agents ile mevcut agent'ları kontrol et."

        task = self.db.create_task(
            title=title,
            description=desc,
            assigned_to=agent_id,
            priority=priority,
            created_by="kargocu",
        )

        spawn_desc = f"{title}: {desc}" if desc else title
        await self.agent_spawner(agent_id, spawn_desc, task["id"])

        self.event_callback(
            "kargocu",
            f"📦 Görev iletildi: '{title[:40]}' → {agent['name']} ({agent_id})",
            "task_created",
        )

        return (
            f"OK: Görev başarıyla iletildi!\n"
            f"  Task ID: {task['id']}\n"
            f"  Hedef: {agent['name']} ({agent_id})\n"
            f"  Başlık: {title}\n"
            f"  Öncelik: {priority}\n"
            f"  Agent başlatıldı ve çalışıyor."
        )
