"""
COWORK.ARMY — Commander (task routing + dynamic agent creation)
All functions are async for PostgreSQL compatibility.
"""
import uuid, json
from datetime import datetime
from database import get_db
from pathlib import Path

WORKSPACE = Path(__file__).parent / "workspace"


async def route_task(title: str, description: str) -> str:
    """Route task to best agent using keyword triggers."""
    text = (title + " " + description).lower()
    db = get_db()
    agents = await db.get_all_agents()
    best_id = ""
    best_score = 0
    for a in agents:
        score = sum(1 for t in a.get("triggers", []) if t.lower() in text)
        if score > best_score:
            best_score = score
            best_id = a["id"]
    return best_id if best_score > 0 else ""


async def delegate_task(title: str, description: str, priority: str = "normal") -> dict:
    """Full delegation: route → create task → return result."""
    db = get_db()
    target = await route_task(title, description)
    task_id = f"TASK-{uuid.uuid4().hex[:8].upper()}"
    ts = datetime.now().strftime('%H:%M:%S')
    log = [f"[{ts}] Görev oluşturuldu"]

    if target:
        log.append(f"[{ts}] Commander → {target}")
        status = "pending"
    else:
        target = "commander"
        status = "needs_new_agent"
        log.append(f"[{ts}] Eşleşen agent yok → Commander değerlendirecek")

    task = await db.create_task(task_id, title, description, target, priority, "commander", status, log)

    # Deliver to agent inbox
    if target:
        inbox = WORKSPACE / target / "inbox"
        inbox.mkdir(parents=True, exist_ok=True)
        (inbox / f"{task_id}.json").write_text(json.dumps(task, indent=2, ensure_ascii=False))

    await db.add_event(target, f"Görev atandı: {title[:60]}", "task_created")
    return task


async def create_dynamic_agent(agent_id: str, name: str, icon: str, domain: str, desc: str,
                               skills: list, rules: list, triggers: list, system_prompt: str) -> dict:
    """Create a new dynamic agent with full workspace setup."""
    db = get_db()
    ws = WORKSPACE / agent_id
    ws.mkdir(parents=True, exist_ok=True)
    (ws / "inbox").mkdir(exist_ok=True)
    (ws / "output").mkdir(exist_ok=True)

    readme = f"# {icon} {name}\n## {domain}\n{desc}\n\n### Skills\n" + "\n".join(f"- {s}" for s in skills)
    readme += f"\n\n### Rules\n" + "\n".join(f"{i+1}. {r}" for i, r in enumerate(rules))
    readme += f"\n\n### System Prompt\n{system_prompt}\n"
    (ws / "README.md").write_text(readme, encoding="utf-8")
    (ws / "gorevler.md").write_text(f"# {icon} {name} — Görevler\n\n## Aktif\n_Boş_\n\n## Tamamlanan\n_Boş_\n", encoding="utf-8")

    agent_data = {
        "id": agent_id, "name": name, "icon": icon, "tier": "WORKER",
        "color": "#9ca3af", "domain": domain, "desc": desc,
        "skills": skills, "rules": rules, "triggers": triggers,
        "system_prompt": system_prompt, "workspace_dir": agent_id, "is_base": 0,
    }
    await db.upsert_agent(agent_data)
    await db.add_event(agent_id, f"Yeni agent oluşturuldu: {name}", "info")
    return {"status": "created", "agent_id": agent_id, "workspace": str(ws)}
