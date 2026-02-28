"""
COWORK.ARMY — Commander Router
Keyword-based task routing + dynamic agent creation when no match found.
"""
from __future__ import annotations

import re
import unicodedata
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from database import Database

# Icon pool for dynamic agents
_ICON_POOL = [
    "\U0001f916", "\U0001f9be", "\U0001f680", "\U0001f4a1", "\U0001f52e",
    "\U0001f3af", "\U0001f9ea", "\U0001f4bb", "\U0001f30d", "\U0001f527",
    "\U0001f4d0", "\U0001f3a8", "\U0001f9d1\u200d\U0001f4bb", "\U0001f50d",
    "\u2699\ufe0f", "\U0001f4ca",
]

# Color pool for dynamic agents
_COLOR_POOL = [
    "#f97316", "#06b6d4", "#10b981", "#f43f5e", "#8b5cf6",
    "#ec4899", "#14b8a6", "#eab308", "#6366f1", "#84cc16",
]


def _slugify(text: str) -> str:
    """Convert text to a slug suitable for agent ID."""
    text = text.lower().strip()
    text = unicodedata.normalize("NFKD", text)
    text = re.sub(r"[^\w\s-]", "", text)
    text = re.sub(r"[\s_]+", "-", text)
    text = text.strip("-")[:30]
    return text or "dynamic-agent"


class CommanderRouter:
    """Route tasks to agents based on keyword matching from DB triggers."""

    def __init__(self, db: Database) -> None:
        self.db = db

    def _build_patterns(self) -> dict[str, tuple[str, list[re.Pattern[str]]]]:
        """Build regex patterns from current DB agents."""
        patterns: dict[str, tuple[str, list[re.Pattern[str]]]] = {}
        for agent in self.db.get_all_agents():
            triggers = agent.get("triggers", [])
            if not triggers:
                continue
            compiled = [
                re.compile(rf"\b{re.escape(kw)}\b", re.IGNORECASE | re.UNICODE)
                for kw in triggers
            ]
            patterns[agent["id"]] = (agent["name"], compiled)
        return patterns

    def route(self, text: str) -> tuple[str, str, int]:
        """
        Analyze text and return (agent_id, agent_name, match_count).
        Falls back to 'web-dev' if no keyword matches.
        """
        patterns = self._build_patterns()
        scores: dict[str, int] = {}
        for agent_id, (_, pats) in patterns.items():
            hits = sum(1 for p in pats if p.search(text))
            if hits > 0:
                scores[agent_id] = hits

        if not scores:
            web_dev = self.db.get_agent("web-dev")
            if web_dev:
                return web_dev["id"], web_dev["name"], 0
            return "web-dev", "Full-Stack Geliştirici", 0

        best_id = max(scores, key=lambda k: scores[k])
        best_name = patterns[best_id][0]
        return best_id, best_name, scores[best_id]

    def auto_create_agent(self, task_text: str) -> dict | None:
        """
        Analyze task text and create a new dynamic agent.
        Returns the created agent dict or None.
        """
        words = re.findall(r"\b\w{3,}\b", task_text.lower())
        # Filter out common stop words
        stop = {
            "bir", "için", "yeni", "olan", "ile", "den", "dan", "the",
            "and", "for", "new", "this", "that", "with", "from",
            "oluştur", "yap", "ekle", "geliştir", "kur",
        }
        keywords = [w for w in words if w not in stop][:10]

        if not keywords:
            return None

        # Generate agent properties from keywords
        agent_id = _slugify("-".join(keywords[:3]))
        # Ensure unique ID
        existing = self.db.get_agent(agent_id)
        if existing:
            agent_id = f"{agent_id}-{len(self.db.get_all_agents())}"

        name_parts = [w.capitalize() for w in keywords[:3]]
        agent_name = " ".join(name_parts) + " Agent"

        # Pick icon and color deterministically
        hash_val = sum(ord(c) for c in agent_id)
        icon = _ICON_POOL[hash_val % len(_ICON_POOL)]
        color = _COLOR_POOL[hash_val % len(_COLOR_POOL)]

        # Build skills from keywords
        skills = [f"{kw}_analysis" for kw in keywords[:5]]
        skills.extend(["research", "implementation", "reporting"])

        # Build system prompt
        system_prompt = (
            f"Sen {agent_name}'sin. Görevin: {task_text[:200]}. "
            f"Anahtar alanların: {', '.join(keywords[:5])}. "
            f"Workspace'indeki dosyaları oku, analiz et ve sonuçları raporla. "
            f"Türkçe yanıt ver."
        )

        agent_data = {
            "id": agent_id,
            "name": agent_name,
            "icon": icon,
            "tier": "WORKER",
            "color": color,
            "domain": " / ".join(name_parts),
            "desc": f"Dinamik oluşturulmuş agent: {task_text[:100]}",
            "skills": skills,
            "rules": ["Commander tarafından otomatik oluşturuldu"],
            "workspace_dir": ".",
            "triggers": keywords[:8],
            "system_prompt": system_prompt,
        }

        return self.db.create_agent(agent_data)
