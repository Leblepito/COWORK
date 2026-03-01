# CLAUDE.md — COWORK.ARMY v7.0

Sen **COWORK.ARMY Commander Agent**'issin. Bu platform, 4 departmanda 13 AI agenti yoneten, koordine eden ve 3D simule eden bir kontrol merkezidir.

## Proje Yapisi (v7.0 Monorepo)

```
COWORK/
├── backend/                          ← Unified FastAPI (port 8888)
│   ├── main.py                       → App entry, lifespan, CORS, routes
│   ├── config.py                     → Pydantic Settings (env vars)
│   ├── database/
│   │   ├── __init__.py               → setup_db(), get_db()
│   │   ├── connection.py             → Async engine, session factory
│   │   ├── models.py                 → ORM: Department, Agent, Task, Event, CargoLog
│   │   └── repository.py            → Async CRUD
│   ├── departments/
│   │   ├── __init__.py               → Department registry
│   │   ├── registry.py               → 4 departman + 13 agent tanimlari
│   │   ├── trade/
│   │   │   ├── agents.py             → school-game, indicator, algo-bot
│   │   │   ├── tools.py              → Trading-specific tools
│   │   │   └── prompts.py            → System prompts
│   │   ├── medical/
│   │   │   ├── agents.py             → clinic, health-tourism, manufacturing
│   │   │   ├── tools.py              → Medical-specific tools
│   │   │   └── prompts.py
│   │   ├── hotel/
│   │   │   ├── agents.py             → hotel, flight, rental
│   │   │   ├── tools.py              → Hotel/travel-specific tools
│   │   │   └── prompts.py
│   │   └── software/
│   │       ├── agents.py             → fullstack, app-builder, prompt-engineer
│   │       ├── tools.py              → Dev-specific tools
│   │       └── prompts.py
│   ├── cargo/
│   │   ├── agent.py                  → Cargo agent: analiz + routing
│   │   └── analyzer.py               → Dosya/veri icerik analizi
│   ├── agents/
│   │   ├── runner.py                 → Agent lifecycle (spawn/run/kill)
│   │   ├── autonomous.py             → Otonom dongu (30s tick)
│   │   ├── tools.py                  → Base tool definitions
│   │   └── commander.py              → Smart task routing
│   ├── api/
│   │   ├── agents.py                 → Agent CRUD + lifecycle routes
│   │   ├── tasks.py                  → Task routes
│   │   ├── departments.py            → Department routes
│   │   ├── cargo.py                  → Cargo upload + routing routes
│   │   ├── autonomous.py             → Autonomous loop routes
│   │   ├── websocket.py              → WebSocket hub
│   │   └── settings.py               → Settings routes
│   ├── requirements.txt
│   ├── Dockerfile
│   ├── alembic.ini
│   └── alembic/
│       └── versions/
│
├── frontend/                         ← Unified Next.js 15 (port 3333)
│   ├── app/
│   │   ├── page.tsx                  → Ana dashboard: 4 departman grid
│   │   ├── layout.tsx                → Root layout
│   │   ├── globals.css               → Tailwind v4 + theme
│   │   └── departments/
│   │       └── [dept]/page.tsx       → Departman 3D sahne goruntuleri
│   ├── components/
│   │   ├── scenes/
│   │   │   ├── DepartmentScene.tsx   → Generic department 3D wrapper
│   │   │   ├── TradeFloor.tsx        → Borsa/trading floor sahnesi
│   │   │   ├── HospitalHall.tsx      → Hastane koridoru sahnesi
│   │   │   ├── HotelLobby.tsx        → Otel onü sahnesi
│   │   │   ├── DigitalOffice.tsx     → Dijital ofis sahnesi
│   │   │   └── shared/
│   │   │       ├── AgentAvatar.tsx
│   │   │       ├── AgentDesk.tsx
│   │   │       ├── StatusLED.tsx
│   │   │       ├── SpeechBubble.tsx
│   │   │       ├── ZoneBorder.tsx
│   │   │       └── scene-utils.ts
│   │   ├── cargo/
│   │   │   ├── CargoAgent3D.tsx      → Kargo agent animasyonu
│   │   │   ├── CargoDropZone.tsx     → Drag & drop alan
│   │   │   └── TransferBeam.tsx      → Dosya transfer animasyonu
│   │   ├── characters/
│   │   │   ├── CharacterBuilder.tsx
│   │   │   ├── character-registry.ts
│   │   │   ├── accessories.tsx
│   │   │   └── index.ts
│   │   ├── movement/
│   │   │   ├── MovementSystem.tsx
│   │   │   ├── pathfinding.ts
│   │   │   └── index.ts
│   │   ├── collaboration/
│   │   │   ├── CollaborationBeam.tsx
│   │   │   ├── CollaborationDetector.ts
│   │   │   └── index.ts
│   │   └── ui/
│   │       ├── Toast.tsx
│   │       ├── TaskModal.tsx
│   │       ├── AgentPanel.tsx
│   │       └── DepartmentCard.tsx
│   ├── lib/
│   │   ├── api.ts                    → Unified API client
│   │   └── types.ts                  → Shared TypeScript types
│   ├── package.json
│   ├── next.config.ts
│   ├── postcss.config.mjs
│   └── tsconfig.json
│
├── docker-compose.yml                ← PostgreSQL 16 (port 5433)
├── Dockerfile                        ← Frontend production build
├── railway.toml                      ← Railway frontend config
├── CLAUDE.md                         ← Bu dosya
└── .gitignore
```

