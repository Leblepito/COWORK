# CLAUDE.md — COWORK Platform

You are an AI assistant working on the **COWORK** platform — a multi-service ecosystem for AI agent orchestration and coworking space management. This document describes the full codebase, architecture, development workflows, and coding conventions.

## Repository Overview

```
COWORK/
├── cowork-army/              ← AI Agent Orchestration Backend (FastAPI, port 8888)
│   └── frontend/             ← Agent Dashboard Frontend (Next.js 15, port 3333)
├── cowork-api/               ← Coworking Space Management API (FastAPI, port 8080)
├── cowork-admin/             ← Admin Dashboard Frontend (Next.js 15, pages only — no standalone config)
├── agents/                   ← Standalone agent modules (not yet integrated)
├── CLAUDE.md                 ← This file
├── SECURITY_SCAN_REPORT.md   ← Security audit results
├── README.md
└── .gitignore
```

---

## 1. cowork-army — AI Agent Orchestration

### Purpose
The core of COWORK.ARMY: an AI agent swarm orchestration platform. Manages 12 base agents + dynamically created agents. Agents use the Claude API to autonomously execute tasks across projects.

### Backend (Python/FastAPI)

**Location:** `/cowork-army/`
**Port:** 8888
**Database:** SQLite (`cowork.db`, gitignored) with WAL mode

#### Key Files

| File | Purpose |
|------|---------|
| `server.py` | FastAPI app — all REST endpoints, CORS, lifespan init |
| `database.py` | SQLite wrapper — 3 tables (agents, tasks, events), thread-safe |
| `registry.py` | 12 base agent definitions with system prompts, triggers, skills |
| `runner.py` | Agent lifecycle engine — Claude API calls, tool-use loop (max 10 rounds) |
| `autonomous.py` | 30-second tick loop — auto-spawns pending tasks, supervisor checks |
| `commander.py` | Keyword-based task routing + dynamic agent creation |
| `tools.py` | 5 sandboxed tools for agents: read_file, write_file, list_directory, search_code, run_command |
| `tasks.py` | Legacy task manager (DB is now primary) |
| `requirements.txt` | Dependencies: fastapi, uvicorn, anthropic, python-dotenv, python-multipart |
| `Procfile` | Railway deployment config |

#### API Endpoints

```
# Agent CRUD
GET    /api/agents                   — List all agents
GET    /api/agents/{id}              — Single agent
POST   /api/agents                   — Create dynamic agent (FormData)
PUT    /api/agents/{id}              — Update agent
DELETE /api/agents/{id}              — Delete dynamic agent (base agents protected)

# Agent Lifecycle
POST   /api/agents/{id}/spawn?task=  — Start agent on a task
POST   /api/agents/{id}/kill         — Stop agent
GET    /api/agents/{id}/output       — Terminal output (last 10 lines)
GET    /api/statuses                 — All agent statuses

# Tasks
GET    /api/tasks                    — List tasks
POST   /api/tasks                    — Create task (FormData)

# Commander
POST   /api/commander/delegate       — Auto-route task to best agent + spawn

# Autonomous Loop
POST   /api/autonomous/start         — Begin 30s tick loop
POST   /api/autonomous/stop          — Stop loop
GET    /api/autonomous/status        — Loop status + tick count
GET    /api/autonomous/events        — Event feed (supports limit, since params)

# Settings
GET    /api/settings/api-key-status  — Check if API key is set
POST   /api/settings/api-key         — Save API key to .env

# Info
GET    /api/info                     — Server version, agent count
GET    /health                       — Health check
```

#### Database Schema

**agents** (15 columns):
`id` (PK), `name`, `icon`, `tier` (COMMANDER|SUPERVISOR|DIRECTOR|WORKER), `color`, `domain`, `description`, `skills` (JSON), `rules` (JSON), `workspace_dir`, `triggers` (JSON), `system_prompt`, `is_base` (0|1), `created_at`, `updated_at`

**tasks** (10 columns):
`id` (PK), `title`, `description`, `assigned_to`, `priority` (medium|high|critical), `status` (pending|in_progress|done|error), `created_by`, `created_at`, `updated_at`, `log` (JSON)

**events** (5 columns, max 2000 rows):
`id` (AI PK), `timestamp`, `agent_id`, `message`, `type` (info|task_created|inbox_check|self_improve|warning)

#### The 12 Base Agents

