"""
COWORK.ARMY — Agent Tools
Tools agents can use: read_file, write_file, list_dir, search_files, run_command
These are executed server-side when agents request tool use.
"""
import os, json, subprocess, glob
import structlog
from pathlib import Path

logger = structlog.get_logger()

WORKSPACE = Path(__file__).parent / "workspace"
PROJECT_ROOT = Path(os.environ.get("COWORK_ROOT", Path(__file__).parent.parent))

# Configurable timeouts (seconds) per tool
TOOL_TIMEOUTS: dict[str, int] = {
    "read_file": 10,
    "write_file": 10,
    "list_dir": 5,
    "search_files": 15,
    "run_command": 30,
}

# Default LLM call timeout (seconds)
LLM_TOOL_TIMEOUT: int = 120


def _resolve_safe_path(agent_id: str, path: str) -> Path:
    """Resolve path ensuring it stays within allowed boundaries."""
    if path.startswith("/") or path.startswith("\\"):
        resolved = Path(path).resolve()
    else:
        resolved = (WORKSPACE / agent_id / path).resolve()

    workspace_resolved = WORKSPACE.resolve()
    project_resolved = PROJECT_ROOT.resolve()
    resolved_str = str(resolved)

    if not (resolved_str.startswith(str(workspace_resolved)) or resolved_str.startswith(str(project_resolved))):
        logger.warning("path_traversal_blocked", agent_id=agent_id, path=path, resolved=resolved_str)
        raise ValueError(f"Access denied: path '{path}' is outside allowed directories")

    return resolved


def read_file(agent_id: str, path: str) -> dict:
    """Read a file from agent workspace or project directory."""
    try:
        resolved = _resolve_safe_path(agent_id, path)
    except ValueError as e:
        return {"error": str(e)}
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
    # Write is restricted to the agent's own workspace subdirectory (not project root)
    try:
        resolved = (WORKSPACE / agent_id / path).resolve()
    except Exception as e:
        return {"error": str(e)}
    if not str(resolved).startswith(str((WORKSPACE / agent_id).resolve())):
        logger.warning("path_traversal_blocked", agent_id=agent_id, path=path, resolved=str(resolved))
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
        target_path = ""
    else:
        target_path = path

    try:
        if not target_path:
            target = (WORKSPACE / agent_id).resolve()
            workspace_resolved = WORKSPACE.resolve()
            project_resolved = PROJECT_ROOT.resolve()
            if not (str(target).startswith(str(workspace_resolved)) or str(target).startswith(str(project_resolved))):
                return {"error": "Access denied"}
        else:
            target = _resolve_safe_path(agent_id, target_path)
    except ValueError as e:
        return {"error": str(e)}

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
    try:
        if directory:
            base = _resolve_safe_path(agent_id, directory)
        else:
            base = (WORKSPACE / agent_id).resolve()
    except ValueError as e:
        return {"error": str(e)}

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
    # Whitelist safe commands
    allowed_prefixes = ["ls", "cat", "head", "tail", "wc", "grep", "find", "echo", "date", "pwd",
                        "python3", "node", "npm", "git status", "git log", "git diff"]
    cmd_lower = command.strip().lower()
    if not any(cmd_lower.startswith(p) for p in allowed_prefixes):
        return {"error": f"Command not allowed. Allowed: {', '.join(allowed_prefixes)}"}
    
    work_dir = cwd if cwd else str(WORKSPACE / agent_id)
    try:
        result = subprocess.run(
            command, shell=True, capture_output=True, text=True,
            timeout=30, cwd=work_dir
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

# Tool registry for agent system prompts
TOOL_DEFINITIONS = [
    {
        "name": "read_file",
        "description": "Read a file from workspace or project directory",
        "parameters": {"path": "File path (relative to workspace or absolute)"},
    },
    {
        "name": "write_file", 
        "description": "Write content to a file in agent's workspace",
        "parameters": {"path": "File path (relative to workspace)", "content": "File content"},
    },
    {
        "name": "list_dir",
        "description": "List files in a directory",
        "parameters": {"path": "Directory path (empty=workspace root)"},
    },
    {
        "name": "search_files",
        "description": "Search for files matching a glob pattern",
        "parameters": {"path": "Search directory", "pattern": "Glob pattern like *.py"},
    },
    {
        "name": "run_command",
        "description": "Run a shell command (limited to safe commands)",
        "parameters": {"command": "Shell command to run"},
    },
]