## Mimari (v7.0)

```
Browser/Telefon
     ↓
Frontend (Railway / localhost:3333)
  ├── Ana Dashboard: 4 departman karti
  ├── /departments/trade → TradeFloor 3D
  ├── /departments/medical → HospitalHall 3D
  ├── /departments/hotel → HotelLobby 3D
  └── /departments/software → DigitalOffice 3D
     ↓ REST + WebSocket
Backend (Railway / localhost:8888)
  ├── Cargo Agent → dosya analiz → departman routing
  ├── 4 Departman × 3 Agent = 12 worker agent
  ├── Autonomous Loop (30s tick)
  └── Claude API (Anthropic)
     ↓
PostgreSQL (Railway Managed / Docker localhost:5433)
  ├── departments, agents, tasks, events, cargo_logs
```

## Departman ve Agent Sistemi

### 4 Departman + 13 Agent

#### DEPT 1: TRADE (Borsa)
3D Sahne: Trading floor — grafik ekranlari, ticker tape

| Agent ID | Rol | Tier |
|---|---|---|
| school-game | Elliott Wave + SMC egitim oyunu | WORKER |
| indicator | Elliott Wave, SMC, Funding Rate analiz | WORKER |
| algo-bot | Algoritmik trade bot gelistirme | WORKER |

#### DEPT 2: MEDICAL (Saglik)
3D Sahne: Hastane koridoru — doktor/hemsire karakterler

| Agent ID | Rol | Tier |
|---|---|---|
| clinic | 60 odali klinik/hastane yonetimi | WORKER |
| health-tourism | Phuket→Turkiye hasta yonlendirme | WORKER |
| manufacturing | Kaucuk eldiven & maske uretim tesvik | WORKER |

#### DEPT 3: HOTEL (Otel/Seyahat)
3D Sahne: Otel onü — araba, motor, resepsiyon

| Agent ID | Rol | Tier |
|---|---|---|
| hotel | Oda satis ve rezervasyon yonetimi | WORKER |
| flight | Ucak bileti satis | WORKER |
| rental | Phuket araba & motosiklet kiralama | WORKER |

#### DEPT 4: SOFTWARE (Yazilim)
3D Sahne: Dijital ofis — ekranlar, kod editörleri

| Agent ID | Rol | Tier |
|---|---|---|
| fullstack | Frontend/Backend/Database gelistirme | WORKER |
| app-builder | Mobile + PC uygulama gelistirme | WORKER |
| prompt-engineer | Agent egitimi, skill.md olusturma | WORKER |

#### CARGO AGENT (Orkestrator)
3D: Tum departmanlar arasi dolasan kurye karakter

| Agent ID | Rol | Tier |
|---|---|---|
| cargo | Dosya analiz + departman routing | DIRECTOR |

### Cargo Agent Akisi

```
1. Kullanici dosya/klasor/veri yukler (drag & drop veya API)
2. Cargo Agent icerigi analiz eder (dosya tipi, anahtar kelimeler, domain)
3. Hedef departman + agent belirlenir
4. Veri, agentin anlayacagi format + prompt'a cevrilir
5. Ilgili agente teslim edilir (inbox JSON)
6. Tum surec 3D'de animasyonla gosterilir:
   - Cargo agent dosyayi tasirken konusma baloncugu
   - Baloncuga tiklaninca detay paneli acilir
   - Transfer beam animasyonu (cargo → hedef agent)
```

## API Endpoints (v7.0)

### Departments
- `GET  /api/departments` — 4 departman listesi
- `GET  /api/departments/:id` — Tek departman + agentlari

### Agent CRUD
- `GET  /api/agents` — Tum agentlar (dept filter destegi)
- `GET  /api/agents/:id` — Tek agent
- `POST /api/agents` — Yeni dinamik agent
- `PUT  /api/agents/:id` — Agent guncelle
- `DELETE /api/agents/:id` — Dinamik agent sil

### Agent Lifecycle
- `POST /api/agents/:id/spawn?task=...` — Agent baslat
- `POST /api/agents/:id/kill` — Agent durdur
- `GET  /api/agents/:id/output` — Terminal output
- `GET  /api/statuses` — Tum agent durumlari

