"""TF-IDF based smart task routing for COWORK.ARMY."""
from typing import Optional
import structlog

logger = structlog.get_logger()

try:
    from sklearn.feature_extraction.text import TfidfVectorizer
    from sklearn.metrics.pairwise import cosine_similarity
    HAS_SKLEARN = True
except ImportError:
    HAS_SKLEARN = False


class SmartRouter:
    THRESHOLD = 0.3

    def __init__(self) -> None:
        self._agents: list[dict] = []
        self._vectorizer = None
        self._agent_vectors = None
        self._fitted = False

    def fit(self, agents: list[dict]) -> None:
        if not HAS_SKLEARN or not agents:
            self._agents = agents
            return
        self._agents = agents
        corpus = []
        for a in agents:
            text_parts = [
                a.get("description", ""),
                " ".join(a.get("skills", [])),
                " ".join(a.get("triggers", [])),
                a.get("id", "").replace("-", " "),
            ]
            corpus.append(" ".join(text_parts).lower())
        self._vectorizer = TfidfVectorizer(stop_words="english")
        self._agent_vectors = self._vectorizer.fit_transform(corpus)
        self._fitted = True

    def route(self, task_description: str) -> Optional[dict]:
        if not self._agents:
            return None
        if not self._fitted or not HAS_SKLEARN:
            return self._keyword_fallback(task_description)
        task_vector = self._vectorizer.transform([task_description.lower()])
        similarities = cosine_similarity(task_vector, self._agent_vectors)[0]
        best_idx = similarities.argmax()
        best_score = float(similarities[best_idx])
        if best_score < self.THRESHOLD:
            return self._keyword_fallback(task_description)
        return {"agent_id": self._agents[best_idx]["id"], "score": best_score, "method": "tfidf"}

    def _keyword_fallback(self, task_description: str) -> Optional[dict]:
        desc_lower = task_description.lower()
        best_agent, best_count = None, 0
        for a in self._agents:
            count = sum(1 for t in a.get("triggers", []) if t.lower() in desc_lower)
            if count > best_count:
                best_count = count
                best_agent = a
        if best_agent and best_count > 0:
            return {"agent_id": best_agent["id"], "score": best_count * 0.1, "method": "keyword"}
        return None
