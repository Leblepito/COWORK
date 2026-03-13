"""
COWORK.ARMY — AgentWorldModel
Her agent'ın bilişsel durumu: uzmanlık skoru, güven ağı, enerji, hafıza.
"""
import logging
from dataclasses import dataclass, field
from typing import Optional

logger = logging.getLogger("cowork.world_model")

ENERGY_COST_PER_TASK = 0.1       # Görev başlatınca enerji azalır
ENERGY_RECOVERY_SUCCESS = 0.15   # Başarılı görev sonrası enerji kazanımı
ENERGY_RECOVERY_FAIL = 0.05      # Başarısız görev sonrası enerji kazanımı
EXPERTISE_GAIN_SUCCESS = 0.02    # Başarılı görev sonrası uzmanlık artışı
EXPERTISE_LOSS_FAIL = 0.01       # Başarısız görev sonrası uzmanlık kaybı
TRUST_GAIN = 0.05                # Başarılı iş birliği sonrası güven artışı
TRUST_LOSS = 0.03                # Başarısız iş birliği sonrası güven kaybı
DEFAULT_TRUST = 0.5              # Yeni agent için başlangıç güven skoru
MAX_WORKING_MEMORY = 20          # Çalışma belleği kapasitesi


@dataclass
class AgentWorldModel:
    agent_id: str
    expertise_score: float = 0.5
    trust_network: dict = field(default_factory=dict)
    energy_level: float = 1.0
    current_task: Optional[str] = None
    idle_timeout_seconds: int = 300
    working_memory: list = field(default_factory=list)  # son MAX_WORKING_MEMORY mesaj/sonuç

    def start_task(self, task: str) -> None:
        """Mark agent as working on a task. Decreases energy."""
        self.current_task = task
        self.energy_level = max(0.0, self.energy_level - ENERGY_COST_PER_TASK)
        logger.debug(f"[{self.agent_id}] Task started. Energy: {self.energy_level:.2f}")

    def complete_task(self, success: bool) -> None:
        """Mark task as complete. Updates energy and expertise."""
        if success:
            self.energy_level = min(1.0, self.energy_level + ENERGY_RECOVERY_SUCCESS)
            self.expertise_score = min(1.0, self.expertise_score + EXPERTISE_GAIN_SUCCESS)
        else:
            self.energy_level = min(1.0, self.energy_level + ENERGY_RECOVERY_FAIL)
            self.expertise_score = max(0.0, self.expertise_score - EXPERTISE_LOSS_FAIL)
        self.current_task = None
        logger.debug(
            f"[{self.agent_id}] Task {'done' if success else 'failed'}. "
            f"Energy: {self.energy_level:.2f}, Expertise: {self.expertise_score:.2f}"
        )

    def update_trust(self, other_agent: str, success: bool) -> None:
        """Update trust score for a collaborating agent."""
        current = self.trust_network.get(other_agent, DEFAULT_TRUST)
        if success:
            self.trust_network[other_agent] = min(1.0, current + TRUST_GAIN)
        else:
            self.trust_network[other_agent] = max(0.0, current - TRUST_LOSS)

    def is_idle(self) -> bool:
        """Returns True if agent has no current task."""
        return self.current_task is None

    def add_to_working_memory(self, entry: dict) -> None:
        """Add an entry to working memory. Evicts oldest if at capacity."""
        self.working_memory.append(entry)
        if len(self.working_memory) > MAX_WORKING_MEMORY:
            self.working_memory.pop(0)

    def to_dict(self) -> dict:
        """Serialize to dict for WebSocket/API responses."""
        return {
            "agent_id": self.agent_id,
            "expertise_score": self.expertise_score,
            "trust_network": self.trust_network,
            "energy_level": self.energy_level,
            "current_task": self.current_task,
            "idle_timeout_seconds": self.idle_timeout_seconds,
        }


class WorldModelManager:
    """Tüm agent'ların WorldModel'larını yönetir."""

    def __init__(self):
        self._models: dict[str, AgentWorldModel] = {}

    def get_or_create(self, agent_id: str) -> AgentWorldModel:
        """Get existing world model or create a new one."""
        if agent_id not in self._models:
            self._models[agent_id] = AgentWorldModel(agent_id=agent_id)
        return self._models[agent_id]

    def get(self, agent_id: str) -> Optional[AgentWorldModel]:
        """Get existing world model or None."""
        return self._models.get(agent_id)

    def get_all(self) -> dict[str, AgentWorldModel]:
        """Get all world models."""
        return dict(self._models)

    def get_snapshot(self) -> list[dict]:
        """Frontend için tüm agent durumlarının anlık görüntüsü."""
        return [m.to_dict() for m in self._models.values()]


# Global singleton
_manager: Optional[WorldModelManager] = None


def get_world_model_manager() -> WorldModelManager:
    global _manager
    if _manager is None:
        _manager = WorldModelManager()
    return _manager
