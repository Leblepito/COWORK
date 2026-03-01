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
│   ├── registry.py              → 14 base agent tanimi (BASE_AGENTS, 4 dept + cargo)
│   ├── runner.py                → Agent lifecycle: spawn → LLM API → done/error (multi-provider)
│   ├── llm_providers.py         → LLM provider abstraction (Anthropic + Gemini)
│   ├── autonomous.py            → Otonom dongu (asyncio task-based)
│   ├── commander.py             → Keyword-based task routing + dinamik agent olusturma
│   ├── tools.py                 → Agent tool definitions (read/write/search/run)
│   ├── requirements.txt         → Python bagimliliklari
│   ├── docker-compose.yml       → PostgreSQL 16 container (port 5433)
│   ├── alembic.ini              → Alembic migration config
│   ├── alembic/                 → Migration dosyalari
│   ├── meshy_generate.py        → Meshy.ai batch GLB model generation
│   ├── .env                     → API keys + LLM config (gitignore'da)
│   └── frontend/                ← Frontend (Next.js 14, port 3333)
│       ├── app/page.tsx         → Ana sayfa: 3-panel layout + modals + settings
│       ├── lib/cowork-api.ts    → Backend API client (multi-provider settings)
│       ├── lib/meshy.ts         → Meshy.ai client
│       └── components/cowork-army/
│           ├── CoworkOffice3D.tsx    → 3D ofis sahnesi (Three.js/R3F)
│           ├── scene-constants.ts    → Pozisyonlar, zone'lar, departman sabitleri
│           ├── departments/          → Departman 3D binalari
│           ├── characters/           → Karakter builder + registry (24 aksesuar)
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
                  LLM Provider (Anthropic Claude / Google Gemini)
                      ↓
                  Aktif Projeler/ (dosya okuma/yazma)
```

## Multi-LLM Destegi

Runner, `llm_providers.py` uzerinden provider-agnostic calisir:

| Provider | Env Key | Default Model |
|---|---|---|
| `anthropic` (default) | `ANTHROPIC_API_KEY` | `claude-sonnet-4-20250514` |
| `gemini` | `GOOGLE_API_KEY` | `gemini-2.5-pro-preview-05-06` |

`.env` dosyasi:
```
LLM_PROVIDER=anthropic          # veya gemini
ANTHROPIC_API_KEY=sk-ant-...
GOOGLE_API_KEY=AIza...
```

Dashboard Settings panelinden provider ve API key degistirilebilir.

## Agent Sistemi

### Base Agents (14 sabit, 4 departman + cargo hub)
Registry'de tanimli, DB'ye seed edilen, silinemez agentlar:

| Dept | ID | Rol | Tier |
|---|---|---|---|
| CARGO | cargo | Inter-dept Delivery Hub | SUPERVISOR |
| TRADE | trade-master | Trading Swarm Orchestrator | DIRECTOR |
| TRADE | chart-eye | Teknik Analiz & Chart Okuma | WORKER |
| TRADE | risk-guard | Risk Yonetimi (HARD VETO) | WORKER |
| TRADE | quant-brain | Backtest & Strateji Optimizasyon | WORKER |
| MEDICAL | clinic-director | Medikal Klinik Yonetimi | DIRECTOR |
| MEDICAL | patient-care | Hasta Bakim & Post-Op Takip | WORKER |
| HOTEL | hotel-manager | Otel & Konaklama Yonetimi | DIRECTOR |
| HOTEL | travel-planner | Seyahat Planlama & Transfer | WORKER |
| HOTEL | concierge | Misafir Hizmetleri | WORKER |
| SOFTWARE | tech-lead | Yazilim Gelistirme Yonetimi | DIRECTOR |
| SOFTWARE | full-stack | Full-Stack Gelistirme | WORKER |
| SOFTWARE | data-ops | Veri Analiz & SEO & Pazarlama | WORKER |

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

### Settings (Multi-Provider)
- `GET /api/settings/api-key-status` — Tum provider key durumlari + aktif provider
- `POST /api/settings/api-key` — API key kaydet (`key` + `provider` parametresi)
- `GET /api/settings/llm-provider` — Aktif LLM provider
- `POST /api/settings/llm-provider` — Provider degistir (anthropic/gemini)

## Calistirma

```bash
# PostgreSQL
cd cowork-army
docker compose up -d                # port 5433

# Backend
pip install -r requirements.txt     # anthropic + google-generativeai
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

*COWORK.ARMY v7.0 — 14 base agent (4 dept + cargo), multi-LLM (Claude + Gemini), PostgreSQL, async SQLAlchemy, 3D gorsellestime*
