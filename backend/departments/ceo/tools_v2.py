import json
from ...database.repository import Database
from ...cargo.agent import delegate_task as cargo_delegate_task

async def get_dept_deep_dive(db: Database, dept: str) -> str:
    """Belirtilen departmana özel derinlemesine veri analizi yapar."""
    events = await db.get_events(department_id=dept, limit=5)
    summary = [f"## {dept.capitalize()} Departmanı Derinlemesine Analiz"]
    for event in events:
        summary.append(f"- {event.get('summary', 'N/A')}")
    return "\n".join(summary)

async def brainstorm_improvements(dept: str, context: str) -> list:
    """LLM kullanarak belirli bir departman için iyileştirme önerileri geliştirir."""
    # Gerçek bir LLM çağrısı yerine, şimdilik mock bir yanıt döndürelim
    return [
        {"description": f"{dept} için otomatik raporlama sistemi kur.", "department": dept, "priority": "high"},
        {"description": f"{dept} verimliliğini artırmak için yeni bir araç geliştir.", "department": dept, "priority": "medium"},
    ]

async def prioritize_and_delegate(improvements: list) -> list:
    """Önerileri önceliklendirir ve delege eder."""
    delegated_tasks = []
    for task in improvements:
        await cargo_delegate_task(title=task["description"], description=task["description"], target_department_id=task["department"])
        delegated_tasks.append(task)
    return delegated_tasks

CEO_V2_TOOL_DEFINITIONS = [
    {
        "name": "get_dept_deep_dive",
        "description": "Bir departmanın özel metriklerini ve son olaylarını derinlemesine analiz eder.",
        "input_schema": {
            "type": "object",
            "properties": {"dept": {"type": "string"}},
            "required": ["dept"]
        }
    },
    {
        "name": "brainstorm_improvements",
        "description": "Verilen bağlamı kullanarak bir departman için iyileştirme önerileri üretir.",
        "input_schema": {
            "type": "object",
            "properties": {"dept": {"type": "string"}, "context": {"type": "string"}},
            "required": ["dept", "context"]
        }
    },
    {
        "name": "prioritize_and_delegate",
        "description": "İyileştirme önerilerini önceliklendirir ve en önemlilerini ilgili departmanlara delege eder.",
        "input_schema": {
            "type": "object",
            "properties": {"improvements": {"type": "array", "items": {"type": "object"}}},
            "required": ["improvements"]
        }
    }
]

CEO_V2_TOOLS_IMPL = {
    "get_dept_deep_dive": get_dept_deep_dive,
    "brainstorm_improvements": brainstorm_improvements,
    "prioritize_and_delegate": prioritize_and_delegate,
}
