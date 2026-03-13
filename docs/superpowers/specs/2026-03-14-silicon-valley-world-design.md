# COWORK.ARMY — Silicon Valley World (`/world`) Tasarım Spesifikasyonu

**Tarih:** 2026-03-14  
**Versiyon:** 1.0  
**Durum:** Onaylandı

---

## 1. Genel Bakış

`/world` sayfası, COWORK.ARMY agent ekosistemini canlı bir Silicon Vadisi şehri olarak görselleştiren bir izleme ve etkileşim arayüzüdür. 16 agent ve 5 departman, gerçek zamanlı iletişim ve dış veri tetiklemeleriyle birlikte HTML5 Canvas üzerinde izometrik bir şehir haritasında canlandırılır.

### Hedefler

- Agent'ların birbirleriyle iletişimini ve iş aktarımını görsel olarak anlaşılır kılmak
- Gerçek piyasa verileri ve haberlerle tetiklenen otonom agent aktivitesini göstermek
- Kullanıcının hangi agent'ın hangi departmanda çalıştığını renk ve konum ile anında ayırt etmesini sağlamak
- Sistemi performanslı tutmak (mobil dahil)

---

## 2. Mimari

### 2.1 Genel Akış

```
Dış Veri (piyasa/haber/sosyal/operasyonel/sistem)
    ↓
ExternalDataWatcher (5 katman, bağımsız DataStream'ler)
    ↓
AgentMessageBus (PostgreSQL kalıcı kayıt + Redis WorkingMemory)
    ↓
AgentScheduler (asyncio.PriorityQueue, cascade zinciri)
    ↓
WebSocket broadcast (agent_message / external_trigger / agent_status / cascade_event)
    ↓
Frontend Canvas (/world sayfası)
    ↓
Animasyon: ışık çizgisi, bina parıltısı, maskot animasyonu, cascade dalgası
```

### 2.2 Backend Yeni Bileşenler

| Bileşen | Dosya | Sorumluluk |
|---|---|---|
| `AgentMessageBus` | `backend/agents/message_bus.py` | Agent arası mesaj protokolü, PostgreSQL kayıt, WebSocket broadcast |
| `AgentWorldModel` | `backend/agents/world_model.py` | Her agent'ın bilişsel durumu: uzmanlık skoru, güven ağı, enerji, hafıza |
| `AgentMemory` | `backend/agents/memory.py` | EpisodicMemory, SemanticMemory, WorkingMemory, SharedMemory |
| `ExternalDataWatcher` | `backend/agents/external_watcher.py` | 5 katman dış veri izleme, tetikleme eşikleri |
| `AgentScheduler` | `backend/agents/scheduler.py` | Öncelik kuyruğu, idle timeout, cascade zinciri |
| `AgentEconomy` | `backend/agents/economy.py` | Görev maliyet/değer skoru, bütçe yönetimi, kapasite kontrolü |

### 2.3 Frontend Yeni Bileşenler

| Bileşen | Dosya | Sorumluluk |
|---|---|---|
| `WorldPage` | `frontend/src/app/world/page.tsx` | Ana sayfa, WebSocket bağlantısı |
| `CityCanvas` | `frontend/src/components/world/CityCanvas.tsx` | HTML5 Canvas izometrik şehir renderer |
| `BuildingRenderer` | `frontend/src/components/world/BuildingRenderer.ts` | 5 departman binası çizimi |
| `AgentMascot` | `frontend/src/components/world/AgentMascot.tsx` | CSS sprite animasyonlu maskot bileşeni |
| `MessageParticle` | `frontend/src/components/world/MessageParticle.ts` | Işık çizgisi ve parçacık animasyonu |
| `CascadeWave` | `frontend/src/components/world/CascadeWave.ts` | Cascade dalga animasyonu |
| `LiveFeed` | `frontend/src/components/world/LiveFeed.tsx` | Sol panel: canlı mesaj akışı |
| `EconomyPanel` | `frontend/src/components/world/EconomyPanel.tsx` | Sağ panel: ekonomi metrikleri |

---

## 3. Agent Bilişsel Modeli

### 3.1 WorldModel

Her agent şu durumu takip eder:

```python
@dataclass
class AgentWorldModel:
    agent_id: str
    expertise_score: float          # 0.0 - 1.0, geçmiş başarılardan
    trust_network: dict[str, float] # agent_id → güven skoru
    energy_level: float             # 0.0 - 1.0, görev yüküne göre
    current_task: Optional[str]
    working_memory: list[dict]      # Son 20 mesaj/sonuç
    idle_timeout_seconds: int       # Kaç saniye boşta kalınca rutin görev
```

### 3.2 Bellek Katmanları

- **EpisodicMemory**: PostgreSQL `agent_episodes` tablosu. Her tamamlanan görev bir episode. Vektör indeksi ile benzer geçmiş görevler sorgulanabilir.
- **SemanticMemory**: PostgreSQL `agent_knowledge` tablosu. Departman bazlı bilgi tabanı. Bir agent öğrendiğini `SharedMemory`'ye yazarsa diğerleri okuyabilir.
- **WorkingMemory**: In-memory dict, aktif görev bağlamı. Redis'e yedeklenir.
- **SharedMemory**: PostgreSQL `shared_knowledge` tablosu. Tüm agent'ların okuma/yazma erişimi.

---

## 4. Agent-to-Agent Müzakere Protokolü

### 4.1 Mesaj Tipleri

| Tip | Açıklama |
|---|---|
| `CAPABILITY_QUERY` | "Bu görevi yapabilir misin?" |
| `AVAILABILITY_RESPONSE` | "Müsaitim / Yüklüyüm, X'i öner" |
| `NEGOTIATION` | Görev detayı, öncelik, beklenen süre müzakeresi |
| `CONTRACT` | Anlaşma onayı |
| `TASK_ASSIGN` | Görev ataması |
| `TASK_RESULT` | Görev sonucu |
| `CONSULTATION` | Danışma (sonuç beklenmez) |
| `ESCALATION` | Üst katmana iletme |
| `BROADCAST` | Tüm departmana duyuru |

### 4.2 Mesaj Şeması

```python
@dataclass
class AgentMessage:
    id: str                    # UUID
    from_agent: str
    to_agent: str              # veya "broadcast:department_id"
    message_type: MessageType
    priority: Priority         # LOW / MEDIUM / HIGH / CRITICAL
    payload: dict              # görev detayı, bağlam, önceki sonuçlar
    thread_id: str             # konuşma zinciri ID
    cascade_id: Optional[str]  # cascade zinciri ID
    timestamp: datetime
    status: MessageStatus      # SENT / RECEIVED / PROCESSING / DONE / FAILED
```

### 4.3 Öncelik Kuralları

- `CRITICAL`: Mevcut görevi interrupt edebilir
- `HIGH`: Kuyruğun önüne geçer
- `MEDIUM`: Normal sıra
- `LOW`: Boşta kalınınca işlenir

---

## 5. ExternalDataWatcher — 5 Katman

### 5.1 Piyasa Katmanı
- BTC, ETH, SOL fiyatları (30 saniye)
- Funding rate, fear & greed index (5 dakika)
- Tetikleme: %1 değişim → MEDIUM, %2 → HIGH, %5 → CRITICAL
- Hedef: Trade departmanı

### 5.2 Haber Katmanı
- Finans, sağlık, teknoloji, seyahat haberleri (RSS/API, 10 dakika)
- LLM ile önem skoru (0-10) hesaplanır
- Skor ≥ 7 → ilgili departman uyandırılır
- Hedef: İçeriğe göre ilgili departman

### 5.3 Sosyal Katman
- Twitter/X trend konuları (15 dakika)
- Kripto, finans, AI trendleri
- Hedef: Bots/SocialMediaManager

### 5.4 Operasyonel Katman
- Hava durumu (seyahat rotaları için, 30 dakika)
- Uçuş durumu değişimleri (15 dakika)
- Hedef: Hotel/FlightAgent, Hotel/RentalAgent

### 5.5 Sistem Katmanı
- Railway deployment durumu (1 dakika)
- Backend API sağlık metrikleri (30 saniye)
- Hedef: Software departmanı

Her katman bağımsız `DataStream` nesnesi olarak çalışır, kendi hata yönetimi ve retry mantığıyla.

---

## 6. AgentScheduler ve Cascade Sistemi

### 6.1 Scheduler

```python
class AgentScheduler:
    queue: asyncio.PriorityQueue   # (priority, timestamp, task)
    active_tasks: dict[str, Task]  # agent_id → aktif görev
    cascade_tracker: dict[str, CascadeChain]
```

