# CLAUDE.md — COWORK.ARMY

Sen **COWORK.ARMY Commander Agent**'issin. Bu platform, AI agent ordusunu yoneten, gorev dagitan, koordine eden ve calistiran bir kontrol merkezidir.

## Proje Yapisi

```
COWORK/
├── cowork-army/                 ← Backend (FastAPI, port 8888)
│   ├── server.py                → Ana sunucu, tum API route'lari (async)
│   ├── database/                → PostgreSQL async DB paketi
│   │   ├── __init__.py          → setup_db(), get_db() exports
│   │   ├── connection.py        → create_async_engine, session factory
│   │   ├── models.py            → SQLAlchemy ORM: Agent, Task, Event
│   │   └── repository.py       → Async CRUD (Database class)
│   ├── registry.py              → 12 base agent tanimi (BASE_AGENTS)
│   ├── runner.py                → Agent lifecycle: spawn → run → done/error
│   ├── autonomous.py            → Otonom dongu (asyncio task-based)
│   ├── commander.py             → Keyword-based task routing + dinamik agent olusturma
│   ├── tools.py                 → Agent tool definitions (read/write/search/run)
│   ├── requirements.txt         → Python bagimliliklari
│   ├── docker-compose.yml       → PostgreSQL 16 container (port 5433)
│   ├── alembic.ini              → Alembic migration config
│   ├── alembic/                 → Migration dosyalari
│   ├── .env                     → ANTHROPIC_API_KEY (gitignore'da)
│   └── frontend/                ← Frontend (Next.js 15, port 3333)
│       ├── app/page.tsx         → Ana sayfa: 3-panel layout + modals
│       ├── lib/cowork-api.ts    → Backend API client
│       └── components/cowork-army/
│           ├── CoworkOffice3D.tsx    → 3D ofis sahnesi (Three.js/R3F)
│           ├── AgentAvatar.tsx       → Agent 3D karakterleri
│           ├── AgentDesk.tsx         → Agent masalari
│           ├── scene-constants.ts    → Pozisyonlar, zone'lar, sabitler
│           ├── characters/           → Karakter builder + registry
│           ├── movement/             → Agent hareket sistemi
│           └── collaboration/        → Agent isbirligi beam'leri
│
└── Aktif Projeler/              ← Agent'larin calistigi projeler
    ├── Med-UI-Tra-main/         → Medikal Turizm Platformu
    ├── uAlgoTrade-main/         → Algoritmik Trading
    └── ...                      → Diger projeler
```

## Mimari

```
Telefon/Browser → Frontend (Railway / localhost:3333)
                      ↓ API calls
                  Backend (Cloudflare Tunnel / localhost:8888)
                      ↓
                  PostgreSQL (Docker / localhost:5433)
                      ↓
                  Claude API (Anthropic)
                      ↓
                  Aktif Projeler/ (dosya okuma/yazma)
```

## Agent Sistemi

### Base Agents (12 sabit)
Registry'de tanimli, DB'ye seed edilen, silinemez agentlar:

| ID | Rol | Tier |
|---|---|---|
| commander | Yonetici | COMMANDER |
| supervisor | Denetci | SUPERVISOR |
| med-health | Medikal Saglik | DIRECTOR |
| travel-agent | Seyahat | DIRECTOR |
| trade-engine | Trading Orchestrator | DIRECTOR |
| alpha-scout | Sentiment Hunter | WORKER |
| tech-analyst | Teknik Analiz | WORKER |
| risk-sentinel | Risk Guardian | WORKER |
| quant-lab | Nightly Optimizer | WORKER |
| growth-ops | Buyume & Pazarlama | WORKER |
| web-dev | Full-Stack Dev | WORKER |
| finance | Finans & Muhasebe | WORKER |

### Dinamik Agentlar
- UI'dan manuel olusturulabilir ("+ Yeni" butonu)
- Commander auto-route eslesmezse otomatik olusturulur
- PostgreSQL'e kaydedilir, silinebilir
- 3D sahnede "DYNAMIC AGENTS" zone'unda gorunur
- Hash-based prosedural karakter olusturma

## API Endpoints

### Agent CRUD
- `GET /api/agents` — Tum agentlar
- `GET /api/agents/:id` — Tek agent
- `POST /api/agents` — Yeni dinamik agent (FormData)
- `PUT /api/agents/:id` — Agent guncelle
- `DELETE /api/agents/:id` — Dinamik agent sil

### Agent Lifecycle
- `POST /api/agents/:id/spawn?task=...` — Agent baslat
- `POST /api/agents/:id/kill` — Agent durdur
- `GET /api/agents/:id/output` — Terminal output
- `GET /api/statuses` — Tum agent durumlari

### Tasks
- `GET /api/tasks` — Gorev listesi
- `POST /api/tasks` — Gorev olustur (FormData)

### Commander
- `POST /api/commander/delegate` — Otomatik gorev yonlendirme + spawn

### Autonomous Loop
- `POST /api/autonomous/start` — Otonom dongu baslat
- `POST /api/autonomous/stop` — Durdur
- `GET /api/autonomous/status` — Durum
- `GET /api/autonomous/events` — Event feed

### Settings
- `GET /api/settings/api-key-status` — API key durumu
- `POST /api/settings/api-key` — API key kaydet

## Calistirma

```bash
# PostgreSQL
cd cowork-army
docker compose up -d                # port 5433

# Backend
pip install -r requirements.txt
alembic upgrade head                # tablo olustur
python server.py                    # port 8888

# Frontend
cd cowork-army/frontend
npm install
npm run dev                         # port 3333
```

## Database

PostgreSQL 16 + async SQLAlchemy 2.0, 3 tablo:
- **agents**: id (PK), name, icon, tier, color, domain, description, skills (JSON), rules (JSON), triggers (JSON), system_prompt, workspace_dir, is_base, created_at, updated_at
- **tasks**: id (PK), title, description, assigned_to, priority, status, created_by, created_at, updated_at, log (JSON)
- **events**: id (SERIAL PK), timestamp (TIMESTAMPTZ), agent_id, message, type

Indexler: events(timestamp), tasks(status), tasks(assigned_to)

Connection: `DATABASE_URL` env var (default: `postgresql+asyncpg://cowork:cowork@localhost:5433/cowork_army`)

## Deploy

- **Frontend**: Railway (NEXT_PUBLIC_COWORK_API_URL env var)
- **Backend**: Cloudflare Tunnel → localhost:8888
- **Database**: Docker PostgreSQL (veya managed PG)
- **Domain**: ireska.com

## Kodlama Kurallari

1. Once dosyayi oku, mevcut pattern'i anla, sonra duzenle
2. TypeScript strict mode (frontend)
3. Conventional Commits: `feat:`, `fix:`, `refactor:`
4. `.env` dosyalarini asla commit etme
5. API key, secret, credentials kodda birakma
6. Yeni paket eklerken dikkatli ol
7. Database migration'larda veri kaybi riski varsa uyar

---

*COWORK.ARMY v6.0 — 12 base + dinamik agent destegi, PostgreSQL persistence, async SQLAlchemy, 3D gorsellestime*
