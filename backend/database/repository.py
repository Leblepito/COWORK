"""
COWORK.ARMY v7.0 — Database Repository (async CRUD)
"""
from datetime import datetime, timezone
from sqlalchemy import select, delete, update, func
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.ext.asyncio import async_sessionmaker
from .models import Department, Agent, Task, Event, CargoLog, LlmUsage, TaskHistory


class Database:
    def __init__(self, session_factory: async_sessionmaker):
        self._sf = session_factory

    # ── Departments ──

    async def upsert_department(self, d: dict):
        async with self._sf() as s:
            stmt = pg_insert(Department).values(
                id=d["id"], name=d["name"], icon=d.get("icon", "🏢"),
                color=d.get("color", "#64748b"), scene_type=d["scene_type"],
                description=d.get("description", ""),
            )
            stmt = stmt.on_conflict_do_update(
                index_elements=["id"],
                set_={"name": stmt.excluded.name, "icon": stmt.excluded.icon,
                       "color": stmt.excluded.color, "scene_type": stmt.excluded.scene_type,
                       "description": stmt.excluded.description},
            )
            await s.execute(stmt)
            await s.commit()

    async def get_all_departments(self) -> list[dict]:
        async with self._sf() as s:
            result = await s.execute(select(Department))
            return [self._dept_to_dict(d) for d in result.scalars().all()]

    async def get_department(self, dept_id: str) -> dict | None:
        async with self._sf() as s:
            result = await s.execute(select(Department).where(Department.id == dept_id))
            d = result.scalar_one_or_none()
            return self._dept_to_dict(d) if d else None

    # ── Agents ──

    async def upsert_agent(self, a: dict):
        async with self._sf() as s:
            stmt = pg_insert(Agent).values(
                id=a["id"], department_id=a.get("department_id"),
                name=a["name"], icon=a.get("icon", "🤖"),
                tier=a.get("tier", "WORKER"), color=a.get("color", "#64748b"),
                domain=a.get("domain", ""),
                description=a.get("desc", a.get("description", "")),
                skills=a.get("skills", []), rules=a.get("rules", []),
                triggers=a.get("triggers", []),
                system_prompt=a.get("system_prompt", ""),
                workspace_dir=a.get("workspace_dir", a["id"]),
                is_base=bool(a.get("is_base", False)),
            )
            stmt = stmt.on_conflict_do_update(
                index_elements=["id"],
                set_={
                    "department_id": stmt.excluded.department_id,
                    "name": stmt.excluded.name, "icon": stmt.excluded.icon,
                    "tier": stmt.excluded.tier, "color": stmt.excluded.color,
                    "domain": stmt.excluded.domain,
                    "description": stmt.excluded.description,
                    "skills": stmt.excluded.skills, "rules": stmt.excluded.rules,
                    "triggers": stmt.excluded.triggers,
                    "system_prompt": stmt.excluded.system_prompt,
                    "workspace_dir": stmt.excluded.workspace_dir,
                    "is_base": stmt.excluded.is_base,
                    "updated_at": datetime.now(timezone.utc),
                },
            )
            await s.execute(stmt)
            await s.commit()

    async def get_all_agents(self, department_id: str | None = None) -> list[dict]:
        async with self._sf() as s:
            query = select(Agent).order_by(Agent.is_base.desc(), Agent.created_at)
            if department_id:
                query = query.where(Agent.department_id == department_id)
            result = await s.execute(query)
            return [self._agent_to_dict(a) for a in result.scalars().all()]

    async def get_agent(self, agent_id: str) -> dict | None:
        async with self._sf() as s:
            result = await s.execute(select(Agent).where(Agent.id == agent_id))
            a = result.scalar_one_or_none()
            return self._agent_to_dict(a) if a else None

    async def delete_agent(self, agent_id: str) -> bool:
        async with self._sf() as s:
            result = await s.execute(
                delete(Agent).where(Agent.id == agent_id, Agent.is_base == False)
            )
            await s.commit()
            return result.rowcount > 0

    # ── Tasks ──

    async def create_task(self, task_id: str, title: str, desc: str,
                          assigned_to: str, priority: str, created_by: str,
                          status: str, log: list,
                          department_id: str | None = None) -> dict:
        async with self._sf() as s:
            now = datetime.now(timezone.utc)
            task = Task(
                id=task_id, title=title, description=desc,
                department_id=department_id, assigned_to=assigned_to,
                priority=priority, status=status, created_by=created_by,
                created_at=now, updated_at=now, log=log,
            )
            s.add(task)
            await s.commit()
        return await self.get_task(task_id)

    async def list_tasks(self, limit: int = 100, department_id: str | None = None) -> list[dict]:
        async with self._sf() as s:
            query = select(Task).order_by(Task.created_at.desc()).limit(limit)
            if department_id:
                query = query.where(Task.department_id == department_id)
            result = await s.execute(query)
            return [self._task_to_dict(t) for t in result.scalars().all()]

    async def get_task(self, task_id: str) -> dict | None:
        async with self._sf() as s:
            result = await s.execute(select(Task).where(Task.id == task_id))
            t = result.scalar_one_or_none()
            return self._task_to_dict(t) if t else None

    async def update_task(self, task_id: str, **kwargs):
        async with self._sf() as s:
            kwargs["updated_at"] = datetime.now(timezone.utc)
            await s.execute(update(Task).where(Task.id == task_id).values(**kwargs))
            await s.commit()

    # ── Events ──

    async def add_event(self, agent_id: str, message: str, etype: str = "info",
                        department_id: str | None = None):
        async with self._sf() as s:
            event = Event(agent_id=agent_id, message=message, type=etype,
                          department_id=department_id)
            s.add(event)
            await s.commit()

    async def get_events(self, limit: int = 50, since: str = "",
                         department_id: str | None = None) -> list[dict]:
        async with self._sf() as s:
            query = select(Event)
            if since:
                try:
                    since_dt = datetime.fromisoformat(since.replace("Z", "+00:00"))
                    query = query.where(Event.timestamp > since_dt)
                except ValueError:
                    pass
            if department_id:
                query = query.where(Event.department_id == department_id)
            query = query.order_by(Event.id.desc()).limit(limit)
            result = await s.execute(query)
            return [self._event_to_dict(e) for e in result.scalars().all()]

    async def get_event_count(self) -> int:
        async with self._sf() as s:
            result = await s.execute(select(func.count(Event.id)))
            return result.scalar() or 0

    # ── Cargo Logs ──

    async def add_cargo_log(self, log: dict) -> int:
        async with self._sf() as s:
            cl = CargoLog(
                filename=log.get("filename", ""),
                file_type=log.get("file_type", ""),
                file_size=log.get("file_size", 0),
                analysis=log.get("analysis", {}),
                source_department_id=log.get("source_department_id"),
                target_department_id=log["target_department_id"],
                target_agent_id=log["target_agent_id"],
                status=log.get("status", "analyzing"),
                prompt_generated=log.get("prompt_generated", ""),
            )
            s.add(cl)
            await s.commit()
            await s.refresh(cl)
            return cl.id

    async def update_cargo_log(self, log_id: int, **kwargs):
        async with self._sf() as s:
            await s.execute(update(CargoLog).where(CargoLog.id == log_id).values(**kwargs))
            await s.commit()

    async def get_cargo_logs(self, limit: int = 50) -> list[dict]:
        async with self._sf() as s:
            result = await s.execute(
                select(CargoLog).order_by(CargoLog.id.desc()).limit(limit)
            )
            return [self._cargo_to_dict(c) for c in result.scalars().all()]

    # ── Seed ──

    async def seed_departments(self, departments: list[dict]):
        for d in departments:
            await self.upsert_department(d)

    async def seed_agents(self, agents: list[dict]):
        for a in agents:
            await self.upsert_agent(a)

    # ── Dict converters ──

    @staticmethod
    def _dept_to_dict(d: Department) -> dict:
        return {
            "id": d.id, "name": d.name, "icon": d.icon,
            "color": d.color, "scene_type": d.scene_type,
            "description": d.description,
        }

    @staticmethod
    def _agent_to_dict(a: Agent) -> dict:
        return {
            "id": a.id, "department_id": a.department_id,
            "name": a.name, "icon": a.icon, "tier": a.tier,
            "color": a.color, "domain": a.domain,
            "desc": a.description, "description": a.description,
            "skills": a.skills or [], "rules": a.rules or [],
            "triggers": a.triggers or [],
            "system_prompt": a.system_prompt,
            "workspace_dir": a.workspace_dir, "is_base": a.is_base,
            "created_at": a.created_at.isoformat() if a.created_at else "",
        }

    @staticmethod
    def _task_to_dict(t: Task) -> dict:
        return {
            "id": t.id, "title": t.title, "description": t.description,
            "department_id": t.department_id, "assigned_to": t.assigned_to,
            "priority": t.priority, "status": t.status,
            "created_by": t.created_by,
            "created_at": t.created_at.isoformat() if t.created_at else "",
            "updated_at": t.updated_at.isoformat() if t.updated_at else "",
            "log": t.log or [],
        }

    @staticmethod
    def _event_to_dict(e: Event) -> dict:
        return {
            "timestamp": e.timestamp.isoformat() if e.timestamp else "",
            "department_id": e.department_id,
            "agent_id": e.agent_id, "message": e.message, "type": e.type,
        }

    @staticmethod
    def _cargo_to_dict(c: CargoLog) -> dict:
        return {
            "id": c.id,
            "timestamp": c.timestamp.isoformat() if c.timestamp else "",
            "filename": c.filename, "file_type": c.file_type,
            "file_size": c.file_size, "analysis": c.analysis or {},
            "source_department_id": c.source_department_id,
            "target_department_id": c.target_department_id,
            "target_agent_id": c.target_agent_id,
            "status": c.status, "prompt_generated": c.prompt_generated,
        }

    # ── Agent World — AgentMessageBus DB methods ──

    async def save_agent_message(self, msg: dict) -> str:
        """Save an agent message to DB. Returns message id."""
        from .models import AgentMessage
        async with self._sf() as s:
            obj = AgentMessage(**msg)
            s.add(obj)
            await s.commit()
            return obj.id

    async def get_agent_messages(self, limit: int = 50, cascade_id: str | None = None) -> list[dict]:
        """Get recent agent messages, optionally filtered by cascade_id."""
        from .models import AgentMessage
        from sqlalchemy import desc
        async with self._sf() as s:
            q = select(AgentMessage).order_by(desc(AgentMessage.created_at)).limit(limit)
            if cascade_id:
                q = q.where(AgentMessage.cascade_id == cascade_id)
            result = await s.execute(q)
            rows = result.scalars().all()
            return [
                {
                    "id": r.id, "from_agent": r.from_agent, "to_agent": r.to_agent,
                    "message_type": r.message_type, "priority": r.priority,
                    "payload": r.payload, "thread_id": r.thread_id,
                    "cascade_id": r.cascade_id, "status": r.status,
                    "created_at": r.created_at.isoformat() if r.created_at else "",
                }
                for r in rows
            ]

    async def upsert_world_model(self, agent_id: str, updates: dict) -> None:
        """Upsert an agent's world model (expertise, energy, etc.)."""
        from .models import AgentWorldModel
        async with self._sf() as s:
            stmt = pg_insert(AgentWorldModel).values(agent_id=agent_id, **updates)
            stmt = stmt.on_conflict_do_update(index_elements=["agent_id"], set_=updates)
            await s.execute(stmt)
            await s.commit()

    async def get_world_model(self, agent_id: str) -> dict | None:
        """Get an agent's world model."""
        from .models import AgentWorldModel
        async with self._sf() as s:
            result = await s.execute(
                select(AgentWorldModel).where(AgentWorldModel.agent_id == agent_id)
            )
            row = result.scalar_one_or_none()
            if not row:
                return None
            return {
                "agent_id": row.agent_id,
                "expertise_score": row.expertise_score,
                "trust_network": row.trust_network,
                "energy_level": row.energy_level,
                "current_task": row.current_task,
                "idle_timeout_seconds": row.idle_timeout_seconds,
            }

    async def save_cascade_chain(self, cascade: dict) -> str:
        """Save a cascade chain record. Returns cascade_id."""
        from .models import CascadeChain
        async with self._sf() as s:
            obj = CascadeChain(**cascade)
            s.add(obj)
            await s.commit()
            return obj.cascade_id

    async def complete_cascade_chain(self, cascade_id: str, depth: int) -> None:
        """Mark a cascade chain as completed."""
        from .models import CascadeChain
        async with self._sf() as s:
            await s.execute(
                update(CascadeChain)
                .where(CascadeChain.cascade_id == cascade_id)
                .values(completed_at=datetime.now(timezone.utc), depth=depth)
            )
            await s.commit()

    async def save_episode(self, episode: dict) -> str:
        """Save an agent episode (task history)."""
        from .models import AgentEpisode
        async with self._sf() as s:
            obj = AgentEpisode(**episode)
            s.add(obj)
            await s.commit()
            return obj.id

    async def save_shared_knowledge(self, knowledge: dict) -> str:
        """Save shared knowledge entry."""
        from .models import SharedKnowledge
        async with self._sf() as s:
            obj = SharedKnowledge(**knowledge)
            s.add(obj)
            await s.commit()
            return obj.id

    # ── LLM Usage Tracking ──

    async def record_llm_usage(self, agent_id, provider, model, input_tokens, output_tokens, cost_usd):
        async with self._sf() as s:
            s.add(LlmUsage(agent_id=agent_id, provider=provider, model=model,
                           input_tokens=input_tokens, output_tokens=output_tokens, cost_usd=cost_usd))
            await s.commit()

    async def get_usage_summary(self, period="day"):
        from datetime import timedelta
        delta = {"day": 1, "week": 7, "month": 30}.get(period, 1)
        cutoff = datetime.now(timezone.utc) - timedelta(days=delta)
        async with self._sf() as s:
            result = await s.execute(
                select(func.sum(LlmUsage.input_tokens).label("ti"),
                       func.sum(LlmUsage.output_tokens).label("to"),
                       func.sum(LlmUsage.cost_usd).label("tc"),
                       func.count(LlmUsage.id).label("cc"))
                .where(LlmUsage.timestamp >= cutoff))
            row = result.one()
            return {"period": period, "total_input_tokens": int(row.ti or 0),
                    "total_output_tokens": int(row.to or 0),
                    "total_cost_usd": float(row.tc or 0), "call_count": int(row.cc or 0)}

    async def get_usage_by_agent(self, agent_id):
        async with self._sf() as s:
            result = await s.execute(
                select(LlmUsage).where(LlmUsage.agent_id == agent_id)
                .order_by(LlmUsage.timestamp.desc()).limit(100))
            return [{"provider": r.provider, "model": r.model, "input_tokens": r.input_tokens,
                     "output_tokens": r.output_tokens, "cost_usd": float(r.cost_usd),
                     "timestamp": r.timestamp.isoformat()} for r in result.scalars().all()]

    async def get_daily_spend(self):
        today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
        async with self._sf() as s:
            result = await s.execute(
                select(func.coalesce(func.sum(LlmUsage.cost_usd), 0)).where(LlmUsage.timestamp >= today_start))
            return float(result.scalar())

    # ── Task History ──

    async def record_task_transition(self, task_id, old_status, new_status, changed_by="system"):
        async with self._sf() as s:
            s.add(TaskHistory(task_id=task_id, old_status=old_status,
                             new_status=new_status, changed_by=changed_by))
            await s.commit()

    async def get_task_history(self, task_id):
        async with self._sf() as s:
            result = await s.execute(
                select(TaskHistory).where(TaskHistory.task_id == task_id)
                .order_by(TaskHistory.changed_at.asc()))
            return [{"old_status": r.old_status, "new_status": r.new_status,
                     "changed_by": r.changed_by, "changed_at": r.changed_at.isoformat()}
                    for r in result.scalars().all()]

    async def purge_old_events(self, days=7):
        from datetime import timedelta
        cutoff = datetime.now(timezone.utc) - timedelta(days=days)
        async with self._sf() as s:
            result = await s.execute(delete(Event).where(Event.timestamp < cutoff))
            await s.commit()
            return result.rowcount