Her agent'ın `idle_timeout` süresi dolunca scheduler devreye girer. Agent'ın `WorldModel`'ından bağlam alınır, LLM'e "ne yapmalısın?" sorusu sorulur, gerçek bir aksiyon üretilir.

### 6.2 Cascade Zinciri

```python
@dataclass
class CascadeChain:
    cascade_id: str
    trigger: ExternalTrigger       # tetikleyen dış olay
    chain: list[AgentMessage]      # zincirdeki tüm mesajlar
    affected_departments: set[str]
    depth: int                     # zincir derinliği
    started_at: datetime
    completed_at: Optional[datetime]
```

Cascade tamamlandığında frontend'e `cascade_complete` eventi gönderilir.

---

## 7. AgentEconomy

```python
@dataclass
class TaskEconomy:
    task_id: str
    cost: float      # hesaplama maliyeti (LLM token tahmini)
    value: float     # beklenen çıktı değeri (uzmanlık skoru × öncelik)
    budget_used: float
```

DIRECTOR tier agent'lar departman bütçesini yönetir. Toplam kapasite aşılırsa düşük öncelikli görevler kuyrukta bekler.

---

## 8. WebSocket Event Tipleri

| Event | Payload | Tetikleyici |
|---|---|---|
| `update` | statuses, events | 2 saniyede bir (mevcut) |
| `agent_message` | from, to, type, summary, thread_id | Agent mesaj gönderince |
| `agent_status` | agent_id, status, energy, current_task | Durum değişince |
| `external_trigger` | source, department, severity, summary | Dış veri eşiği aşılınca |
| `cascade_event` | cascade_id, step, affected_departments | Cascade adımı tamamlanınca |
| `cascade_complete` | cascade_id, depth, duration, summary | Zincir bitince |
| `negotiation` | from, to, stage, summary | Müzakere adımı |
| `economy_update` | agent_id, budget_used, queue_depth | Ekonomi değişince |

---

## 9. Frontend Canvas Tasarımı

### 9.1 Layout

```
┌─────────────────────────────────────────────────────────┐
│  LiveFeed (sol, 280px)  │  CityCanvas (orta)  │  EconomyPanel (sağ, 240px)  │
│  Son 20 mesaj           │  İzometrik şehir    │  Metrikler                  │
│  Renk kodlu event'ler   │  5 bina + maskotlar │  Aktif agent'lar            │
│                         │  Animasyonlar       │  Cascade derinliği          │
└─────────────────────────────────────────────────────────┘
```

### 9.2 Departman Renk Temaları

| Departman | Ana Renk | Bina Rengi | Maskot Rengi |
|---|---|---|---|
| Trade | `#00ff88` (yeşil) | Koyu yeşil çatı | Yeşil |
| Medical | `#00aaff` (mavi) | Beyaz/mavi | Mavi |
| Hotel | `#ff8800` (turuncu) | Turuncu/altın | Turuncu |
| Software | `#aa00ff` (mor) | Koyu mor | Mor |
| Bots | `#ff3333` (kırmızı) | Gri/kırmızı | Kırmızı |

### 9.3 Animasyon Türleri

**Işık Çizgisi (MessageParticle):**
- Kaynak binadan hedef binaya eğri yay çizerek uçan parlak nokta
- Renk: gönderen agent'ın departman rengi
- Süre: 800ms
- Hedefe çarptığında: küçük parıltı efekti (200ms)

**Bina Parıltısı:**
- Agent aktif çalışırken bina hafifçe glow efekti
- Cascade tetiklenince bina nabız atıyor (pulse, 3 kez)

**Maskot Animasyonları (CSS sprite, SVG):**
- `idle`: Hafif nefes alma (scale 1.0 → 1.05, 2s loop)
- `working`: Hızlı titreşim (translateX ±2px, 0.3s loop)
- `sending`: Yukarı zıplama (translateY -8px, 400ms)
- `receiving`: Parıltı (opacity 0.5 → 1.0, 300ms)
- `error`: Baş sallama (rotate ±5deg, 600ms)
- `success`: Küçük sevinç zıplaması (translateY -12px, 500ms)

Performans: Aynı anda maksimum 4 maskot `working`/`sending`/`receiving` animasyonunda. Diğerleri `idle` frame'de bekler.

