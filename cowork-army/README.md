# cowork-army

**COWORK.ARMY Backend** — AI agent ordusu kontrol merkezi.

15 base agent + dinamik agent destegi ile gorev dagitimi, koordinasyon ve otonom calistirma.

## Tech Stack

- **Framework:** FastAPI 0.115+
- **Database:** SQLite (WAL mode, thread-safe)
- **AI:** Anthropic Claude API (anthropic SDK)
- **Python:** 3.11+

## Kurulum

```bash
cp .env.example .env          # ANTHROPIC_API_KEY ekle
pip install -r requirements.txt
python server.py              # → http://localhost:8888
```

## Ortam Degiskenleri

| Degisken | Aciklama | Varsayilan |
|----------|----------|------------|
| `ANTHROPIC_API_KEY` | Claude API anahtari | — (zorunlu) |
| `COWORK_ROOT` | Proje kok dizini | `..` |

## Dosya Yapisi

```
cowork-army/
├── server.py           → FastAPI sunucusu, tum API route'lari
├── database.py         → SQLite DB yonetimi (agents, tasks, events)
├── registry.py         → 15 base agent tanimi (BASE_AGENTS dict)
├── runner.py           → Agent lifecycle: spawn → run → done/error
├── autonomous.py       → Otonom dongu (30sn tick, stale task retry)
├── commander.py        → Keyword-based task routing + Kargocu fallback
├── tools.py            → Agent tool tanimlari + executor'lar
├── tasks.py            → Gorev yardimci fonksiyonlari
├── tasks.json          → Statik gorev tanimlari
├── requirements.txt    → Python bagimliliklari
├── Procfile            → Railway deploy komutu
├── .env.example        → Ortam degiskenleri ornegi
└── frontend/           → Next.js frontend (ayri README)
```

## API Endpoints

### Agents
| Method | Endpoint | Aciklama |
|--------|----------|----------|
| GET | `/api/agents` | Tum agentlar |
| GET | `/api/agents/:id` | Tek agent detayi |
| POST | `/api/agents` | Yeni dinamik agent olustur |
| PUT | `/api/agents/:id` | Agent guncelle |
| DELETE | `/api/agents/:id` | Dinamik agent sil |

### Agent Lifecycle
| Method | Endpoint | Aciklama |
|--------|----------|----------|
| POST | `/api/agents/:id/spawn?task=...` | Agent baslat |
| POST | `/api/agents/:id/kill` | Agent durdur |
| GET | `/api/agents/:id/output` | Terminal output |
| GET | `/api/statuses` | Tum agent durumlari |

### Tasks
| Method | Endpoint | Aciklama |
|--------|----------|----------|
| GET | `/api/tasks` | Gorev listesi |
| POST | `/api/tasks` | Gorev olustur |
| GET | `/api/tasks/:id` | Tek gorev |
| PUT | `/api/tasks/:id` | Gorev guncelle |

### Commander
| Method | Endpoint | Aciklama |
|--------|----------|----------|
| POST | `/api/commander/delegate` | Otomatik gorev yonlendirme |

### Autonomous Loop
| Method | Endpoint | Aciklama |
|--------|----------|----------|
| POST | `/api/autonomous/start` | Otonom donguyu baslat |
| POST | `/api/autonomous/stop` | Durdur |
| GET | `/api/autonomous/status` | Dongu durumu |
| GET | `/api/autonomous/events` | Event feed |

### Settings
| Method | Endpoint | Aciklama |
|--------|----------|----------|
| GET | `/api/settings/api-key-status` | API key durumu |
| POST | `/api/settings/api-key` | API key kaydet |

## Agent Tier Hiyerarsisi

```
COMMANDER (commander)
    └── SUPERVISOR (supervisor, kargocu)
            └── DIRECTOR (med-health, travel-agent, trade-engine)
                    └── WORKER (geri kalan 9 agent)
```

## Agent Tool Sistemi

### Standart Tools (tum agentlar)
- `read_file` — Dosya okuma
- `write_file` — Dosya yazma
- `list_directory` — Dizin listeleme
- `search_code` — Kod arama
- `run_command` — Shell komutu calistirma

### Delegation Tools (sadece Kargocu)
- `list_agents` — Tum agentlari listele
- `delegate_task` — Gorevi uygun agenta yonlendir

### Deploy Tools (sadece Deploy Ops)
- `git_operations` — Git islemleri (commit, push, branch, vb.)
- `railway_deploy` — Railway deploy (up, logs, rollback)
- `check_secrets` — Secret tarama (dosya + staged diff)

## Database Semalari

```sql
-- agents: Agent tanimlari
agents (id, name, icon, tier, color, domain, desc, skills, rules,
        triggers, system_prompt, workspace_dir, is_base, created_at)

-- tasks: Gorevler
tasks (id, title, description, assigned_to, priority, status,
       created_by, created_at, log)

-- events: Sistem olaylari
events (id, timestamp, agent_id, message, type)
```

## Otonom Dongu

30 saniyede bir calisan tick mekanizmasi:

1. **Pending gorevleri spawn et** — Uygun agenti bul ve baslat
2. **Stale gorevleri yeniden baslat** — Agent durmus ama gorev bitmemis (max 5 retry)
3. **Supervisor inbox kontrol** — Supervisor'a gelen mesajlari isle
4. **Quant-lab zamanlanmis gorevler** — Gece optimizasyonu

## Deploy

```bash
# Railway (Procfile kullanir)
web: uvicorn server:app --host 0.0.0.0 --port ${PORT:-8888}
```

Cloudflare Tunnel ile localhost:8888 → cowork.army/api
