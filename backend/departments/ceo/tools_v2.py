"""
COWORK.ARMY — CEO Agent v2 Tools
- get_dept_deep_dive: Departmana özel derinlemesine veri analizi
- brainstorm_improvements: Gemini API ile gerçek LLM brainstorming
- prioritize_and_delegate: Önerileri önceliklendir ve delege et
- generate_continuous_tasks: Her departmana sürekli geliştirme görevi üret
"""
import json
import os
import logging
from datetime import datetime
from pathlib import Path
from ...database.repository import Database
from ...cargo.agent import delegate_task as cargo_delegate_task
from ...config import WORKSPACE

logger = logging.getLogger(__name__)

DEPT_CONTEXT = {
    "trade": {
        "description": "Kripto para ve finansal piyasa analizi, Elliott Wave, SMC, algo trading",
        "agents": ["indicator", "algo-bot", "school-game"],
        "improvement_areas": [
            "Elliott Wave sinyal kalitesini artır",
            "Algo bot backtesting kapsamını genişlet",
            "Yeni kripto para çiftleri için analiz ekle",
            "Risk yönetimi kurallarını güncelle",
            "Funding rate anomali tespitini iyileştir",
        ],
    },
    "medical": {
        "description": "Sağlık turizmi, hasta yönetimi, medikal hizmetler",
        "agents": ["clinic"],
        "improvement_areas": [
            "Hasta takip süreçlerini optimize et",
            "Sağlık turizmi paket önerilerini güncelle",
            "Medikal raporlama formatını geliştir",
            "Uluslararası hasta iletişim protokolünü iyileştir",
        ],
    },
    "hotel": {
        "description": "Otel yönetimi, rezervasyon, misafir deneyimi",
        "agents": ["concierge"],
        "improvement_areas": [
            "Rezervasyon optimizasyon algoritmasını güncelle",
            "Misafir deneyimi puanlama sistemini geliştir",
            "Sezonsal fiyatlandırma stratejisini analiz et",
            "Personel görev dağılımını optimize et",
        ],
    },
    "software": {
        "description": "Yazılım geliştirme, fullstack, prompt engineering, AI entegrasyonu",
        "agents": ["fullstack", "prompt-engineer"],
        "improvement_areas": [
            "API endpoint performansını optimize et",
            "Frontend bileşen mimarisini gözden geçir",
            "Yeni AI entegrasyonu için prompt şablonları yaz",
            "Test kapsamını genişlet",
            "Kod kalitesi metriklerini iyileştir",
        ],
    },
    "bots": {
        "description": "Otomasyon botları, data pipeline, sosyal medya yönetimi",
        "agents": ["social-media", "u2algo-manager"],
        "improvement_areas": [
            "Sosyal medya içerik stratejisini güncelle",
            "Data pipeline hata toleransını artır",
            "Bot performans metriklerini izle",
            "Yeni otomasyon fırsatlarını araştır",
        ],
    },
}

# Cargo agent whitelist
ALLOWED_AGENTS = {
    agent
    for ctx in DEPT_CONTEXT.values()
    for agent in ctx["agents"]
}
ALLOWED_AGENTS.add("ceo")
ALLOWED_AGENTS.add("cargo")

async def get_dept_deep_dive(db: Database, dept: str) -> str:
    """Belirtilen departmana özel derinlemesine veri analizi yapar."""
    events = await db.get_events(department_id=dept, limit=10)
    ctx = DEPT_CONTEXT.get(dept, {})
    summary = [
        f"## {dept.capitalize()} Departmani -- Derinlemesine Analiz",
        f"Alan: {ctx.get('description', 'N/A')}",
        f"Agentlar: {', '.join(ctx.get('agents', []))}",
        "",
        "Son Olaylar:",
    ]
    if events:
        for event in events:
            summary.append(f"- [{event.get('event_type','?')}] {event.get('summary', 'N/A')}")
    else:
        summary.append("- Henuz olay kaydi yok")
    summary.append("")
    summary.append("Gelistirme Alanlari:")
    for area in ctx.get("improvement_areas", []):
        summary.append(f"- {area}")
    return "\n".join(summary)