| ID | Role | Tier | Workspace |
|---|---|---|---|
| commander | Orchestrator | COMMANDER | . |
| supervisor | QA & Compliance | SUPERVISOR | . |
| med-health | Medical Director | DIRECTOR | Med-UI-Tra-main |
| travel-agent | Travel & Lodging | DIRECTOR | Med-UI-Tra-main |
| trade-engine | Trading Brain | DIRECTOR | uAlgoTrade-main/ai-engine/src |
| alpha-scout | Sentiment Hunter | WORKER | uAlgoTrade-main/ai-engine/src |
| tech-analyst | Technical Analyst | WORKER | uAlgoTrade-main/ai-engine/src |
| risk-sentinel | Portfolio Guardian | WORKER | uAlgoTrade-main/ai-engine/src |
| quant-lab | Nightly Optimizer | WORKER | uAlgoTrade-main/ai-engine/src |
| growth-ops | Growth & Marketing | WORKER | Med-UI-Tra-main/04_ai_agents |
| web-dev | Full-Stack Dev | WORKER | . (all projects) |
| finance | Finance & Accounting | WORKER | . |

**Dynamic agents** are created at runtime via the commander or UI. They get hash-based deterministic icons/colors, auto-generated system prompts, and appear in the "DYNAMIC AGENTS" zone in the 3D scene.

#### Agent Execution Model

1. `spawn(agent_id, task)` creates an asyncio task
2. Agent status cycles: idle → thinking → planning/coding/searching → done/error
3. Each round: Claude API call → tool_use response → ToolExecutor runs tool → result appended → next round
4. Max 10 rounds per spawn, 4096 max tokens per response
5. Model: `claude-sonnet-4-20250514`
6. Tools are sandboxed to agent's workspace_dir (path traversal blocked)

#### Tool Sandboxing

- `read_file`: max 50KB
- `write_file`: auto-creates directories
- `list_directory`: sorted listing with sizes
- `search_code`: regex search, max 30 matches, skips node_modules/.git/__pycache__
- `run_command`: 30s timeout, 10K char output limit, blocks destructive commands (rm -rf /, sudo, mkfs, etc.)

### Frontend (Next.js 15 + Three.js)

**Location:** `/cowork-army/frontend/`
**Port:** 3333
**Version:** 4.3.0

#### Tech Stack
- Next.js 15, React 19, TypeScript 5.7
- Three.js 0.172 + React Three Fiber 9 + Drei 10
- Tailwind CSS 4

#### Key Files

| File | Purpose |
|------|---------|
| `app/page.tsx` | Main 3-panel layout: agent list (left), 3D scene (center), events (right) |
| `lib/cowork-api.ts` | API client + TypeScript types for all backend endpoints |
| `components/cowork-army/CoworkOffice3D.tsx` | Main Three.js/R3F 3D office scene |
| `components/cowork-army/scene-constants.ts` | Desk positions, zone definitions, colors, movement constants |
| `components/cowork-army/AgentAvatar.tsx` | Procedural 3D agent characters |
| `components/cowork-army/AgentDesk.tsx` | Desk geometry per agent |
| `components/cowork-army/characters/` | CharacterBuilder, accessories, registry |
| `components/cowork-army/movement/` | MovementSystem (A* pathfinding), collision avoidance |
| `components/cowork-army/collaboration/` | CollaborationBeam + CollaborationDetector |

#### UI Features
- 3-panel responsive layout (collapses to single panel on mobile)
- 2-second polling for agent statuses and events
- Modals: spawn task, create agent, save API key
- Status dot colors: idle=gray, working=green, thinking=blue, coding=purple, planning=yellow, error=red, done=white
- Toast notifications for all actions

#### 3D Scene Zones
- **Management** (yellow): commander, supervisor
- **Medical & Travel** (cyan): med-health, travel-agent
- **Trading Swarm** (purple): trade-engine + 4 analysts
- **Operations** (green): growth-ops, web-dev, finance
- **Dynamic Agents** (orange): auto-positioned grid

---

## 2. cowork-api — Coworking Space Management API

### Purpose
A production-grade REST API for managing a physical coworking space business: members, spaces, bookings, billing, and analytics.

**Location:** `/cowork-api/`
**Port:** 8080
**Database:** PostgreSQL (async via asyncpg)
**Python:** 3.11+

#### Tech Stack
- FastAPI 0.115+, SQLAlchemy 2.0 (async), Alembic migrations
- Pydantic 2.7+ validation, JWT auth (python-jose), bcrypt passwords
- Stripe SDK 9+ for payments

#### Key Files

| File | Purpose |
|------|---------|
| `src/main.py` | FastAPI app init, lifespan, CORS, router registration |
| `src/config.py` | Pydantic BaseSettings — env-based config |
| `src/auth.py` | JWT encode/decode, password hash/verify |
| `src/database/connection.py` | Async SQLAlchemy engine + session factory |
| `src/database/models.py` | 8 ORM models: users, members, spaces, bookings, subscriptions, occupancy_logs, invoices |
| `src/routers/auth.py` | /auth — signup, login, refresh, me |
| `src/routers/spaces.py` | /api/spaces — CRUD + availability |
| `src/routers/bookings.py` | /api/bookings — CRUD, check-in/out, cancel |
| `src/routers/billing.py` | /api/billing — Stripe checkout, portal, status |
| `src/routers/stripe_webhook.py` | /api/webhooks/stripe — subscription lifecycle events |
| `src/routers/analytics.py` | /api/analytics — occupancy, revenue, members (admin only) |
| `src/schemas/` | Pydantic request/response models |
| `alembic/` | Database migration environment |
| `pyproject.toml` | Project metadata + dependencies |

