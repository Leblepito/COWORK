"""
COWORK.ARMY v7.0 — Cargo Analyzer
Analyzes uploaded files/data to determine target department and agent.
Uses keyword matching with confidence scoring.
"""
import re
from pathlib import Path

# Department keyword maps with weights
DEPARTMENT_KEYWORDS: dict[str, dict[str, list[str]]] = {
    "trade": {
        "school-game": ["egitim", "ogrenme", "elliott", "wave", "smc", "oyun", "game",
                        "quiz", "ders", "trading_school", "lesson"],
        "indicator": ["analiz", "indicator", "sinyal", "signal", "funding", "teknik",
                      "grafik", "chart", "rsi", "macd", "fibonacci", "support",
                      "resistance", "trend"],
        "algo-bot": ["algo", "bot", "backtest", "strateji", "strategy", "otomatik",
                     "automated", "algorithm", "pine", "python_trading"],
    },
    "medical": {
        "clinic": ["klinik", "hastane", "hospital", "hasta", "patient", "randevu",
                   "appointment", "oda", "room", "doktor", "doctor", "hemsire", "nurse"],
        "health-tourism": ["saglik_turizm", "health_tourism", "phuket", "turkiye",
                          "turkey", "transfer", "medikal_seyahat", "medical_travel",
                          "operation", "ameliyat"],
        "manufacturing": ["uretim", "manufacturing", "eldiven", "glove", "maske",
                         "mask", "fabrika", "factory", "tesvik", "incentive",
                         "boi", "eec", "kaucuk", "rubber"],
    },
    "hotel": {
        "hotel": ["otel", "hotel", "oda", "room", "rezervasyon", "reservation",
                  "booking", "konaklama", "accommodation", "misafir", "guest",
                  "check_in", "check_out"],
        "flight": ["ucus", "flight", "bilet", "ticket", "havaalani", "airport",
                   "ucak", "airplane", "seyahat", "travel", "airline"],
        "rental": ["kiralama", "rental", "araba", "car", "motor", "motosiklet",
                   "motorcycle", "arac", "vehicle", "filo", "fleet"],
    },
    "software": {
        "fullstack": ["frontend", "backend", "api", "database", "web", "react",
                      "nextjs", "fastapi", "postgresql", "kod", "code", "gelistirme",
                      "development", "bug", "deploy"],
        "app-builder": ["mobil", "mobile", "app", "uygulama", "application",
                       "electron", "masaustu", "desktop", "flutter", "react_native",
                       "ios", "android"],
        "prompt-engineer": ["prompt", "egitim", "training", "skill", "rolls",
                           "agent_training", "optimize", "system_prompt"],
    },
}

# File type hints
FILE_TYPE_HINTS: dict[str, str] = {
    ".py": "software", ".ts": "software", ".tsx": "software", ".js": "software",
    ".jsx": "software", ".html": "software", ".css": "software",
    ".csv": "trade", ".xlsx": "trade",
    ".pdf": "medical", ".docx": "medical",
    ".json": "software", ".sql": "software",
}


def analyze_content(
    filename: str = "",
    content: str = "",
    description: str = "",
) -> dict:
    """
    Analyze file/data content to determine target department and agent.

    Returns:
        {
            "target_department_id": str,
            "target_agent_id": str,
            "confidence": int (0-100),
            "keywords_found": list[str],
            "reasoning": str,
        }
    """
    text = f"{filename} {content[:5000]} {description}".lower()
    # Normalize: replace special chars with spaces
    text = re.sub(r"[^a-z0-9\süçğışö]", " ", text)
    words = set(text.split())

    scores: dict[str, dict[str, int]] = {}

    for dept_id, agents in DEPARTMENT_KEYWORDS.items():
        scores[dept_id] = {}
        for agent_id, keywords in agents.items():
            score = 0
            matched = []
            for kw in keywords:
                # Check if keyword is in the text (supports multi-word)
                if kw in text or kw.replace("_", " ") in text:
                    score += 10
                    matched.append(kw)
                # Check individual words
                elif kw in words:
                    score += 8
                    matched.append(kw)
            scores[dept_id][agent_id] = score

    # File type hint bonus
    if filename:
        ext = Path(filename).suffix.lower()
        hint_dept = FILE_TYPE_HINTS.get(ext)
        if hint_dept and hint_dept in scores:
            for agent_id in scores[hint_dept]:
                scores[hint_dept][agent_id] += 5

    # Find best match
    best_dept = ""
    best_agent = ""
    best_score = 0
    all_keywords: list[str] = []

    for dept_id, agents in scores.items():
        for agent_id, score in agents.items():
            if score > best_score:
                best_score = score
                best_dept = dept_id
                best_agent = agent_id

    # Collect matched keywords for best
    if best_dept and best_agent:
        for kw in DEPARTMENT_KEYWORDS[best_dept][best_agent]:
            if kw in text or kw.replace("_", " ") in text:
                all_keywords.append(kw)

    # Confidence: map score to 0-100
    confidence = min(100, best_score * 5)

    # Fallback to software/fullstack if nothing matches
    if not best_dept or confidence < 20:
        best_dept = "software"
        best_agent = "fullstack"
        confidence = 15
        reasoning = "Belirgin bir departman eslesmesi bulunamadi, varsayilan olarak Software/FullStack'e yonlendiriliyor."
    else:
        dept_names = {"trade": "Trade", "medical": "Medical", "hotel": "Hotel/Travel", "software": "Software"}
        reasoning = (
            f"Icerik analizi sonucu {dept_names.get(best_dept, best_dept)} departmanina, "
            f"{best_agent} agentine yonlendirildi. "
            f"Bulunan anahtar kelimeler: {', '.join(all_keywords[:10])}"
        )

    return {
        "target_department_id": best_dept,
        "target_agent_id": best_agent,
        "confidence": confidence,
        "keywords_found": all_keywords[:20],
        "reasoning": reasoning,
    }