async def brainstorm_improvements(dept: str, context: str) -> list:
    """Gemini API kullanarak departman icin somut iyilestirme onerileri uretir."""
    api_key = os.environ.get("GEMINI_API_KEY", "")
    dept_ctx = DEPT_CONTEXT.get(dept, {})

    if api_key:
        try:
            import google.generativeai as genai
            genai.configure(api_key=api_key)
            model = genai.GenerativeModel("gemini-2.5-flash")
            prompt = (
                f"Sen COWORK.ARMY sisteminin CEO'susun. {dept.upper()} departmani icin stratejik iyilestirme onerileri uretiyorsun.\n\n"
                f"Departman: {dept}\n"
                f"Alan: {dept_ctx.get('description', '')}\n"
                f"Agentlar: {', '.join(dept_ctx.get('agents', []))}\n\n"
                f"Mevcut bagiam:\n{context[:1500]}\n\n"
                "Lutfen bu departman icin 3 adet somut, uygulanabilir gorev oner. "
                "JSON formatinda yanit ver (sadece JSON):\n"
                '[{"description": "gorev", "department": "' + dept + '", "priority": "high", "agent": "agent_adi"}]'
            )
            response = model.generate_content(prompt)
            text = response.text.strip()
            if "```json" in text:
                text = text.split("```json")[1].split("```")[0].strip()
            elif "```" in text:
                text = text.split("```")[1].split("```")[0].strip()
            improvements = json.loads(text)
            logger.info(f"CEO brainstorm ({dept}): {len(improvements)} oneri uretildi (Gemini)")
            return improvements
        except Exception as e:
            logger.warning(f"Gemini brainstorm hatasi ({dept}): {e} -- fallback")

    # Anthropic fallback
    anthropic_key = os.environ.get("ANTHROPIC_API_KEY", "")
    if anthropic_key:
        try:
            import anthropic
            client = anthropic.Anthropic(api_key=anthropic_key)
            prompt = (
                f"Sen COWORK.ARMY CEO'susun. {dept.upper()} departmani icin 3 somut gorev oner.\n"
                f"Departman: {dept} -- {dept_ctx.get('description', '')}\n"
                f"Agentlar: {', '.join(dept_ctx.get('agents', []))}\n"
                f"Bagiam: {context[:800]}\n\n"
                "Sadece JSON don (baska aciklama ekleme):\n"
                '[{"description": "gorev", "department": "' + dept + '", "priority": "high", "agent": "agent_adi"}]'
            )
            message = client.messages.create(
                model="claude-3-haiku-20240307",
                max_tokens=512,
                messages=[{"role": "user", "content": prompt}],
            )
            text = message.content[0].text.strip()
            if "```" in text:
                text = text.split("```")[1].split("```")[0].strip()
                if text.startswith("json"):
                    text = text[4:].strip()
            improvements = json.loads(text)
            logger.info(f"CEO brainstorm ({dept}): {len(improvements)} oneri uretildi (Claude)")
            return improvements
        except Exception as e:
            logger.warning(f"Anthropic brainstorm hatasi ({dept}): {e} -- statik fallback")

    # Statik fallback
    areas = dept_ctx.get("improvement_areas", [f"{dept} sureclerini optimize et"])
    agents = dept_ctx.get("agents", [dept])
    return [
        {
            "description": areas[i % len(areas)],
            "department": dept,
            "priority": ["high", "medium", "low"][i % 3],
            "agent": agents[i % len(agents)],
        }
        for i in range(min(3, len(areas)))
    ]


