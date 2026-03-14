"""
COWORK.ARMY — CEO + Cargo Consultation System
When a task arrives, CEO and Cargo consult together to decide:
1. Which department should handle it
2. Which specific agent is best suited
3. What format the input needs to be converted to
4. Cargo converts the input to the right format and delivers it
"""
import json
import re
from datetime import datetime
from pathlib import Path
from ..config import WORKSPACE
from ..database import get_db
from .analyzer import analyze_content, DEPARTMENT_KEYWORDS

# File format converters
def _convert_to_agent_format(content: str, filename: str, target_dept: str, target_agent: str) -> str:
    """Convert raw input to the format best understood by the target agent."""
    ext = Path(filename).suffix.lower() if filename else ""

    # Trade agents: want structured market data
    if target_dept == "trade":
        if ext in (".csv", ".xlsx"):
            return f"[MARKET DATA]\nDosya: {filename}\nVeri:\n{content[:5000]}\n\nBu veriyi Elliott Wave ve SMC perspektifinden analiz et."
        return f"[TRADE TASK]\n{content}\n\nTeknik analiz yap, sinyal üret ve risk/ödül oranını belirt."

    # Medical agents: want structured patient/clinical data
    elif target_dept == "medical":
        if ext == ".pdf":
            return f"[MEDIKAL DOSYA]\nDosya: {filename}\nİçerik:\n{content[:5000]}\n\nHasta bilgilerini çıkar, uygun tedavi planı öner."
        return f"[MEDIKAL GÖREV]\n{content}\n\nKlinik protokollere uygun şekilde değerlendir."

    # Hotel agents: want booking/travel structured data
    elif target_dept == "hotel":
        return f"[OTEL/SEYAHAT GÖREVİ]\n{content}\n\nRezervasyonu işle, müsaitlik kontrol et ve en iyi seçeneği sun."

    # Software agents: want technical specs
    elif target_dept == "software":
        if ext in (".py", ".ts", ".tsx", ".js", ".jsx"):
            return f"[KOD GÖREVİ]\nDosya: {filename}\nKod:\n```{ext[1:]}\n{content[:5000]}\n```\n\nKodu incele, hataları düzelt ve geliştirme önerileri sun."
        return f"[YAZILIM GÖREVİ]\n{content}\n\nTeknik gereksinimler doğrultusunda çözüm geliştir."

    # Bots agents: want automation specs
    elif target_dept == "bots":
        return f"[OTOMASYON GÖREVİ]\n{content}\n\nOtomasyon akışını tasarla ve uygula."

    # Default
    return content


def _ceo_decide(content: str, filename: str, description: str, analysis: dict) -> dict:
    """
    CEO's strategic decision on task routing.
    Uses the analyzer result + additional heuristics.
    Returns enriched routing decision with reasoning.
    """
    target_dept = analysis["target_department_id"]
    target_agent = analysis["target_agent_id"]
    confidence = analysis["confidence"]

    # CEO applies strategic override rules
    reasoning_parts = [f"Analyzer: {analysis['reasoning']}"]

    # If confidence is low, CEO defaults to software (most general)
    if confidence < 40:
        target_dept = "software"
        target_agent = "fullstack"
        reasoning_parts.append("CEO: Düşük güven skoru — Software/Fullstack'e yönlendiriliyor.")

    # CEO checks for multi-department tasks
    dept_scores: dict[str, int] = {}
    text = f"{content} {description}".lower()
    for dept, agents in DEPARTMENT_KEYWORDS.items():
        score = 0
        for agent_kws in agents.values():
            for kw in agent_kws:
                if kw in text:
                    score += 1
        if score > 0:
            dept_scores[dept] = score

    # If multiple departments score high, CEO picks the highest
    if dept_scores:
        best_dept = max(dept_scores, key=lambda d: dept_scores[d])
        if best_dept != target_dept and dept_scores.get(best_dept, 0) > dept_scores.get(target_dept, 0):
            target_dept = best_dept
            # Pick best agent in that dept
            best_agent = target_agent
            best_score = 0
            for agent_id, kws in DEPARTMENT_KEYWORDS.get(best_dept, {}).items():
                s = sum(1 for kw in kws if kw in text)
                if s > best_score:
                    best_score = s
                    best_agent = agent_id
            target_agent = best_agent
            reasoning_parts.append(f"CEO: Çoklu departman analizi — {best_dept}/{best_agent} daha uygun.")

    return {
        "target_department_id": target_dept,
        "target_agent_id": target_agent,
        "confidence": max(confidence, 50),  # CEO boosts confidence
        "reasoning": " | ".join(reasoning_parts),
        "ceo_approved": True,
        "cargo_converted": True,
    }


async def consult_and_route(
    title: str,
    description: str = "",
    content: str = "",
    filename: str = "",
    file_type: str = "",
    file_size: int = 0,
) -> dict:
    """
    Main CEO+Cargo consultation pipeline:
    1. Cargo analyzes the input
    2. CEO reviews and approves/overrides routing
    3. Cargo converts input to target format
    4. Cargo delivers to agent inbox
    5. Both log the consultation
    """
    db = get_db()
    ts = datetime.now().isoformat()

    # Step 1: Cargo analyzes
    analysis = analyze_content(
        filename=filename,
        content=f"{title} {description} {content}",
        description=description,
    )

    # Step 2: CEO reviews and decides
    decision = _ceo_decide(content=f"{title} {description} {content}", filename=filename, description=description, analysis=analysis)

    target_dept = decision["target_department_id"]
    target_agent = decision["target_agent_id"]

    # Step 3: Cargo converts input to agent-friendly format
    converted_content = _convert_to_agent_format(
        content=f"{title}\n\n{description}\n\n{content}",
        filename=filename,
        target_dept=target_dept,
        target_agent=target_agent,
    )

    # Step 4: Log CEO consultation event
    await db.add_event(
        "ceo",
        f"CEO+Cargo istişaresi: '{title[:40]}' → {target_dept}/{target_agent} (güven: {decision['confidence']}%)",
        "ceo_consult",
        department_id="management",
    )

    # Step 5: Cargo delivers to agent inbox
    inbox = WORKSPACE / target_agent / "inbox"
    inbox.mkdir(parents=True, exist_ok=True)
    ts_str = datetime.now().strftime("%Y%m%d_%H%M%S")
    task_file = inbox / f"TASK-consult-{ts_str}.json"
    task_data = {
        "title": title,
        "description": converted_content,
        "priority": "high",
        "created_by": "ceo+cargo",
        "created_at": ts,
        "routing": decision,
        "original_filename": filename,
        "file_type": file_type,
    }
    task_file.write_text(json.dumps(task_data, indent=2, ensure_ascii=False))

    # Step 6: Log Cargo delivery event
    await db.add_event(
        "cargo",
        f"Cargo teslim: '{title[:40]}' → {target_agent} (format dönüştürüldü)",
        "cargo_route",
        department_id=target_dept,
    )

    # Step 7: Create task in DB
    task_id = f"task-consult-{ts_str}"
    await db.create_task(
        task_id=task_id,
        title=title,
        desc=converted_content,
        assigned_to=target_agent,
        priority="high",
        created_by="ceo+cargo",
        status="pending",
        log=[{"action": "created", "by": "ceo+cargo", "at": ts}],
        department_id=target_dept,
    )

    return {
        "success": True,
        "task_id": task_id,
        "target_department_id": target_dept,
        "target_agent_id": target_agent,
        "confidence": decision["confidence"],
        "reasoning": decision["reasoning"],
        "ceo_approved": True,
        "cargo_converted": True,
        "format_applied": f"{target_dept}_format",
    }
