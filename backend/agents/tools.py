"""
COWORK.ARMY v7.0 — Agent Tools
Tools agents can use: read_file, write_file, list_dir, search_files, run_command
"""
import subprocess
from pathlib import Path
from ..config import WORKSPACE, PROJECT_ROOT


def read_file(agent_id: str, path: str) -> dict:
    """Read a file from agent workspace or project directory."""
    if path.startswith("/"):
        resolved = Path(path)
    else:
        resolved = WORKSPACE / agent_id / path
    resolved = resolved.resolve()

    ok = str(resolved).startswith(str(WORKSPACE.resolve())) or \
         str(resolved).startswith(str(PROJECT_ROOT.resolve()))
    if not ok:
        return {"error": "Access denied: path outside allowed directories"}
    if not resolved.exists():
        return {"error": f"File not found: {path}"}
    if not resolved.is_file():
        return {"error": f"Not a file: {path}"}
    try:
        content = resolved.read_text(errors="replace")[:100000]
        return {"path": str(resolved), "content": content, "size": resolved.stat().st_size}
    except Exception as e:
        return {"error": str(e)}


def write_file(agent_id: str, path: str, content: str) -> dict:
    """Write a file to agent's workspace only."""
    resolved = (WORKSPACE / agent_id / path).resolve()
    if not str(resolved).startswith(str((WORKSPACE / agent_id).resolve())):
        return {"error": "Access denied: can only write to own workspace"}
    try:
        resolved.parent.mkdir(parents=True, exist_ok=True)
        resolved.write_text(content)
        return {"path": str(resolved), "written": len(content)}
    except Exception as e:
        return {"error": str(e)}


def list_dir(agent_id: str, path: str = "") -> dict:
    """List directory contents."""
    if not path or path == ".":
        target = WORKSPACE / agent_id
    elif path.startswith("/"):
        target = Path(path)
    else:
        target = WORKSPACE / agent_id / path
    target = target.resolve()

    ok = str(target).startswith(str(WORKSPACE.resolve())) or \
         str(target).startswith(str(PROJECT_ROOT.resolve()))
    if not ok:
        return {"error": "Access denied"}
    if not target.exists():
        return {"error": f"Directory not found: {path}"}

    entries = []
    try:
        for item in sorted(target.iterdir()):
            entries.append({
                "name": item.name,
                "type": "dir" if item.is_dir() else "file",
                "size": item.stat().st_size if item.is_file() else 0,
            })
    except Exception as e:
        return {"error": str(e)}
    return {"path": str(target), "entries": entries}


def search_files(agent_id: str, pattern: str, directory: str = "") -> dict:
    """Search for files matching a glob pattern."""
    if directory:
        base = Path(directory).resolve()
    else:
        base = WORKSPACE / agent_id

    ok = str(base.resolve()).startswith(str(WORKSPACE.resolve())) or \
         str(base.resolve()).startswith(str(PROJECT_ROOT.resolve()))
    if not ok:
        return {"error": "Access denied"}

    matches = []
    try:
        for f in base.rglob(pattern):
            if f.is_file():
                matches.append(str(f.relative_to(base)))
                if len(matches) >= 100:
                    break
    except Exception as e:
        return {"error": str(e)}
    return {"pattern": pattern, "base": str(base), "matches": matches, "count": len(matches)}


def run_command(agent_id: str, command: str, cwd: str = "") -> dict:
    """Run a shell command in agent's workspace. Limited commands only."""
    allowed_prefixes = [
        "ls", "cat", "head", "tail", "wc", "grep", "find", "echo",
        "date", "pwd", "python3", "node", "npm", "git status", "git log", "git diff",
    ]
    cmd_lower = command.strip().lower()
    if not any(cmd_lower.startswith(p) for p in allowed_prefixes):
        return {"error": f"Command not allowed. Allowed: {', '.join(allowed_prefixes)}"}

    work_dir = cwd if cwd else str(WORKSPACE / agent_id)
    try:
        result = subprocess.run(
            command, shell=True, capture_output=True, text=True,
            timeout=30, cwd=work_dir,
        )
        return {
            "command": command,
            "stdout": result.stdout[:10000],
            "stderr": result.stderr[:5000],
            "returncode": result.returncode,
        }
    except subprocess.TimeoutExpired:
        return {"error": "Command timed out (30s limit)"}
    except Exception as e:
        return {"error": str(e)}


TOOL_DEFINITIONS = [
    {"name": "read_file", "description": "Read a file from workspace or project directory",
     "parameters": {"path": "File path (relative to workspace or absolute)"}},
    {"name": "write_file", "description": "Write content to a file in agent's workspace",
     "parameters": {"path": "File path (relative to workspace)", "content": "File content"}},
    {"name": "list_dir", "description": "List files in a directory",
     "parameters": {"path": "Directory path (empty=workspace root)"}},
    {"name": "search_files", "description": "Search for files matching a glob pattern",
     "parameters": {"path": "Search directory", "pattern": "Glob pattern like *.py"}},
    {"name": "run_command", "description": "Run a shell command (limited to safe commands)",
     "parameters": {"command": "Shell command to run"}},
]
