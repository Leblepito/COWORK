# COWORK

**AntiGravity Ventures** monorepo — AI agent ordusu, coworking yonetim platformu ve admin paneli.

## Projeler

| Klasor | Aciklama | Tech Stack | Port |
|--------|----------|------------|------|
| [`cowork-army/`](cowork-army/) | AI Agent ordusu kontrol merkezi (Backend) | FastAPI, SQLite, Claude API | 8888 |
| [`cowork-army/frontend/`](cowork-army/frontend/) | Agent kontrol paneli (Frontend) | Next.js 15, Three.js, React Three Fiber | 3333 |
| [`cowork-api/`](cowork-api/) | Coworking alan yonetim API'si | FastAPI, PostgreSQL, Stripe | 8080 |
| [`cowork-admin/`](cowork-admin/) | Admin dashboard | Next.js 15, Tailwind CSS | 3001 |
| [`agents/`](agents/) | Agent modulleri ve sablonlari | Python, Phaser.js | — |

## Mimari

```
Browser / Mobil
    │
    ├── cowork-army/frontend (:3333)  ──→  cowork-army backend (:8888)  ──→  Claude API
    │                                              │
    │                                         SQLite (cowork.db)
    │                                              │
    │                                       Aktif Projeler/ (dosya R/W)
    │
    ├── cowork-admin (:3001)  ──→  cowork-api (:8080)  ──→  PostgreSQL
    │                                     │
    │                                  Stripe API
    │
    └── ireska.com (production)
```

## Hizli Baslangic

```bash
# 1. cowork-army backend
cd cowork-army
cp .env.example .env          # ANTHROPIC_API_KEY ekle
pip install -r requirements.txt
python server.py              # → http://localhost:8888

# 2. cowork-army frontend
cd cowork-army/frontend
npm install
npm run dev                   # → http://localhost:3333

# 3. cowork-api (opsiyonel)
cd cowork-api
pip install -e .
uvicorn src.main:app --port 8080

# 4. cowork-admin (opsiyonel)
cd cowork-admin
npm install
npm run dev                   # → http://localhost:3001
```

## Deploy

| Servis | Platform | Domain |
|--------|----------|--------|
| cowork-army frontend | Railway | cowork.army |
| cowork-army backend | Cloudflare Tunnel | cowork.army/api |
| cowork-api | Railway | api.ireska.com |
| cowork-admin | Railway | admin.ireska.com |

## Agent Sistemi (cowork-army)

15 base agent + dinamik agent destegi:

| Agent | Rol | Tier |
|-------|-----|------|
| commander | Yonetici | COMMANDER |
| supervisor | Denetci | SUPERVISOR |
| kargocu | Akilli Gorev Yonlendirici | SUPERVISOR |
| med-health | Medikal Saglik | DIRECTOR |
| travel-agent | Seyahat | DIRECTOR |
| trade-engine | Trading Orchestrator | DIRECTOR |
| alpha-scout | Sentiment Hunter | WORKER |
| tech-analyst | Teknik Analiz | WORKER |
| risk-sentinel | Risk Guardian | WORKER |
| quant-lab | Nightly Optimizer | WORKER |
| game-dev | Game BuDev (Phaser.js) | WORKER |
| deploy-ops | CI/CD & Deploy | WORKER |
| growth-ops | Buyume & Pazarlama | WORKER |
| web-dev | Full-Stack Dev | WORKER |
| finance | Finans & Muhasebe | WORKER |

## Proje Yapisi

```
COWORK/
├── cowork-army/                 ← AI Agent backend (FastAPI)
│   ├── server.py                → API sunucusu
│   ├── database.py              → SQLite (agents, tasks, events)
│   ├── registry.py              → 15 base agent tanimi
│   ├── runner.py                → Agent lifecycle (spawn → run → done)
│   ├── autonomous.py            → Otonom tick dongusu
│   ├── commander.py             → Gorev yonlendirme
│   ├── tools.py                 → Agent tool definitions
│   └── frontend/                ← Agent kontrol paneli (Next.js)
│       ├── app/page.tsx         → 3-panel layout + modals
│       ├── lib/cowork-api.ts    → Backend API client
│       └── components/cowork-army/
│           ├── CoworkOffice3D.tsx    → 3D ofis sahnesi
│           ├── AgentAvatar.tsx       → Agent 3D karakterleri
│           ├── characters/           → Karakter builder
│           ├── movement/             → Hareket sistemi
│           └── collaboration/        → Isbirligi beam'leri
│
├── cowork-api/                  ← Coworking yonetim API'si (FastAPI)
│   ├── src/
│   │   ├── main.py              → FastAPI app, CORS, routers
│   │   ├── config.py            → Environment settings
│   │   ├── auth.py              → JWT + bcrypt
│   │   ├── database/            → SQLAlchemy models + async connection
│   │   ├── routers/             → Auth, spaces, bookings, billing, analytics
│   │   └── schemas/             → Pydantic validation
│   └── alembic/                 → DB migrations
│
├── cowork-admin/                ← Admin dashboard (Next.js)
│   ├── app/
│   │   ├── dashboard/           → KPI cards, son rezervasyonlar
│   │   ├── spaces/              → Alan CRUD yonetimi
│   │   ├── bookings/            → Rezervasyon yonetimi
│   │   └── members/             → Uye listesi
│   ├── components/
│   │   └── AdminShell.tsx       → Sidebar layout
│   └── lib/
│       ├── api.ts               → API client
│       └── auth.ts              → JWT auth context
│
└── agents/                      ← Agent modulleri
    ├── phaser_game_developer_agent.py  → Oyun uretim motoru
    └── phaser_templates/               → HTML oyun sablonlari
```

## Kodlama Kurallari

- Conventional Commits: `feat:`, `fix:`, `refactor:`
- TypeScript strict mode (frontend)
- `.env` dosyalari commit edilmez
- API key / secret kodda birakilmaz

## Lisans

Private — AntiGravity Ventures
