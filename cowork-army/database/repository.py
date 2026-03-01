"""
COWORK.ARMY — Database Repository (async CRUD operations)
Replaces old database.py with async PostgreSQL operations.
Returns dicts in the same format as before for backward compatibility.
"""
from datetime import datetime, timezone
from sqlalchemy import select, delete, update, func
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.ext.asyncio import async_sessionmaker
from .models import Agent, Task, Event


class Database:
    def __init__(self, session_factory: async_sessionmaker):
        self._sf = session_factory

    # ── Agent CRUD ──

    async def upsert_agent(self, a: dict):
        """Insert or update an agent."""
        async with self._sf() as session:
            stmt = pg_insert(Agent).values(
                id=a["id"],
                name=a["name"],
                icon=a.get("icon", "🤖"),
                tier=a.get("tier", "WORKER"),
                color=a.get("color", "#64748b"),
                domain=a.get("domain", ""),
                description=a.get("desc", a.get("description", "")),
                skills=a.get("skills", []),
                rules=a.get("rules", []),
                triggers=a.get("triggers", []),
                system_prompt=a.get("system_prompt", ""),
                workspace_dir=a.get("workspace_dir", a["id"]),
                is_base=bool(a.get("is_base", False)),
            )
            stmt = stmt.on_conflict_do_update(
                index_elements=["id"],
                set_={
                    "name": stmt.excluded.name,
                    "icon": stmt.excluded.icon,
                    "tier": stmt.excluded.tier,
                    "color": stmt.excluded.color,
                    "domain": stmt.excluded.domain,
                    "description": stmt.excluded.description,
                    "skills": stmt.excluded.skills,
                    "rules": stmt.excluded.rules,
                    "triggers": stmt.excluded.triggers,
                    "system_prompt": stmt.excluded.system_prompt,
                    "workspace_dir": stmt.excluded.workspace_dir,
                    "is_base": stmt.excluded.is_base,
                    "updated_at": datetime.now(timezone.utc),
                },
            )
            await session.execute(stmt)
            await session.commit()

    async def get_all_agents(self) -> list[dict]:
        """Get all agents, base first, then by created_at."""
        async with self._sf() as session:
            result = await session.execute(
                select(Agent).order_by(Agent.is_base.desc(), Agent.created_at)
            )
            return [self._agent_to_dict(a) for a in result.scalars().all()]

    async def get_agent(self, agent_id: str) -> dict | None:
        """Get a single agent by ID."""
        async with self._sf() as session:
            result = await session.execute(
                select(Agent).where(Agent.id == agent_id)
            )
            agent = result.scalar_one_or_none()
            return self._agent_to_dict(agent) if agent else None

    async def delete_agent(self, agent_id: str) -> bool:
        """Delete a dynamic agent (base agents cannot be deleted)."""
        async with self._sf() as session:
            result = await session.execute(
                delete(Agent).where(Agent.id == agent_id, Agent.is_base == False)
            )
            await session.commit()
            return result.rowcount > 0

    # ── Tasks ──

    async def create_task(self, task_id: str, title: str, desc: str, assigned_to: str,
                          priority: str, created_by: str, status: str, log: list) -> dict:
        """Create a new task."""
        async with self._sf() as session:
            now = datetime.now(timezone.utc)
            task = Task(
                id=task_id, title=title, description=desc,
                assigned_to=assigned_to, priority=priority,
                status=status, created_by=created_by,
                created_at=now, updated_at=now, log=log,
            )
            session.add(task)
            await session.commit()
        return await self.get_task(task_id)

    async def list_tasks(self, limit: int = 100) -> list[dict]:
        """List tasks ordered by creation date."""
        async with self._sf() as session:
            result = await session.execute(
                select(Task).order_by(Task.created_at.desc()).limit(limit)
            )
            return [self._task_to_dict(t) for t in result.scalars().all()]

    async def get_task(self, task_id: str) -> dict | None:
        """Get a single task by ID."""
        async with self._sf() as session:
            result = await session.execute(
                select(Task).where(Task.id == task_id)
            )
            task = result.scalar_one_or_none()
            return self._task_to_dict(task) if task else None

    async def update_task(self, task_id: str, **kwargs):
        """Update task fields."""
        async with self._sf() as session:
            kwargs["updated_at"] = datetime.now(timezone.utc)
            await session.execute(
                update(Task).where(Task.id == task_id).values(**kwargs)
            )
            await session.commit()

    # ── Events ──

    async def add_event(self, agent_id: str, message: str, etype: str = "info"):
        """Add an event."""
        async with self._sf() as session:
            event = Event(agent_id=agent_id, message=message, type=etype)
            session.add(event)
            await session.commit()

    async def get_events(self, limit: int = 50, since: str = "") -> list[dict]:
        """Get events, optionally since a timestamp."""
        async with self._sf() as session:
            query = select(Event)
            if since:
                try:
                    since_dt = datetime.fromisoformat(since.replace("Z", "+00:00"))
                    query = query.where(Event.timestamp > since_dt)
                except ValueError:
                    pass
            query = query.order_by(Event.id.desc()).limit(limit)
            result = await session.execute(query)
            return [self._event_to_dict(e) for e in result.scalars().all()]

    async def get_event_count(self) -> int:
        """Get total event count."""
        async with self._sf() as session:
            result = await session.execute(select(func.count(Event.id)))
            return result.scalar() or 0

    # ── Seed ──

    async def seed_base_agents(self, agents: list[dict]):
        """Seed base agents using upsert."""
        for a in agents:
            await self.upsert_agent(a)

    # ── Dict converters (backward compatibility) ──

    @staticmethod
    def _agent_to_dict(a: Agent) -> dict:
        return {
            "id": a.id, "name": a.name, "icon": a.icon, "tier": a.tier,
            "color": a.color, "domain": a.domain, "desc": a.description,
            "skills": a.skills or [], "rules": a.rules or [],
            "triggers": a.triggers or [], "system_prompt": a.system_prompt,
            "workspace_dir": a.workspace_dir, "is_base": a.is_base,
            "created_at": a.created_at.isoformat() if a.created_at else "",
        }

    @staticmethod
    def _task_to_dict(t: Task) -> dict:
        return {
            "id": t.id, "title": t.title, "description": t.description,
            "assigned_to": t.assigned_to, "priority": t.priority,
            "status": t.status, "created_by": t.created_by,
            "created_at": t.created_at.isoformat() if t.created_at else "",
            "updated_at": t.updated_at.isoformat() if t.updated_at else "",
            "log": t.log or [],
        }

    @staticmethod
    def _event_to_dict(e: Event) -> dict:
        return {
            "timestamp": e.timestamp.isoformat() if e.timestamp else "",
            "agent_id": e.agent_id, "message": e.message, "type": e.type,
        }
