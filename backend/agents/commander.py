"""
COWORK.ARMY v7.0 — Commander (Smart Task Routing)
Routes tasks to the best-matching agent using trigger keyword matching.
Falls back to cargo agent for auto-routing.
"""
import json
from datetime import datetime
from pathlib import Path
from ..config import WORKSPACE
from ..database import get_db


async def route_task(task_text: str) -> dict:
    """
    Find the best agent for a given task using keyword triggers.
    Returns {"agent_id": str, "department_id": str, "score": int} or None.
    """
    db = get_db()
    agents = await db.get_all_agents()

    best_agent = None
    best_score = 0

    text_lower = task_text.lower()

    for agent in agents:
        score = 0
        for trigger in agent.get("triggers", []):
            if trigger.lower() in text_lower:
                score += 1
        if score > best_score:
            best_score = score
            best_agent = agent

    if best_agent and best_score > 0:
        return {
            "agent_id": best_agent["id"],
            "department_id": best_agent.get("department_id", ""),
            "agent_name": best_agent["name"],
            "score": best_score,
        }

    # Fallback: route to cargo for analysis
    return {
        "agent_id": "cargo",
        "department_id": None,
        "agent_name": "CargoAgent",
        "score": 0,
    }


async def delegate_task(title: str, description: str) -> dict:
    """
    Full delegation flow:
    1. Route task to best agent
    2. Create task in DB
    3. Deliver to agent inbox
    4. Return result
    """
    db = get_db()

    # Route
    task_text = f"{title} {description}"
    route = await route_task(task_text)
    agent_id = route["agent_id"]
    dept_id = route.get("department_id")

    # Create task
    task_id = f"task-{datetime.now().strftime('%Y%m%d%H%M%S')}"
    task = await db.create_task(
        task_id=task_id,
        title=title,
        desc=description,
        assigned_to=agent_id,
        priority="medium",
        created_by="commander",
        status="pending",
        log=[{"action": "routed", "to": agent_id, "score": route["score"],
              "at": datetime.now().isoformat()}],
        department_id=dept_id,
    )

    # Deliver to inbox
    inbox = WORKSPACE / agent_id / "inbox"
    inbox.mkdir(parents=True, exist_ok=True)
    ts = datetime.now().strftime("%Y%m%d_%H%M%S")
    task_file = inbox / f"TASK-{ts}.json"
    task_file.write_text(json.dumps({
        "title": title,
        "description": description,
        "priority": "medium",
        "created_by": "commander",
        "created_at": datetime.now().isoformat(),
    }, indent=2, ensure_ascii=False))

    await db.add_event(
        agent_id,
        f"Gorev atandi: '{title[:50]}' (skor: {route['score']})",
        "task_created",
        department_id=dept_id,
    )

    return {
        "task": task,
        "routed_to": route,
    }
