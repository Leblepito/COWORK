"""
COWORK.ARMY — Claude Tool Definitions + Sandboxed Executor
Her agent kendi workspace_dir'i içinde dosya okur/yazar/komut çalıştırır.
Kargocu agent'a özel delegation tool'ları, deploy-ops'a özel deploy tool'ları burada tanımlıdır.
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


# ── Deploy Tools (deploy-ops agent only) ──────────────────

# Project → repo mapping
_PROJECT_MAP: dict[str, dict[str, str]] = {
    "Med-UI-Tra-main": {
        "repo": "Leblepito/Med-UI-Tra",
        "domain": "leblepito.com",
        "branch": "main",
    },
    "uAlgoTrade-main": {
        "repo": "Leblepito/uAlgoTrade",
        "domain": "ualgotrade.com",
        "branch": "main",
    },
    "cowork-army": {
        "repo": "Leblepito/COWORK",
        "domain": "cowork.army",
        "branch": "main",
    },
}

DEPLOY_TOOLS = [
    {
        "name": "git_operations",
        "description": (
            "Git işlemleri: status, diff, add, commit, push. "
            "Belirli bir proje klasöründe güvenli git komutları çalıştırır."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "project_dir": {
                    "type": "string",
                    "description": (
                        "Proje klasörü (ör: Med-UI-Tra-main, uAlgoTrade-main, cowork-army)"
                    ),
                },
                "operation": {
                    "type": "string",
                    "enum": ["status", "diff", "add", "commit", "push", "log", "branch"],
                    "description": "Git operasyonu",
                },
                "args": {
                    "type": "string",
                    "description": (
                        "Ek argümanlar: add için dosya listesi (boşlukla ayrılmış), "
                        "commit için mesaj, push için branch adı, vb."
                    ),
                },
            },
            "required": ["project_dir", "operation"],
        },
    },
    {
        "name": "railway_deploy",
        "description": (
            "Railway.com deploy işlemleri: status, up (deploy), logs, rollback. "
            "Belirli bir projeyi Railway'de deploy eder."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "project_dir": {
                    "type": "string",
                    "description": "Proje klasörü (ör: Med-UI-Tra-main, uAlgoTrade-main, cowork-army)",
                },
                "operation": {
                    "type": "string",
                    "enum": ["status", "up", "logs", "rollback", "health_check"],
                    "description": "Railway operasyonu",
                },
            },
            "required": ["project_dir", "operation"],
        },
    },
    {
        "name": "check_secrets",
        "description": (
            "Commit öncesi güvenlik taraması. Belirtilen dosyalarda API key, secret, "
            "credential gibi hassas verilerin olup olmadığını kontrol eder."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "project_dir": {
                    "type": "string",
                    "description": "Proje klasörü",
                },
            },
            "required": ["project_dir"],
        },
    },
]

# Files that should never be committed
_SENSITIVE_PATTERNS = [
    r"\.env$", r"\.env\.local$", r"\.env\.production$",
    r"credentials\.json$", r"serviceAccount.*\.json$",
    r"\.pem$", r"\.key$", r"id_rsa",
]
_SENSITIVE_RE = re.compile("|".join(_SENSITIVE_PATTERNS), re.IGNORECASE)

# Content patterns that indicate secrets
_SECRET_CONTENT_PATTERNS = [
    r"ANTHROPIC_API_KEY\s*=\s*sk-",
    r"OPENAI_API_KEY\s*=\s*sk-",
    r"AWS_SECRET_ACCESS_KEY\s*=",
    r"RAILWAY_TOKEN\s*=",
    r"GITHUB_TOKEN\s*=\s*gh[ps]_",
    r"-----BEGIN.*PRIVATE KEY-----",
    r"password\s*=\s*['\"][^'\"]{8,}",
]
_SECRET_RE = re.compile("|".join(_SECRET_CONTENT_PATTERNS), re.IGNORECASE)

DEPLOY_CMD_TIMEOUT = 120  # 2 minutes for deploy operations


class DeployExecutor:
    """Executes deploy tools for the deploy-ops agent."""

    def __init__(
        self,
        cowork_root: str,
        event_callback: Callable[[str, str, str], None],
    ) -> None:
        self.cowork_root = cowork_root
        self.event_callback = event_callback

    async def execute(self, tool_name: str, tool_input: dict) -> str:
        try:
            if tool_name == "git_operations":
                return await self._git_operations(tool_input)
            elif tool_name == "railway_deploy":
                return await self._railway_deploy(tool_input)
            elif tool_name == "check_secrets":
                return self._check_secrets(tool_input)
            return f"ERROR: Unknown deploy tool '{tool_name}'"
        except Exception as e:
            return f"ERROR: {type(e).__name__}: {e}"

    def _resolve_project(self, project_dir: str) -> str:
        """Resolve and validate project directory."""
        full = os.path.realpath(os.path.join(self.cowork_root, project_dir))
        if not full.startswith(os.path.realpath(self.cowork_root)):
            raise PermissionError(f"Path escapes workspace: {project_dir}")
        if not os.path.isdir(full):
            raise FileNotFoundError(f"Project directory not found: {project_dir}")
        return full

    async def _run(self, cmd: str, cwd: str, timeout: int = DEPLOY_CMD_TIMEOUT) -> str:
        """Run a shell command safely."""
        try:
            proc = await asyncio.create_subprocess_shell(
                cmd, cwd=cwd,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
            )
            stdout, stderr = await asyncio.wait_for(
                proc.communicate(), timeout=timeout,
            )
        except asyncio.TimeoutError:
            proc.kill()  # type: ignore[union-attr]
            return f"ERROR: Command timed out after {timeout}s"

        out = stdout.decode("utf-8", errors="replace")[:MAX_OUTPUT]
        if stderr:
            err = stderr.decode("utf-8", errors="replace")[:2000]
            if err.strip():
                out += f"\nSTDERR:\n{err}"
        if proc.returncode != 0:
            out += f"\n(exit code: {proc.returncode})"
        return out.strip() or "(no output)"

    async def _git_operations(self, inp: dict) -> str:
        project_dir = inp["project_dir"]
        operation = inp["operation"]
        args = inp.get("args", "")

        cwd = self._resolve_project(project_dir)

        if operation == "status":
            return await self._run("git status --short", cwd)

        elif operation == "diff":
            result = await self._run("git diff --stat", cwd)
            if args:
                result += "\n\n" + await self._run(f"git diff {args}", cwd)
            return result

        elif operation == "add":
            if not args:
                return "ERROR: 'args' gerekli — eklenecek dosyaları belirt (git add . KULLANMA)"
            # Block adding sensitive files
            for file_path in args.split():
                if _SENSITIVE_RE.search(file_path):
                    return f"ERROR: Güvenlik ihlali — hassas dosya eklenemez: {file_path}"
                if file_path in (".", "-A", "--all"):
                    return "ERROR: 'git add .' veya 'git add -A' kullanma — dosyaları tek tek belirt"
            return await self._run(f"git add {args}", cwd)

        elif operation == "commit":
            if not args:
                return "ERROR: 'args' gerekli — commit mesajı belirt"
            # Verify conventional commit format
            msg = args.strip().strip("'\"")
            if not any(msg.startswith(p) for p in ("feat:", "fix:", "refactor:", "chore:", "docs:", "style:", "test:", "perf:")):
                return (
                    f"ERROR: Commit mesajı Conventional Commits formatında olmalı.\n"
                    f"Örnekler: feat: yeni özellik, fix: hata düzeltme, chore: bakım\n"
                    f"Gönderilen: {msg[:80]}"
                )
            # Run secret check before committing
            secret_check = self._check_staged_secrets(cwd)
            if secret_check:
                return f"ERROR: Commit engellendi — staged dosyalarda secret tespit edildi:\n{secret_check}"
            safe_msg = msg.replace("'", "'\\''")
            return await self._run(f"git commit -m '{safe_msg}'", cwd)

        elif operation == "push":
            branch = args.strip() if args else "main"
            if "--force" in branch or "-f" in branch:
                return "ERROR: Force push yasak — güvenlik kuralı"
            result = await self._run(f"git push origin {branch}", cwd)
            self.event_callback(
                "deploy-ops",
                f"Git push: {project_dir} → origin/{branch}",
                "info",
            )
            return result

        elif operation == "log":
            count = args.strip() if args else "5"
            return await self._run(f"git log --oneline -n {count}", cwd)

        elif operation == "branch":
            return await self._run("git branch -a", cwd)

        return f"ERROR: Bilinmeyen git operasyonu: {operation}"

    async def _railway_deploy(self, inp: dict) -> str:
        project_dir = inp["project_dir"]
        operation = inp["operation"]

        cwd = self._resolve_project(project_dir)
        project_info = _PROJECT_MAP.get(project_dir, {})
        domain = project_info.get("domain", "unknown")

        if operation == "status":
            return await self._run("railway status 2>&1 || echo 'Railway CLI not found or not linked'", cwd)

        elif operation == "up":
            self.event_callback(
                "deploy-ops",
                f"Railway deploy başlatılıyor: {project_dir} → {domain}",
                "task_created",
            )
            result = await self._run("railway up --detach 2>&1 || echo 'Railway CLI not available'", cwd)
            self.event_callback(
                "deploy-ops",
                f"Railway deploy tamamlandı: {project_dir} — {result[:80]}",
                "info",
            )
            return result

        elif operation == "logs":
            return await self._run("railway logs --limit 50 2>&1 || echo 'Railway CLI not available'", cwd, timeout=30)

        elif operation == "rollback":
            self.event_callback(
                "deploy-ops",
                f"Railway rollback: {project_dir}",
                "warning",
            )
            return await self._run("railway rollback 2>&1 || echo 'Railway CLI not available'", cwd)

        elif operation == "health_check":
            if domain and domain != "unknown":
                return await self._run(
                    f"curl -s -o /dev/null -w '%{{http_code}}' https://{domain}/health 2>&1 || echo 'Health check failed'",
                    cwd, timeout=15,
                )
            return "ERROR: Domain bilgisi bulunamadı — proje haritasını kontrol et"

        return f"ERROR: Bilinmeyen railway operasyonu: {operation}"

    def _check_secrets(self, inp: dict) -> str:
        """Scan project directory for sensitive files/content."""
        project_dir = inp["project_dir"]
        cwd = self._resolve_project(project_dir)

        issues: list[str] = []

        # Check for sensitive files
        for root, _dirs, files in os.walk(cwd):
            rel_root = os.path.relpath(root, cwd)
            if any(skip in rel_root for skip in [
                "node_modules", ".git", "__pycache__", ".next", "venv",
            ]):
                continue
            for fname in files:
                if _SENSITIVE_RE.search(fname):
                    rel_path = os.path.join(rel_root, fname)
                    issues.append(f"  DOSYA: {rel_path}")

        # Check staged files for secret content (git diff --cached)
        staged_check = self._check_staged_secrets(cwd)
        if staged_check:
            issues.append(staged_check)

        if not issues:
            return "OK: Güvenlik taraması temiz — hassas dosya veya içerik bulunamadı."

        return f"UYARI: {len(issues)} potansiyel güvenlik riski tespit edildi:\n" + "\n".join(issues)

    def _check_staged_secrets(self, cwd: str) -> str:
        """Synchronously check staged diff for secrets."""
        import subprocess
        try:
            result = subprocess.run(
                ["git", "diff", "--cached", "--unified=0"],
                cwd=cwd, capture_output=True, text=True, timeout=10,
            )
            diff_text = result.stdout
        except Exception:
            return ""

        issues: list[str] = []
        for line in diff_text.split("\n"):
            if line.startswith("+") and not line.startswith("+++"):
                if _SECRET_RE.search(line):
                    issues.append(f"  SECRET: {line[:120]}")
        return "\n".join(issues)
