"""
COWORK.ARMY v8.0 — Commander (Smart Task Routing + Dynamic Manager Creation)
Routes tasks to the best-matching agent using keyword triggers.
For complex projects, dynamically creates a Director agent with tailored skills/rules.
Falls back to cargo agent for auto-routing.
"""
import json
from datetime import datetime
from pathlib import Path
from ..config import WORKSPACE
from ..database import get_db
from ..services.dynamic_agent_service import DynamicAgentService


async def route_task(task_text: str) -> dict:
    """
    Find the best agent for a given task using keyword triggers.
    Returns {"agent_id": str, "department_id": str, "score": int} or fallback.
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
            "routing_type": "keyword_match",
        }

    # Fallback: route to cargo for analysis
    return {
        "agent_id": "cargo",
        "department_id": None,
        "agent_name": "CargoAgent",
        "score": 0,
        "routing_type": "fallback",
    }


async def delegate_task(title: str, description: str) -> dict:
    """
    Full delegation flow v8.0:
    1. Check if task is complex enough for a new Director agent
    2. If complex: create a Director agent dynamically with tailored skills/rules
    3. If simple: route to best existing agent via keyword matching
    4. Create task in DB, deliver to agent inbox
    5. Return result
    """
    db = get_db()
    task_text = f"{title} {description}"

    # Step 1: Check complexity
    dynamic_service = DynamicAgentService()
    manager_def = None

    if dynamic_service.is_complex_project(title, description):
        # Step 2: Create a Director agent for this project
        manager_def = await dynamic_service.create_manager_for_project(task_text)
        if "error" not in manager_def:
            # Save the new director agent to DB
            try:
                await db.create_agent(
                    agent_id=manager_def["id"],
                    name=manager_def["name"],
                    icon=manager_def.get("icon", "🎯"),
                    tier=manager_def.get("tier", "DIRECTOR"),
                    domain=manager_def.get("domain", ""),
                    desc=manager_def.get("desc", ""),
                    system_prompt=manager_def.get("system_prompt", ""),
                    department_id=manager_def.get("department_id"),
                    skills=manager_def.get("skills", []),
                    rules=manager_def.get("rules", []),
                )
                route = {
                    "agent_id": manager_def["id"],
                    "department_id": manager_def.get("department_id"),
                    "agent_name": manager_def["name"],
                    "score": 10,
                    "routing_type": "dynamic_director",
                    "director_skills": manager_def.get("skills", []),
                    "director_rules": manager_def.get("rules", []),
                }
            except Exception as e:
                # If DB save fails, fall back to keyword routing
                manager_def = None
                route = await route_task(task_text)
        else:
            # LLM failed to generate agent, fall back
            manager_def = None
            route = await route_task(task_text)
    else:
        # Step 3: Simple task — keyword routing
        route = await route_task(task_text)

    agent_id = route["agent_id"]
    dept_id = route.get("department_id")

    # Step 4: Create task in DB
    task_id = f"task-{datetime.now().strftime('%Y%m%d%H%M%S')}"
    task = await db.create_task(
        task_id=task_id,
        title=title,
        desc=description,
        assigned_to=agent_id,
        priority="medium",
        created_by="commander",
        status="pending",
        log=[{
            "action": "routed",
            "to": agent_id,
            "score": route["score"],
            "routing_type": route.get("routing_type", "keyword_match"),
            "at": datetime.now().isoformat(),
        }],
        department_id=dept_id,
    )

    # Deliver to agent inbox
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
        "routing_type": route.get("routing_type"),
        "director_skills": route.get("director_skills", []),
        "director_rules": route.get("director_rules", []),
    }, indent=2, ensure_ascii=False))

    routing_msg = f"Gorev atandi: '{title[:50]}' -> {agent_id} ({route.get('routing_type', 'keyword')})"
    await db.add_event(
        agent_id,
        routing_msg,
        "task_created",
        department_id=dept_id,
    )

    return {
        "task": task,
        "routed_to": route,
        "director_created": manager_def is not None,
        "director_def": manager_def if manager_def else None,
    }