### Tasks
- `GET  /api/tasks` — Gorev listesi (dept filter)
- `POST /api/tasks` — Gorev olustur

### Cargo
- `POST /api/cargo/upload` — Dosya yukle + analiz + routing
- `GET  /api/cargo/logs` — Cargo transfer gecmisi
- `POST /api/cargo/delegate` — Manuel gorev yonlendirme

### Autonomous Loop
- `POST /api/autonomous/start` — Otonom dongu baslat
- `POST /api/autonomous/stop` — Durdur
- `GET  /api/autonomous/status` — Durum
- `GET  /api/autonomous/events` — Event feed

### WebSocket
- `WS /ws/events` — Real-time agent durum + event stream

### Settings
- `GET  /api/settings/api-key-status` — API key durumu
- `POST /api/settings/api-key` — API key kaydet
- `GET  /api/info` — Server bilgisi

## Database (v7.0)

PostgreSQL 16 + async SQLAlchemy 2.0

### Tablolar

**departments**
- id (VARCHAR PK) — trade, medical, hotel, software
- name (VARCHAR)
- icon (VARCHAR)
- color (VARCHAR)
- scene_type (VARCHAR) — trade_floor, hospital_hall, hotel_lobby, digital_office
- description (TEXT)

**agents**
- id (VARCHAR PK) — school-game, clinic, hotel, fullstack, cargo, etc.
- department_id (VARCHAR FK → departments.id, nullable for cargo)
- name (VARCHAR)
- icon (VARCHAR)
- tier (VARCHAR) — DIRECTOR, WORKER
- color (VARCHAR)
- domain (VARCHAR)
- description (TEXT)
- skills (JSON)
- rules (JSON)
- triggers (JSON)
- system_prompt (TEXT)
- workspace_dir (VARCHAR)
- is_base (BOOLEAN)
- created_at, updated_at (TIMESTAMPTZ)

**tasks**
- id (VARCHAR PK)
- title (VARCHAR)
- description (TEXT)
- department_id (VARCHAR FK → departments.id, nullable)
- assigned_to (VARCHAR FK → agents.id)
- priority (VARCHAR) — low, medium, high, critical
- status (VARCHAR) — pending, in_progress, done, failed
- created_by (VARCHAR)
- created_at, updated_at (TIMESTAMPTZ)
- log (JSON)

**events**
- id (SERIAL PK)
- timestamp (TIMESTAMPTZ)
- department_id (VARCHAR, nullable)
- agent_id (VARCHAR)
- message (TEXT)
- type (VARCHAR) — info, task_created, inbox_check, cargo_route, warning, error

**cargo_logs**
- id (SERIAL PK)
- timestamp (TIMESTAMPTZ)
- filename (VARCHAR)
- file_type (VARCHAR)
- file_size (INTEGER)
- analysis (JSON) — detected keywords, domain, confidence
- source_department_id (VARCHAR, nullable)
- target_department_id (VARCHAR)
- target_agent_id (VARCHAR)
- status (VARCHAR) — analyzing, routing, delivered, failed
- prompt_generated (TEXT) — agente gonderilen prompt

Indexler:
- events(timestamp), events(department_id)
- tasks(status), tasks(assigned_to), tasks(department_id)
- cargo_logs(timestamp), cargo_logs(target_agent_id)
- agents(department_id)

## Calistirma

```bash
# PostgreSQL
docker compose up -d                # port 5433

# Backend
cd backend
pip install -r requirements.txt
alembic upgrade head
python main.py                      # port 8888

# Frontend
cd frontend
npm install
npm run dev                         # port 3333
```

## Deploy (Railway)

### 2 Service Yaklasimi
- **Frontend Service**: Root Dockerfile → Next.js standalone build
  - Env: NEXT_PUBLIC_COWORK_API_URL
- **Backend Service**: backend/Dockerfile → FastAPI + alembic
  - Env: DATABASE_URL, ANTHROPIC_API_KEY, PORT
- **Database**: Railway Managed PostgreSQL
- **Domain**: ireska.com

## Kodlama Kurallari

1. Once dosyayi oku, mevcut pattern'i anla, sonra duzenle
2. TypeScript strict mode (frontend)
3. Python type hints (backend)
4. Conventional Commits: `feat:`, `fix:`, `refactor:`
5. `.env` dosyalarini asla commit etme
6. API key, secret, credentials kodda birakma
7. Database migration'larda veri kaybi riski varsa uyar
8. Her departmanin agent'lari kendi dizininde tanimlanir
9. 3D sahneler departman bazli ayrilir, shared componentlar ortaklanir

---

*COWORK.ARMY v7.0 — 4 departman, 13 agent, Cargo orkestrator, departman bazli 3D sahneler, PostgreSQL, Railway deploy*
