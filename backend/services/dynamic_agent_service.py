"""
COWORK.ARMY v8.0 — Dynamic Agent Service
Creates project-specific Director (Manager) agents on demand.
Each manager is created with skills and rules tailored to the project.
"""
from __future__ import annotations
import json
import re
from datetime import datetime
from ..agents.llm_providers import get_llm_provider


# Predefined skill sets for each department
DEPARTMENT_SKILL_SETS = {
    "trade": [
        "elliott-wave-analysis", "smc-smart-money-concepts", "technical-analysis",
        "multi-timeframe-analysis", "risk-management", "backtesting",
        "ccxt-binance-integration", "real-time-market-data",
    ],
    "software": [
        "python", "fastapi", "react", "typescript", "postgresql",
        "docker", "git", "testing", "api-design", "system-architecture",
    ],
    "medical": [
        "health-tourism", "patient-coordination", "medical-translation",
        "hipaa-compliance", "appointment-scheduling", "multilingual-support",
    ],
    "hotel": [
        "hotel-management", "reservation-systems", "guest-services",
        "revenue-management", "travel-coordination", "customer-relations",
    ],
    "bots": [
        "social-media-management", "content-automation", "web-scraping",
        "data-pipeline", "scheduling", "api-integration",
    ],
}

# Department detection keywords
DEPARTMENT_KEYWORDS = {
    "trade": ["trade", "trading", "algo", "bot", "binance", "crypto", "bitcoin", "signal", "indicator", "chart", "elliott", "smc"],
    "software": ["software", "code", "develop", "app", "api", "backend", "frontend", "web", "mobile", "python", "react"],
    "medical": ["medical", "health", "patient", "doctor", "hospital", "clinic", "tourism", "sağlık", "hasta"],
    "hotel": ["hotel", "otel", "reservation", "booking", "guest", "travel", "room", "accommodation"],
    "bots": ["bot", "automation", "social", "twitter", "x.com", "post", "schedule", "scrape"],
}


def _detect_department(task_text: str) -> str:
    """Detect the most relevant department from task text."""
    text_lower = task_text.lower()
    scores = {dept: 0 for dept in DEPARTMENT_KEYWORDS}
    for dept, keywords in DEPARTMENT_KEYWORDS.items():
        for kw in keywords:
            if kw in text_lower:
                scores[dept] += 1
    best = max(scores, key=scores.get)
    return best if scores[best] > 0 else "software"


def _generate_agent_id(name: str) -> str:
    """Generate a URL-safe agent ID from a name."""
    slug = re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-")
    ts = datetime.now().strftime("%m%d%H%M")
    return f"{slug[:30]}-{ts}"


class DynamicAgentService:
    """Creates and manages dynamically generated Director agents."""

    def __init__(self):
        self.llm = get_llm_provider()

    async def create_manager_for_project(self, project_description: str) -> dict:
        """
        Analyze a project description and create a tailored Director agent.
        Returns the agent definition dict or an error dict.
        """
        dept = _detect_department(project_description)
        dept_skills = DEPARTMENT_SKILL_SETS.get(dept, DEPARTMENT_SKILL_SETS["software"])

        prompt = f"""You are a system architect for COWORK.ARMY, an AI agent orchestration platform.

A new project has been submitted:
"{project_description}"

Detected department: {dept}

Create a Director Agent definition for this project. The director will:
1. Break down the project into sub-tasks
2. Spawn and manage worker agents
3. Ensure quality and completion

Available skills for this department: {', '.join(dept_skills)}

Respond ONLY with valid JSON in this exact format:
{{
  "name": "Short descriptive name (max 5 words)",
  "department_id": "{dept}",
  "domain": "One-line domain description",
  "desc": "Two-sentence description of what this director does",
  "skills": ["skill1", "skill2", "skill3"],
  "rules": ["Rule 1 (max 15 words)", "Rule 2 (max 15 words)", "Rule 3 (max 15 words)"],
  "system_prompt": "You are [name], a Director Agent at COWORK.ARMY. [2-3 sentences about your role and approach.]"
}}

Choose 3-5 most relevant skills from the available list. Rules must be specific to this project."""

        try:
            response = self.llm.get_response(
                system_prompt="You are a precise JSON generator. Output only valid JSON, no markdown, no explanation.",
                messages=[{"role": "user", "content": prompt}],
                tools=[],
            )

            # Extract text from response
            text = ""
            for block in response.content:
                if block.type == "text":
                    text += block.text

            # Parse JSON — handle markdown code blocks if present
            text = text.strip()
            if text.startswith("```"):
                text = re.sub(r"```(?:json)?\n?", "", text).strip()

            agent_def = json.loads(text)

            # Generate a unique ID
            agent_def["id"] = _generate_agent_id(agent_def.get("name", "director"))
            agent_def["tier"] = "DIRECTOR"
            agent_def["icon"] = "🎯"
            agent_def["created_at"] = datetime.now().isoformat()
            agent_def["created_by"] = "dynamic-agent-service"

            return agent_def

        except json.JSONDecodeError as e:
            return {"error": f"Failed to parse agent definition JSON: {e}", "raw": text}
        except Exception as e:
            return {"error": f"Failed to generate agent definition: {e}"}

    def is_complex_project(self, title: str, description: str) -> bool:
        """
        Determine if a task is complex enough to warrant a new Director agent.
        Heuristics: long description, project keywords, multi-step indicators.
        """
        combined = f"{title} {description}".lower()
        complexity_keywords = [
            "project", "proje", "develop", "geliştir", "build", "inşa",
            "create", "oluştur", "system", "sistem", "platform", "full",
            "complete", "tamamla", "implement", "uygula", "design", "tasarla",
        ]
        keyword_count = sum(1 for kw in complexity_keywords if kw in combined)
        word_count = len(combined.split())
        return keyword_count >= 2 or word_count >= 30
