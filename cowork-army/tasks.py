"""
COWORK.ARMY — Task Manager
In-memory task store + optional JSON file persistence.
"""
from __future__ import annotations

import json
import os
from datetime import datetime, timezone
from uuid import uuid4


def _now_iso() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


class TaskManager:
    def __init__(self, persist_path: str | None = None):
        self.tasks: dict[str, dict] = {}
        self.persist_path = persist_path
        if persist_path and os.path.exists(persist_path):
            self._load()

    # ── CRUD ────────────────────────────────────────────

    def create(
        self,
        title: str,
        description: str,
        assigned_to: str,
        priority: str = "medium",
        created_by: str = "user",
    ) -> dict:
        task_id = f"task-{uuid4().hex[:8]}"
        now = _now_iso()
        task = {
            "id": task_id,
            "title": title,
            "description": description,
            "assigned_to": assigned_to,
            "priority": priority,
            "status": "pending",
            "created_by": created_by,
            "created_at": now,
            "updated_at": now,
            "log": [f"[{now}] Task created — assigned to {assigned_to}"],
        }
        self.tasks[task_id] = task
        self._save()
        return task

    def list_all(self) -> list[dict]:
        return list(self.tasks.values())

    def update_status(self, task_id: str, status: str, log_message: str = "") -> None:
        task = self.tasks.get(task_id)
        if not task:
            return
        now = _now_iso()
        task["status"] = status
        task["updated_at"] = now
        if log_message:
            task["log"].append(f"[{now}] {log_message}")
        self._save()

    # ── Persistence ─────────────────────────────────────

    def _save(self) -> None:
        if not self.persist_path:
            return
        try:
            with open(self.persist_path, "w", encoding="utf-8") as f:
                json.dump(list(self.tasks.values()), f, indent=2, ensure_ascii=False)
        except OSError:
            pass

    def _load(self) -> None:
        if not self.persist_path:
            return
        try:
            with open(self.persist_path, "r", encoding="utf-8") as f:
                data = json.load(f)
            self.tasks = {t["id"]: t for t in data}
        except (OSError, json.JSONDecodeError, KeyError):
            self.tasks = {}
