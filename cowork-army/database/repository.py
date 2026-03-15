"""
COWORK.ARMY — Database Repository (async CRUD operations)
Replaces old database.py with async PostgreSQL operations.
Returns dicts in the same format as before for backward compatibility.
"""
from datetime import datetime, timezone, timedelta
from functools import wraps
from sqlalchemy import select, delete, update, func
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.ext.asyncio import async_sessionmaker
from sqlalchemy.exc import OperationalError, InterfaceError
from tenacity import retry, stop_after_attempt, wait_exponential, retry_if_exception_type
from .models import Agent, Task, Event, LlmUsage, TaskHistory


def db_retry(func):
    """Tenacity retry decorator for transient DB errors (OperationalError, InterfaceError)."""
    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=0.5, min=0.5, max=4),
        retry=retry_if_exception_type((OperationalError, InterfaceError)),
        reraise=True,
    )
    @wraps(func)
    async def wrapper(*args, **kwargs):
        return await func(*args, **kwargs)
    return wrapper


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

    @db_retry
    async def get_all_agents(self) -> list[dict]:
        """Get all agents, base first, then by created_at."""
        async with self._sf() as session:
            result = await session.execute(
                select(Agent).order_by(Agent.is_base.desc(), Agent.created_at)
            )
            return [self._agent_to_dict(a) for a in result.scalars().all()]

    @db_retry
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

    async def list_tasks(self, limit: int = 100, agent: str | None = None,
                         status: str | None = None, date_from: str | None = None,
                         date_to: str | None = None) -> list[dict]:
        """List tasks ordered by creation date, with optional filters."""
        async with self._sf() as session:
            query = select(Task)
            if agent:
                query = query.where(Task.assigned_to == agent)
            if status:
                query = query.where(Task.status == status)
            if date_from:
                try:
                    query = query.where(Task.created_at >= datetime.fromisoformat(date_from))
                except ValueError:
                    pass
            if date_to:
                try:
                    query = query.where(Task.created_at <= datetime.fromisoformat(date_to))
                except ValueError:
                    pass
            query = query.order_by(Task.created_at.desc()).limit(limit)
            result = await session.execute(query)
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

    async def purge_old_events(self, days: int = 7) -> int:
        """Delete events older than `days` days. Returns row count deleted."""
        cutoff = datetime.now(timezone.utc) - timedelta(days=days)
        async with self._sf() as session:
            result = await session.execute(delete(Event).where(Event.timestamp < cutoff))
            await session.commit()
            return result.rowcount

    async def get_agent_ids_and_status(self) -> list[dict]:
        """Selective query: return only id, name, is_base for all agents (lightweight)."""
        async with self._sf() as session:
            result = await session.execute(
                select(Agent.id, Agent.name, Agent.is_base).order_by(Agent.is_base.desc(), Agent.created_at)
            )
            return [{"id": row.id, "name": row.name, "is_base": row.is_base} for row in result.all()]

    async def create_task_with_event(self, task_id: str, title: str, desc: str, assigned_to: str,
                                     priority: str, created_by: str, status: str, log: list) -> dict:
        """Create task + matching event atomically in a single transaction."""
        async with self._sf() as session:
            async with session.begin():
                now = datetime.now(timezone.utc)
                task = Task(
                    id=task_id, title=title, description=desc,
                    assigned_to=assigned_to, priority=priority,
                    status=status, created_by=created_by,
                    created_at=now, updated_at=now, log=log,
                )
                session.add(task)
                event = Event(
                    agent_id=assigned_to,
                    message=f"Görev oluşturuldu: {title[:60]}",
                    type="task_created",
                    timestamp=now,
                )
                session.add(event)
        return await self.get_task(task_id)

    # ── LLM Usage ──

    async def record_llm_usage(self, agent_id, provider, model, input_tokens, output_tokens, cost_usd):
        async with self._sf() as session:
            session.add(LlmUsage(
                agent_id=agent_id, provider=provider, model=model,
                input_tokens=input_tokens, output_tokens=output_tokens, cost_usd=cost_usd,
            ))
            await session.commit()

    async def get_daily_spend(self) -> float:
        """Return total LLM spend (USD) for today."""
        today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
        async with self._sf() as session:
            result = await session.execute(
                select(func.coalesce(func.sum(LlmUsage.cost_usd), 0)).where(LlmUsage.timestamp >= today_start)
            )
            return float(result.scalar())

    async def get_usage_summary(self, period="day"):
        delta = {"day": 1, "week": 7, "month": 30}.get(period, 1)
        cutoff = datetime.now(timezone.utc) - timedelta(days=delta)
        async with self._sf() as session:
            result = await session.execute(
                select(
                    func.sum(LlmUsage.input_tokens).label("ti"),
                    func.sum(LlmUsage.output_tokens).label("to"),
                    func.sum(LlmUsage.cost_usd).label("tc"),
                    func.count(LlmUsage.id).label("cc"),
                ).where(LlmUsage.timestamp >= cutoff)
            )
            row = result.one()
            return {
                "period": period,
                "total_input_tokens": int(row.ti or 0),
                "total_output_tokens": int(row.to or 0),
                "total_cost_usd": float(row.tc or 0),
                "call_count": int(row.cc or 0),
            }

    async def get_usage_by_agent(self, agent_id):
        async with self._sf() as session:
            result = await session.execute(
                select(LlmUsage)
                .where(LlmUsage.agent_id == agent_id)
                .order_by(LlmUsage.timestamp.desc())
                .limit(100)
            )
            return [
                {
                    "provider": r.provider,
                    "model": r.model,
                    "input_tokens": r.input_tokens,
                    "output_tokens": r.output_tokens,
                    "cost_usd": float(r.cost_usd),
                    "timestamp": r.timestamp.isoformat(),
                }
                for r in result.scalars().all()
            ]

    # ── Task History ──

    async def record_task_transition(self, task_id, old_status, new_status, changed_by="system"):
        async with self._sf() as session:
            session.add(TaskHistory(
                task_id=task_id, old_status=old_status,
                new_status=new_status, changed_by=changed_by,
            ))
            await session.commit()

    async def get_task_history(self, task_id):
        async with self._sf() as session:
            result = await session.execute(
                select(TaskHistory)
                .where(TaskHistory.task_id == task_id)
                .order_by(TaskHistory.changed_at.asc())
            )
            return [
                {
                    "old_status": r.old_status,
                    "new_status": r.new_status,
                    "changed_by": r.changed_by,
                    "changed_at": r.changed_at.isoformat(),
                }
                for r in result.scalars().all()
            ]

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
