"""
COWORK.ARMY v7.0 — Cargo Agent
Orchestrates file/data routing between departments.
1. Receives file/data from user
2. Analyzes content
3. Routes to appropriate department/agent
4. Creates task in target agent's inbox
5. Logs everything to cargo_logs table
"""
import json
from datetime import datetime
from pathlib import Path
from ..config import WORKSPACE
from ..database import get_db
from .analyzer import analyze_content


async def process_cargo(
    filename: str = "",
    content: str = "",
    description: str = "",
    file_size: int = 0,
    file_type: str = "",
) -> dict:
    """
    Main cargo processing pipeline:
    1. Analyze content → determine department/agent
    2. Create cargo log entry
    3. Generate task prompt
    4. Deliver to agent inbox
    5. Return routing result
    """
    db = get_db()

    # Step 1: Analyze
    analysis = analyze_content(filename=filename, content=content, description=description)

    target_dept = analysis["target_department_id"]
    target_agent = analysis["target_agent_id"]
    confidence = analysis["confidence"]

    # Step 2: Generate prompt for target agent
    prompt = _generate_agent_prompt(
        filename=filename,
        content=content[:3000],
        description=description,
        analysis=analysis,
    )

    # Step 3: Create cargo log
    log_id = await db.add_cargo_log({
        "filename": filename,
        "file_type": file_type or (Path(filename).suffix if filename else ""),
        "file_size": file_size,
        "analysis": analysis,
        "target_department_id": target_dept,
        "target_agent_id": target_agent,
        "status": "routing",
        "prompt_generated": prompt,
    })

    # Step 4: Deliver to agent inbox
    try:
        _deliver_to_inbox(target_agent, filename, description, prompt)
        await db.update_cargo_log(log_id, status="delivered")

        # Log event
        await db.add_event(
            "cargo",
            f"Dosya '{filename}' → {target_dept}/{target_agent} (guven: {confidence}%)",
            "cargo_route",
            department_id=target_dept,
        )
    except Exception as e:
        await db.update_cargo_log(log_id, status="failed")
        await db.add_event("cargo", f"Teslimat hatasi: {e}", "error")
        return {
            "success": False,
            "error": str(e),
            "cargo_log_id": log_id,
            "analysis": analysis,
        }

    return {
        "success": True,
        "cargo_log_id": log_id,
        "target_department_id": target_dept,
        "target_agent_id": target_agent,
        "confidence": confidence,
        "reasoning": analysis["reasoning"],
        "keywords_found": analysis["keywords_found"],
    }


def _generate_agent_prompt(
    filename: str,
    content: str,
    description: str,
    analysis: dict,
) -> str:
    """Generate a task prompt that the target agent can understand."""
    parts = []
    if filename:
        parts.append(f"Dosya: {filename}")
    if description:
        parts.append(f"Aciklama: {description}")
    if content:
        parts.append(f"Icerik (ilk 3000 karakter):\n{content[:3000]}")
    parts.append(f"\nAnaliz sonucu: {analysis['reasoning']}")
    parts.append(f"Anahtar kelimeler: {', '.join(analysis['keywords_found'][:10])}")
    parts.append("\nBu icerigi analiz et ve uygun aksiyonlari al.")

    return "\n".join(parts)


def _deliver_to_inbox(agent_id: str, filename: str, description: str, prompt: str):
    """Create a TASK-*.json file in the target agent's inbox."""
    inbox = WORKSPACE / agent_id / "inbox"
    inbox.mkdir(parents=True, exist_ok=True)

    ts = datetime.now().strftime("%Y%m%d_%H%M%S")
    task_file = inbox / f"TASK-cargo-{ts}.json"
    task_data = {
        "title": f"Cargo: {filename or description[:50]}",
        "description": prompt,
        "priority": "medium",
        "created_by": "cargo",
        "created_at": datetime.now().isoformat(),
    }
    task_file.write_text(json.dumps(task_data, indent=2, ensure_ascii=False))


async def delegate_task(
    title: str,
    description: str,
    target_department_id: str | None = None,
    target_agent_id: str | None = None,
) -> dict:
    """
    Manually delegate a task to a specific agent or auto-route.
    If no target specified, uses analyzer to determine best match.
    """
    db = get_db()

    if not target_agent_id:
        # Auto-route using analyzer
        analysis = analyze_content(content=f"{title} {description}")
        target_department_id = analysis["target_department_id"]
        target_agent_id = analysis["target_agent_id"]
    else:
        # Verify agent exists
        agent = await db.get_agent(target_agent_id)
        if not agent:
            return {"error": f"Agent bulunamadi: {target_agent_id}"}
        if not target_department_id:
            target_department_id = agent.get("department_id", "")

    # Create task in DB
    task_id = f"task-{datetime.now().strftime('%Y%m%d%H%M%S')}"
    task = await db.create_task(
        task_id=task_id,
        title=title,
        desc=description,
        assigned_to=target_agent_id,
        priority="medium",
        created_by="cargo",
        status="pending",
        log=[{"action": "created", "by": "cargo", "at": datetime.now().isoformat()}],
        department_id=target_department_id,
    )

    # Deliver to inbox
    _deliver_to_inbox(target_agent_id, "", title, f"{title}\n\n{description}")

    await db.add_event(
        "cargo",
        f"Gorev atandi: '{title[:50]}' → {target_agent_id}",
        "task_created",
        department_id=target_department_id,
    )

    return {
        "success": True,
        "task": task,
        "target_department_id": target_department_id,
        "target_agent_id": target_agent_id,
    }
