"""
COWORK.ARMY — SQLite Database Layer
Agents, tasks, events — all persisted in cowork.db.
"""
from __future__ import annotations

import json
import sqlite3
import threading
from datetime import datetime, timezone
from pathlib import Path
from uuid import uuid4


def _now_iso() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


class Database:
    """Thread-safe SQLite wrapper for COWORK.ARMY."""

    def __init__(self, db_path: str) -> None:
        self.db_path = db_path
        self.conn: sqlite3.Connection | None = None
        self._lock = threading.Lock()

    def initialize(self) -> None:
        self.conn = sqlite3.connect(self.db_path, check_same_thread=False)
        self.conn.row_factory = sqlite3.Row
        self.conn.execute("PRAGMA journal_mode=WAL")
        self.conn.execute("PRAGMA foreign_keys=ON")
        self._create_tables()

    def _create_tables(self) -> None:
        assert self.conn
        self.conn.executescript("""
            CREATE TABLE IF NOT EXISTS agents (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                icon TEXT NOT NULL DEFAULT '🤖',
                tier TEXT NOT NULL DEFAULT 'WORKER',
                color TEXT NOT NULL DEFAULT '#9ca3af',
                domain TEXT NOT NULL DEFAULT '',
                description TEXT NOT NULL DEFAULT '',
                skills TEXT NOT NULL DEFAULT '[]',
                rules TEXT NOT NULL DEFAULT '[]',
                workspace_dir TEXT NOT NULL DEFAULT '.',
                triggers TEXT NOT NULL DEFAULT '[]',
                system_prompt TEXT NOT NULL DEFAULT '',
                is_base INTEGER NOT NULL DEFAULT 0,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS tasks (
                id TEXT PRIMARY KEY,
                title TEXT NOT NULL,
                description TEXT NOT NULL DEFAULT '',
                assigned_to TEXT NOT NULL,
                priority TEXT NOT NULL DEFAULT 'medium',
                status TEXT NOT NULL DEFAULT 'pending',
                created_by TEXT NOT NULL DEFAULT 'user',
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL,
                log TEXT NOT NULL DEFAULT '[]'
            );

            CREATE TABLE IF NOT EXISTS events (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp TEXT NOT NULL,
                agent_id TEXT NOT NULL,
                message TEXT NOT NULL,
                type TEXT NOT NULL DEFAULT 'info'
            );

            CREATE INDEX IF NOT EXISTS idx_events_timestamp ON events(timestamp DESC);
            CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
        """)
        self.conn.commit()

    # ═══════════════════════════════════════════════════════
    #  AGENT CRUD
    # ═══════════════════════════════════════════════════════

    def seed_base_agents(self, base_agents: list[dict]) -> None:
        """Insert or update base agents from registry."""
        assert self.conn
        with self._lock:
            now = _now_iso()
            for a in base_agents:
                existing = self.conn.execute(
                    "SELECT id FROM agents WHERE id = ?", (a["id"],)
                ).fetchone()
                if existing:
                    self.conn.execute("""
                        UPDATE agents SET name=?, icon=?, tier=?, color=?, domain=?,
                            description=?, skills=?, rules=?, workspace_dir=?,
                            triggers=?, system_prompt=?, is_base=1, updated_at=?
                        WHERE id=?
                    """, (
                        a["name"], a["icon"], a["tier"], a["color"], a["domain"],
                        a["desc"], json.dumps(a.get("skills", []), ensure_ascii=False),
                        json.dumps(a.get("rules", []), ensure_ascii=False),
                        a.get("workspace_dir", "."),
                        json.dumps(a.get("triggers", []), ensure_ascii=False),
                        a.get("system_prompt", ""), now, a["id"],
                    ))
                else:
                    self.conn.execute("""
                        INSERT INTO agents (id, name, icon, tier, color, domain,
                            description, skills, rules, workspace_dir, triggers,
                            system_prompt, is_base, created_at, updated_at)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
                    """, (
                        a["id"], a["name"], a["icon"], a["tier"], a["color"],
                        a["domain"], a["desc"],
                        json.dumps(a.get("skills", []), ensure_ascii=False),
                        json.dumps(a.get("rules", []), ensure_ascii=False),
                        a.get("workspace_dir", "."),
                        json.dumps(a.get("triggers", []), ensure_ascii=False),
                        a.get("system_prompt", ""), now, now,
                    ))
            self.conn.commit()

    def get_all_agents(self) -> list[dict]:
        assert self.conn
        rows = self.conn.execute(
            "SELECT * FROM agents ORDER BY is_base DESC, created_at ASC"
        ).fetchall()
        return [self._agent_row_to_dict(r) for r in rows]

    def get_agent(self, agent_id: str) -> dict | None:
        assert self.conn
        row = self.conn.execute(
            "SELECT * FROM agents WHERE id = ?", (agent_id,)
        ).fetchone()
        return self._agent_row_to_dict(row) if row else None

    def create_agent(self, data: dict) -> dict:
        assert self.conn
        now = _now_iso()
        agent_id = data.get("id") or f"agent-{uuid4().hex[:8]}"
        with self._lock:
            self.conn.execute("""
                INSERT INTO agents (id, name, icon, tier, color, domain,
                    description, skills, rules, workspace_dir, triggers,
                    system_prompt, is_base, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?)
            """, (
                agent_id,
                data.get("name", "New Agent"),
                data.get("icon", "\U0001f916"),
                data.get("tier", "WORKER"),
                data.get("color", "#9ca3af"),
                data.get("domain", ""),
                data.get("desc", ""),
                json.dumps(data.get("skills", []), ensure_ascii=False),
                json.dumps(data.get("rules", []), ensure_ascii=False),
                data.get("workspace_dir", "."),
                json.dumps(data.get("triggers", []), ensure_ascii=False),
                data.get("system_prompt", ""),
                now, now,
            ))
            self.conn.commit()
        return self.get_agent(agent_id)  # type: ignore

    def update_agent(self, agent_id: str, data: dict) -> dict | None:
        assert self.conn
        agent = self.get_agent(agent_id)
        if not agent:
            return None
        now = _now_iso()
        fields = []
        values = []
        for key in ("name", "icon", "tier", "color", "domain", "desc", "workspace_dir", "system_prompt"):
            if key in data:
                db_key = "description" if key == "desc" else key
                fields.append(f"{db_key}=?")
                values.append(data[key])
        for key in ("skills", "rules", "triggers"):
            if key in data:
                fields.append(f"{key}=?")
                values.append(json.dumps(data[key], ensure_ascii=False))
        if not fields:
            return agent
        fields.append("updated_at=?")
        values.append(now)
        values.append(agent_id)
        with self._lock:
            self.conn.execute(
                f"UPDATE agents SET {', '.join(fields)} WHERE id=?", values
            )
            self.conn.commit()
        return self.get_agent(agent_id)

    def delete_agent(self, agent_id: str) -> bool:
        assert self.conn
        agent = self.get_agent(agent_id)
        if not agent or agent.get("is_base"):
            return False
        with self._lock:
            self.conn.execute("DELETE FROM agents WHERE id=? AND is_base=0", (agent_id,))
            self.conn.commit()
        return True

    def _agent_row_to_dict(self, row: sqlite3.Row) -> dict:
        return {
            "id": row["id"],
            "name": row["name"],
            "icon": row["icon"],
            "tier": row["tier"],
            "color": row["color"],
            "domain": row["domain"],
            "desc": row["description"],
            "skills": json.loads(row["skills"]),
            "rules": json.loads(row["rules"]),
            "workspace_dir": row["workspace_dir"],
            "triggers": json.loads(row["triggers"]),
            "system_prompt": row["system_prompt"],
            "is_base": bool(row["is_base"]),
            "created_at": row["created_at"],
            "updated_at": row["updated_at"],
        }

    # ═══════════════════════════════════════════════════════
    #  TASK CRUD
    # ═══════════════════════════════════════════════════════

    def create_task(
        self,
        title: str,
        description: str = "",
        assigned_to: str = "",
        priority: str = "medium",
        created_by: str = "user",
    ) -> dict:
        assert self.conn
        task_id = f"task-{uuid4().hex[:8]}"
        now = _now_iso()
        log = [f"[{now}] Task created — assigned to {assigned_to}"]
        with self._lock:
            self.conn.execute("""
                INSERT INTO tasks (id, title, description, assigned_to, priority,
                    status, created_by, created_at, updated_at, log)
                VALUES (?, ?, ?, ?, ?, 'pending', ?, ?, ?, ?)
            """, (
                task_id, title, description, assigned_to, priority,
                created_by, now, now, json.dumps(log, ensure_ascii=False),
            ))
            self.conn.commit()
        return self.get_task(task_id)  # type: ignore

    def list_tasks(self) -> list[dict]:
        assert self.conn
        rows = self.conn.execute(
            "SELECT * FROM tasks ORDER BY created_at DESC"
        ).fetchall()
        return [self._task_row_to_dict(r) for r in rows]

    def get_task(self, task_id: str) -> dict | None:
        assert self.conn
        row = self.conn.execute(
            "SELECT * FROM tasks WHERE id=?", (task_id,)
        ).fetchone()
        return self._task_row_to_dict(row) if row else None

    def update_task_status(self, task_id: str, status: str, log_message: str = "") -> None:
        assert self.conn
        now = _now_iso()
        task = self.get_task(task_id)
        if not task:
            return
        log_list = task["log"]
        if log_message:
            log_list.append(f"[{now}] {log_message}")
        with self._lock:
            self.conn.execute(
                "UPDATE tasks SET status=?, updated_at=?, log=? WHERE id=?",
                (status, now, json.dumps(log_list, ensure_ascii=False), task_id),
            )
            self.conn.commit()

    def _task_row_to_dict(self, row: sqlite3.Row) -> dict:
        return {
            "id": row["id"],
            "title": row["title"],
            "description": row["description"],
            "assigned_to": row["assigned_to"],
            "priority": row["priority"],
            "status": row["status"],
            "created_by": row["created_by"],
            "created_at": row["created_at"],
            "updated_at": row["updated_at"],
            "log": json.loads(row["log"]),
        }

    # ═══════════════════════════════════════════════════════
    #  EVENT CRUD
    # ═══════════════════════════════════════════════════════

    def add_event(self, agent_id: str, message: str, event_type: str = "info") -> None:
        assert self.conn
        now = _now_iso()
        with self._lock:
            self.conn.execute(
                "INSERT INTO events (timestamp, agent_id, message, type) VALUES (?, ?, ?, ?)",
                (now, agent_id, message, event_type),
            )
            # Keep max 2000 events
            self.conn.execute("""
                DELETE FROM events WHERE id NOT IN (
                    SELECT id FROM events ORDER BY id DESC LIMIT 2000
                )
            """)
            self.conn.commit()

    def get_events(self, limit: int = 50, since: str = "") -> list[dict]:
        assert self.conn
        if since:
            rows = self.conn.execute(
                "SELECT * FROM events WHERE timestamp > ? ORDER BY id DESC LIMIT ?",
                (since, limit),
            ).fetchall()
        else:
            rows = self.conn.execute(
                "SELECT * FROM events ORDER BY id DESC LIMIT ?", (limit,)
            ).fetchall()
        return [
            {
                "timestamp": r["timestamp"],
                "agent_id": r["agent_id"],
                "message": r["message"],
                "type": r["type"],
            }
            for r in rows
        ]

    def get_event_count(self) -> int:
        assert self.conn
        row = self.conn.execute("SELECT COUNT(*) as c FROM events").fetchone()
        return row["c"] if row else 0