async def prioritize_and_delegate(improvements: list) -> list:
    """Onerileri onceliklendirir ve Cargo araciligiyla delege eder."""
    priority_order = {"high": 0, "medium": 1, "low": 2}
    sorted_improvements = sorted(
        improvements, key=lambda x: priority_order.get(x.get("priority", "low"), 2)
    )
    delegated_tasks = []
    for task in sorted_improvements[:3]:
        try:
            await cargo_delegate_task(
                title=task["description"],
                description=f"[CEO BRAINSTORM] {task['description']}",
                target_department_id=task["department"],
            )
            delegated_tasks.append(task)
            logger.info(f"CEO delege etti: {task['description'][:50]} -> {task['department']}")
        except Exception as e:
            logger.error(f"Delege hatasi: {e}")
    return delegated_tasks


async def generate_continuous_tasks(db: Database) -> dict:
    """
    CEO'nun surekli gorev uretim dongusu:
    1. Her departman icin deep dive analiz
    2. Gemini ile brainstorming
    3. En kritik gorevleri delege et
    4. Workspace'e kaydet
    """
    results = {}
    all_improvements = []
    ts = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    logger.info(f"CEO surekli gorev dongusu basladi: {ts}")

    for dept in DEPT_CONTEXT:
        try:
            context = await get_dept_deep_dive(db, dept)
            improvements = await brainstorm_improvements(dept, context)
            results[dept] = improvements
            all_improvements.extend(improvements)
            logger.info(f"CEO brainstorm tamamlandi: {dept} -- {len(improvements)} oneri")
        except Exception as e:
            logger.error(f"CEO dongu hatasi ({dept}): {e}")
            results[dept] = []

    delegated = await prioritize_and_delegate(all_improvements)

    ceo_workspace = WORKSPACE / "ceo"
    ceo_workspace.mkdir(parents=True, exist_ok=True)
    report_file = ceo_workspace / f"brainstorm_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
    report = {
        "timestamp": ts,
        "departments_analyzed": list(results.keys()),
        "total_improvements": len(all_improvements),
        "delegated_count": len(delegated),
        "improvements_by_dept": results,
        "delegated_tasks": delegated,
    }
    report_file.write_text(json.dumps(report, indent=2, ensure_ascii=False))
    logger.info(f"CEO raporu kaydedildi: {report_file}")

    await db.add_event(
        "ceo",
        f"CEO surekli analiz: {len(all_improvements)} oneri uretildi, {len(delegated)} gorev delege edildi",
        "ceo_brainstorm",
        department_id="management",
    )
    return report


CEO_V2_TOOL_DEFINITIONS = [
    {
        "name": "get_dept_deep_dive",
        "description": "Bir departmanin ozel metriklerini ve son olaylarini derinlemesine analiz eder.",
        "input_schema": {
            "type": "object",
            "properties": {"dept": {"type": "string", "enum": list(DEPT_CONTEXT.keys())}},
            "required": ["dept"],
        },
    },
    {
        "name": "brainstorm_improvements",
        "description": "Gemini AI kullanarak departman icin somut iyilestirme gorevleri uretir.",
        "input_schema": {
            "type": "object",
            "properties": {
                "dept": {"type": "string", "enum": list(DEPT_CONTEXT.keys())},
                "context": {"type": "string"},
            },
            "required": ["dept", "context"],
        },
    },
    {
        "name": "prioritize_and_delegate",
        "description": "Iyilestirme onerilerini onceliklendirir ve Cargo araciligiyla delege eder.",
        "input_schema": {
            "type": "object",
            "properties": {
                "improvements": {
                    "type": "array",
                    "items": {"type": "object"},
                }
            },
            "required": ["improvements"],
        },
    },
    {
        "name": "generate_continuous_tasks",
        "description": "Tum departmanlar icin otomatik brainstorming ve gorev delegasyonu yapar.",
        "input_schema": {"type": "object", "properties": {}, "required": []},
    },
]

CEO_V2_TOOLS_IMPL = {
    "get_dept_deep_dive": get_dept_deep_dive,
    "brainstorm_improvements": brainstorm_improvements,
    "prioritize_and_delegate": prioritize_and_delegate,
    "generate_continuous_tasks": generate_continuous_tasks,
}
