# COWORK.ARMY

AI Agent ordusu yoneten, gorev dagitan, koordine eden ve calistiran kontrol merkezi.

4 departman, 13+ agent, 3D gorsellestime, otonom calisma dongusu.

## Mimari

```
Browser → Frontend (Next.js 15 / port 3333)
              ↓ /cowork-api/* middleware proxy
          Backend (FastAPI / port 8888)
              ↓
          PostgreSQL 16 (port 5433)
              ↓
          LLM Provider (Claude / Gemini)
```

## Hizli Baslangic

### 1. PostgreSQL

```bash
docker compose up -d postgres
```

### 2. Backend

```bash
cd backend
pip install -r requirements.txt
alembic upgrade head
python -m uvicorn backend.main:app --host 0.0.0.0 --port 8888 --reload
```

### 3. Frontend

```bash
cd frontend
npm install --legacy-peer-deps
npm run dev
```

**Servisler:**
- Frontend: http://localhost:3333
- Backend: http://localhost:8888
- PostgreSQL: localhost:5433

## Docker Compose (Tek Komut)

```bash
docker compose up -d
```

Tum servisleri baslatir: PostgreSQL, Backend, Frontend.

## Deploy (Railway)

`main` branch'e push otomatik deploy tetikler.

```bash
# Manuel deploy
cd backend
railway up --detach --service backend --environment production

cd frontend
railway up --detach --service frontend --environment production
```

**Railway Environment Variables:**

| Servis | Degisken | Deger |
|--------|----------|-------|
| frontend | `COWORK_API_URL` | `http://backend.railway.internal:8888` |
| frontend | `PORT` | `3333` |
| backend | `DATABASE_URL` | Railway Postgres URL |
| backend | `ANTHROPIC_API_KEY` | `sk-ant-...` |
| backend | `PORT` | `8888` |

**Domain:** ireska.com / www.ireska.com

## Proje Yapisi

```
COWORK/
├── backend/                    ← FastAPI backend (port 8888)
│   ├── main.py                 → Ana sunucu, lifespan, CORS
│   ├── config.py               → Environment degiskenleri
│   ├── api/                    → API route'lari
│   │   ├── departments.py      → /api/departments
│   │   ├── agents.py           → /api/agents, /api/statuses
│   │   ├── tasks.py            → /api/tasks
│   │   ├── cargo.py            → /api/cargo
│   │   ├── autonomous.py       → /api/autonomous
│   │   ├── settings.py         → /api/settings
│   │   └── websocket.py        → WebSocket endpoint
│   ├── database/               → Async SQLAlchemy + Alembic
│   │   ├── connection.py       → create_async_engine
│   │   ├── models.py           → Agent, Task, Event ORM
│   │   └── repository.py       → Async CRUD
│   ├── departments.py          → 4 departman + 13 agent tanimi
│   ├── runner.py               → Agent lifecycle (spawn/kill)
│   ├── llm_providers.py        → Multi-LLM (Anthropic + Gemini)
│   ├── autonomous.py           → Otonom calisma dongusu
│   ├── commander.py            → Gorev routing
│   ├── tools.py                → Agent araclari
│   ├── Dockerfile              → python:3.12-slim
│   └── requirements.txt        → Python bagimliliklari
│
├── frontend/                   ← Next.js 15 frontend (port 3333)
│   ├── app/
│   │   ├── page.tsx            → Ana dashboard
│   │   └── departments/[dept]/ → Departman detay + 3D sahne
│   ├── lib/
│   │   ├── cowork-api.ts       → Backend API client
│   │   └── types.ts            → TypeScript type'lari
│   ├── components/cowork-army/ → 3D sahne componentleri
│   ├── middleware.ts           → /cowork-api/* → backend proxy
│   ├── Dockerfile              → node:20-alpine, standalone
│   └── package.json            → Next.js 15, React 19, Three.js
│
├── docker-compose.yml          → PostgreSQL + Backend + Frontend
├── .github/workflows/
│   ├── railway-deploy.yml      → Otomatik Railway deploy
│   └── railway-setup.yml      → Domain & env var kurulumu
└── CLAUDE.md                   → Proje dokumantasyonu
```

## Agent Sistemi

### Departmanlar & Agentlar

| Dept | Agent | Rol | Tier |
|------|-------|-----|------|
| **CARGO** | cargo | Inter-dept Delivery Hub | SUPERVISOR |
| **TRADE** | trade-master | Trading Swarm Orchestrator | DIRECTOR |
| | chart-eye | Teknik Analiz & Chart | WORKER |
| | risk-guard | Risk Yonetimi (HARD VETO) | WORKER |
| | quant-brain | Backtest & Optimizasyon | WORKER |
| **MEDICAL** | clinic-director | Klinik Yonetimi | DIRECTOR |
| | patient-care | Hasta Bakim & Post-Op | WORKER |
| **HOTEL** | hotel-manager | Otel Yonetimi | DIRECTOR |
| | travel-planner | Seyahat Planlama | WORKER |
| | concierge | Misafir Hizmetleri | WORKER |
| **SOFTWARE** | tech-lead | Yazilim Yonetimi | DIRECTOR |
| | full-stack | Full-Stack Gelistirme | WORKER |
| | data-ops | Veri Analiz & SEO | WORKER |

## API Endpoints

```
GET    /api/departments          → Departman listesi
GET    /api/departments/:id      → Departman detay + agentlar
GET    /api/agents               → Agent listesi
POST   /api/agents/:id/spawn     → Agent baslat
POST   /api/agents/:id/kill      → Agent durdur
GET    /api/statuses             → Tum agent durumlari
GET    /api/agents/:id/output    → Agent terminal ciktisi
POST   /api/tasks                → Gorev olustur
GET    /api/tasks                → Gorev listesi
POST   /api/cargo/upload         → Dosya yukle & analiz
POST   /api/cargo/delegate       → Gorev yonlendir
POST   /api/autonomous/start     → Otonom dongu baslat
POST   /api/autonomous/stop      → Otonom dongu durdur
GET    /api/autonomous/status    → Dongu durumu
GET    /api/autonomous/events    → Event feed
GET    /api/info                 → Sunucu bilgisi
```

## Tech Stack

| Katman | Teknoloji |
|--------|-----------|
| Frontend | Next.js 15, React 19, TypeScript, Tailwind 4 |
| 3D | Three.js, React Three Fiber, Drei |
| Backend | FastAPI, Python 3.12, Uvicorn |
| Database | PostgreSQL 16, async SQLAlchemy 2.0, Alembic |
| LLM | Anthropic Claude Sonnet 4, Google Gemini 2.5 Pro |
| Deploy | Railway, Docker, GitHub Actions |
| Domain | ireska.com |

## Env Degiskenleri

```bash
# backend/.env
ANTHROPIC_API_KEY=sk-ant-xxx
GEMINI_API_KEY=AIza...
DATABASE_URL=postgresql+asyncpg://cowork:cowork@localhost:5433/cowork_army
PORT=8888
LLM_PROVIDER=anthropic
CLAUDE_MODEL=claude-sonnet-4-20250514
```

## Database Migration

```bash
cd backend
alembic upgrade head        # Tablolari olustur/guncelle
alembic revision --autogenerate -m "aciklama"   # Yeni migration
```

## Lisans

MIT
