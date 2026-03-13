#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
COWORK.ARMY — departments/ceo/tools.py
Tools for the CEO agent.
"""
from ...database.repository import Database
from ...agents.scheduler import AgentScheduler

async def get_system_overview(_db: Database, _scheduler: AgentScheduler) -> str:
    """Gathers a high-level overview of the entire system from the database and scheduler."""
    all_agents = await _db.get_all_agents()
    active_agents = [a for a in all_agents if a.get("status") == "working"]
    recent_events = await _db.get_events(limit=5)
    pending_tasks = await _db.get_tasks(status="pending", limit=10)

    summary_parts = [
        "## Sistem Özeti",
        f"- Toplam Agent: {len(all_agents)}",
        f"- Aktif Agent: {len(active_agents)}",
        f"- Bekleyen Görev: {len(pending_tasks)}",
        f"- Görev Kuyruğu: {_scheduler.queue_size()}",
        f"- Aktif Görev (Scheduler): {_scheduler.active_task_count()}",
        "",
        f"### Son Olaylar ({len(recent_events)})"
    ]

    for event in recent_events:
        dept = event.get("department_id", "system")
        summary_parts.append(f"- [{dept}] {event.get('summary', 'N/A')}")

    return "\n".join(summary_parts)

CEO_TOOL_DEFINITIONS = [
    {
        "name": "get_system_overview",
        "description": "Tüm departmanların, agentların ve görevlerin genel durumunu özetleyen bir rapor alır. Stratejik kararlar vermek için kullanılır.",
        "input_schema": {
            "type": "object",
            "properties": {},
            "required": []
        }
    }
]

CEO_TOOLS_IMPL = {
    "get_system_overview": get_system_overview
}