#### API Endpoints

```
# Authentication
POST   /auth/signup              — Register new member
POST   /auth/login               — Authenticate (returns JWT)
POST   /auth/refresh             — Refresh token
GET    /auth/me                  — Current user profile

# Spaces (admin-write, all-read)
GET    /api/spaces               — List spaces (filter by type, active_only)
GET    /api/spaces/types         — Available space types
GET    /api/spaces/{id}          — Space details
POST   /api/spaces               — Create space (admin)
PATCH  /api/spaces/{id}          — Update space (admin)
DELETE /api/spaces/{id}          — Soft-delete (admin)
GET    /api/spaces/{id}/availability — Check booked slots for date

# Bookings
POST   /api/bookings             — Create booking (conflict check, auto-calc amount)
GET    /api/bookings             — List (members: own; admins: all)
GET    /api/bookings/{id}        — Details
PATCH  /api/bookings/{id}        — Update (before check-in)
POST   /api/bookings/{id}/cancel — Cancel
POST   /api/bookings/{id}/checkin  — Check in
POST   /api/bookings/{id}/checkout — Check out

# Billing (Stripe)
POST   /api/billing/checkout     — Create Stripe Checkout Session
POST   /api/billing/portal       — Stripe Customer Portal
GET    /api/billing/status       — Subscription status

# Stripe Webhooks
POST   /api/webhooks/stripe      — Handles: checkout.session.completed, invoice.paid/failed, subscription.updated/deleted

# Analytics (admin only)
GET    /api/analytics/occupancy  — Daily occupancy (last N days)
GET    /api/analytics/revenue    — Revenue summary (last N months)
GET    /api/analytics/members    — Growth & plan distribution

# Health
GET    /health
```

#### Database Models

| Table | Key Fields |
|-------|-----------|
| users | email, hashed_password, full_name, role (MEMBER/ADMIN/SUPER_ADMIN) |
| members | user_id (FK), phone, company, plan_type, stripe_customer_id |
| spaces | name, space_type, capacity, hourly/daily/monthly rates, amenities (JSON) |
| bookings | user_id, space_id, start/end_time, status, amount_usd, check_in/out_time |
| subscriptions | member_id, plan_type, stripe_subscription_id, status, period dates |
| occupancy_logs | space_id, occupied_at, vacated_at |
| invoices | user_id, booking_id, amount, stripe_invoice_id, status |

#### Enums
- **UserRole:** MEMBER, ADMIN, SUPER_ADMIN
- **SpaceType:** HOT_DESK, DEDICATED_DESK, PRIVATE_OFFICE, MEETING_ROOM
- **BookingStatus:** PENDING, CONFIRMED, CHECKED_IN, COMPLETED, CANCELLED, NO_SHOW
- **SubscriptionStatus:** ACTIVE, PAST_DUE, CANCELLED, TRIALING

#### Environment Variables

```env
PORT=8080
ENVIRONMENT=development
SECRET_KEY=change-me-in-production
DATABASE_URL=postgresql+asyncpg://postgres:postgres@localhost:5432/cowork
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_HOT_DESK_PRICE_ID=price_...
STRIPE_DEDICATED_PRICE_ID=price_...
STRIPE_PRIVATE_OFFICE_PRICE_ID=price_...
FRONTEND_URL=http://localhost:3000
ADMIN_URL=http://localhost:3001
SMTP_HOST=...  SMTP_PORT=...  SMTP_USER=...  SMTP_PASSWORD=...  EMAIL_FROM=...
```

---

## 3. cowork-admin — Admin Dashboard

### Purpose
A lightweight Next.js 15 admin dashboard for managing coworking spaces, bookings, members, and viewing analytics. Connects to `cowork-api`.

**Location:** `/cowork-admin/`
**Port:** 3000 (default Next.js) or 3001 (configured)
**Backend:** cowork-api on port 8080

**Note:** This module has no standalone package.json, tsconfig, or next.config — it is intended to be integrated into a parent Next.js app or monorepo setup.

#### Key Files