**Cascade Dalgası (CascadeWave):**
- Kaynak binadan yayılan daire şeklinde dalga
- Etkilenen binalara ulaşınca o binada da dalga başlıyor
- Renk: tetikleyen dış verinin kategorisine göre

**Müzakere Ping-Pong:**
- İki bina arasında gidip gelen küçük ışık noktaları
- `NEGOTIATION` mesajları süresince devam eder

### 9.4 Ana Sayfa Mini Widget

`/` (ana sayfa) üzerinde sağ alt köşede küçük bir "şehir önizlemesi" widget'ı. 200x150px, canlı animasyon. Tıklayınca `/world` sayfasına yönlendirir.

---

## 10. Veritabanı Şeması (Yeni Tablolar)

```sql
-- Agent mesajları
CREATE TABLE agent_messages (
    id UUID PRIMARY KEY,
    from_agent VARCHAR(100),
    to_agent VARCHAR(100),
    message_type VARCHAR(50),
    priority VARCHAR(20),
    payload JSONB,
    thread_id UUID,
    cascade_id UUID,
    status VARCHAR(20),
    created_at TIMESTAMP DEFAULT NOW(),
    completed_at TIMESTAMP
);

-- Agent bilişsel durumu
CREATE TABLE agent_world_models (
    agent_id VARCHAR(100) PRIMARY KEY,
    expertise_score FLOAT DEFAULT 0.5,
    trust_network JSONB DEFAULT '{}',
    energy_level FLOAT DEFAULT 1.0,
    idle_timeout_seconds INT DEFAULT 300,
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Episodik hafıza
CREATE TABLE agent_episodes (
    id UUID PRIMARY KEY,
    agent_id VARCHAR(100),
    task_summary TEXT,
    outcome VARCHAR(20),
    duration_seconds INT,
    embedding VECTOR(1536),  -- pgvector
    created_at TIMESTAMP DEFAULT NOW()
);

-- Paylaşılan bilgi
CREATE TABLE shared_knowledge (
    id UUID PRIMARY KEY,
    author_agent VARCHAR(100),
    category VARCHAR(100),
    content TEXT,
    relevance_score FLOAT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Cascade zincirleri
CREATE TABLE cascade_chains (
    cascade_id UUID PRIMARY KEY,
    trigger_source VARCHAR(100),
    trigger_summary TEXT,
    affected_departments TEXT[],
    depth INT,
    started_at TIMESTAMP,
    completed_at TIMESTAMP
);
```

---

## 11. Hata Yönetimi

- Her `DataStream` bağımsız try/except ile çalışır, bir katman çöküşü diğerlerini etkilemez
- Agent mesaj gönderimi başarısız olursa `FAILED` statüsüne alınır, 3 kez retry yapılır
- WebSocket bağlantısı kesilirse frontend 5 saniye sonra yeniden bağlanır
- Canvas animasyonu `requestAnimationFrame` ile çalışır, sekme arka plana geçince durur (performans)
- Cascade zinciri maksimum 10 adımla sınırlandırılır (sonsuz döngü önlemi)

---

## 12. Test Stratejisi

- `test_message_bus.py`: Mesaj gönderme, öncelik sıralaması, retry mantığı
- `test_scheduler.py`: Idle timeout, cascade zinciri, kapasite kontrolü
- `test_external_watcher.py`: Mock veri ile tetikleme eşikleri
- `test_world_model.py`: Enerji hesabı, güven ağı güncellemesi
- Frontend: Canvas render testi (jest + canvas mock), WebSocket mock testi

---

## 13. Uygulama Sırası (Önerilen)

1. **Backend temel**: `AgentMessageBus` + yeni DB tabloları + WebSocket event tipleri
2. **Frontend temel**: `/world` sayfası + `CityCanvas` + `BuildingRenderer` (statik, veri yok)
3. **Bağlantı**: WebSocket entegrasyonu + `MessageParticle` animasyonu
4. **Maskotlar**: `AgentMascot` CSS animasyonları
5. **Bilişsel katman**: `AgentWorldModel` + `AgentMemory`
6. **Scheduler**: `AgentScheduler` + idle timeout + cascade
7. **Dış veri**: `ExternalDataWatcher` 5 katman
8. **Ekonomi**: `AgentEconomy` + `EconomyPanel`
9. **Cascade animasyon**: `CascadeWave` + müzakere ping-pong
10. **Ana sayfa widget**: Mini şehir önizlemesi