| File | Purpose |
|------|---------|
| `app/providers.tsx` | Root provider — wraps AuthProvider + AdminShell |
| `app/dashboard/page.tsx` | KPI cards (active spaces, bookings, revenue) + recent bookings table |
| `app/spaces/page.tsx` | Space CRUD with modal forms (create, edit, delete) |
| `app/bookings/page.tsx` | Booking list with status filter + pagination (50/page) + cancel |
| `app/members/page.tsx` | Member list (WIP — shows current admin only, awaits backend endpoint) |
| `components/AdminShell.tsx` | Layout shell: sidebar nav, header, mobile menu, auth guard |
| `lib/api.ts` | API client wrapper + TypeScript interfaces (Space, Booking, Member, stats) |
| `lib/auth.ts` | AuthProvider context, JWT token management, role gating (admin/super_admin) |

#### UI Libraries
- lucide-react (icons), clsx (class merging), react-hot-toast (notifications)
- Tailwind CSS (utility classes)

#### Environment Variables
```env
NEXT_PUBLIC_API_URL=http://localhost:8080   # cowork-api backend
```

---

## 4. agents — Standalone Agent Modules

### Purpose
Standalone agent Python modules not yet integrated into the cowork-army system.

**Location:** `/agents/`

#### Files

| File | Purpose |
|------|---------|
| `phaser_game_developer_agent.py` | Phaser.js game development agent class (platformer, puzzle, arcade templates) |
| `phaser_templates/basic_game.html` | Complete standalone Phaser 3.70 platformer game template (HTML+CSS+JS) |

**Integration status:** Not connected to cowork-army registry, database, or runner. Could be added as a new base agent or dynamic agent specialization.

---

## Architecture

```
Browser/Mobile
    │
    ├──→ cowork-army/frontend (port 3333)
    │        ↓ API calls
    │    cowork-army backend (port 8888)
    │        ├── SQLite DB (cowork.db)
    │        ├── Claude API (Anthropic)
    │        └── Project workspaces (file read/write)
    │
    ├──→ cowork-admin (port 3000/3001)
    │        ↓ API calls
    │    cowork-api (port 8080)
    │        ├── PostgreSQL DB
    │        └── Stripe API
    │
    └──→ Production: Railway (frontend) + Cloudflare Tunnel (backend)
         Domain: ireska.com
```

---

## Development Setup

### cowork-army (Agent System)

```bash
# Backend
cd cowork-army
pip install -r requirements.txt
# Create .env with ANTHROPIC_API_KEY
python server.py                    # → http://localhost:8888

# Frontend
cd cowork-army/frontend
npm install
npm run dev                         # → http://localhost:3333
```

### cowork-api (Coworking API)

```bash
cd cowork-api
pip install -e .                    # or: pip install -e ".[dev]" for tests
# Create .env (see env vars above)
# Ensure PostgreSQL is running
uvicorn src.main:app --port 8080    # → http://localhost:8080
```

### cowork-admin (Admin Dashboard)

```bash
# Requires parent Next.js setup or monorepo integration
# Set NEXT_PUBLIC_API_URL=http://localhost:8080
# Ensure cowork-api is running
```

---

## Coding Conventions

1. **Read first, then edit.** Always read a file and understand existing patterns before making changes.
2. **TypeScript strict mode** for all frontend code.
3. **Conventional Commits:** Use `feat:`, `fix:`, `refactor:`, `docs:`, `chore:` prefixes.
4. **Never commit secrets.** `.env`, API keys, credentials must stay out of version control.
5. **No hardcoded secrets in code.** Use environment variables for all keys, tokens, and passwords.
6. **Be careful with new dependencies.** Avoid adding packages unless clearly needed.
7. **Database migrations:** Warn before any change that risks data loss.
8. **Python:** FastAPI patterns, async/await, type hints. Use `asyncio` for concurrent agent operations.
9. **Frontend:** React hooks, functional components, Tailwind CSS utility classes.
10. **Agent workspace isolation:** Each agent operates within its designated `workspace_dir`. Path traversal is blocked by ToolExecutor.
11. **Turkish language:** System prompts, agent triggers, and some UI strings are in Turkish.

## Security Notes

- All `.env` files are gitignored and never committed
- Agent `run_command` tool blocks destructive shell commands
- Agent file tools validate paths to prevent directory traversal
- JWT auth with bcrypt password hashing in cowork-api
- Stripe webhooks verified via signature header
- CORS configured per-service (cowork-army: `*`, cowork-api: specific origins)
- Security scan passed — see `SECURITY_SCAN_REPORT.md`

## Deployment

| Service | Platform | Port | Notes |
|---------|----------|------|-------|
| cowork-army backend | Cloudflare Tunnel → localhost | 8888 | Procfile for Railway |
| cowork-army frontend | Railway | 3333 | `NEXT_PUBLIC_COWORK_API_URL` env var |
| cowork-api | Local / Docker | 8080 | PostgreSQL required |
| cowork-admin | Local | 3000/3001 | `NEXT_PUBLIC_API_URL` env var |

---

*COWORK Platform — AI Agent Orchestration (cowork-army) + Coworking Space Management (cowork-api/cowork-admin)*
