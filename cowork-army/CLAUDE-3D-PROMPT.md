# COWORK.ARMY 3D Ofis Sahnesi — Claude Code Talimatlari

Bu dosya COWORK.ARMY bagimsiz agent merkezinin 3D ofis sahnesi frontend talimatlarini icerir.
**Hedef dizin:** `cowork-army/frontend/` (Med-UI-Tra'dan bagimsiz, kendi basina calisan Next.js app)

---

## GOREV

`cowork-army/frontend/` icindeki Next.js uygulamasina **3D animasyonlu ofis sahnesi** ekle. Bu sahne COWORK.ARMY backend'inden (port 8888) agent verilerini cekerek, her agent'i 3D ofis ortaminda canli olarak gosterecek.

## ADIMLAR

### ADIM 1: Bagimliliklar

```bash
cd cowork-army/frontend
npm install @react-three/fiber @react-three/drei three
npm install -D @types/three
```

### ADIM 2: next.config.ts — Cowork API proxy

`cowork-army/frontend/next.config.ts` dosyasinda:

```typescript
import type { NextConfig } from "next";

const coworkUrl = process.env.COWORK_API_URL || "http://localhost:8888";

const nextConfig: NextConfig = {
    output: "standalone",
    async rewrites() {
        return [
            // Cowork Army API proxy
            {
                source: "/cowork-api/:path*",
                destination: `${coworkUrl}/api/:path*`,
            },
        ];
    },
    // Three.js icin transpile
    transpilePackages: ["three"],
};

export default nextConfig;
```

### ADIM 3: `lib/cowork-api.ts` — API Client

Dosya: `cowork-army/frontend/lib/cowork-api.ts`

```typescript
/**
 * COWORK.ARMY — Frontend API Client
 * Local mode:  /cowork-api/* (proxied to port 8888)
 */

const BASE = process.env.NEXT_PUBLIC_COWORK_API_URL || "/cowork-api";

// Types
export interface CoworkAgent {
    id: string;
    name: string;
    icon: string;
    tier: string;
    color: string;
    domain: string;
    desc: string;
    skills: string[];
    rules: string[];
    workspace_dir: string;
    workspace_path: string;
    system_prompt: string;
}

export interface AgentStatus {
    agent_id: string;
    status: string;
    lines: string[];
    alive: boolean;
    pid: number;
    started_at: string;
}

export interface CoworkTask {
    id: string;
    title: string;
    description: string;
    assigned_to: string;
    priority: string;
    status: string;
    created_by: string;
    created_at: string;
    updated_at: string;
    log: string[];
}

export interface AutonomousEvent {
    timestamp: string;
    agent_id: string;
    message: string;
    type: "info" | "task_created" | "inbox_check" | "self_improve" | "warning";
}

export interface AutonomousStatus {
    running: boolean;
    tick_count: number;
    total_events: number;
    agents_tracked: number;
    last_tick: string | null;
}

export interface ServerInfo {
    name: string;
    version: string;
    mode: string;
    agents: number;
    bridge_connected: boolean;
    bridge_count: number;
    autonomous: boolean;
    autonomous_ticks: number;
}

// Fetch helper
async function coworkFetch<T>(path: string, options?: RequestInit): Promise<T> {
    const res = await fetch(`${BASE}${path}`, {
        headers: { "Content-Type": "application/json" },
        ...options,
    });
    if (!res.ok) {
        const text = await res.text();
        throw new Error(`Cowork API error ${res.status}: ${text}`);
    }
    return res.json() as Promise<T>;
}

// Agent Endpoints
export const getCoworkAgents = () => coworkFetch<CoworkAgent[]>("/agents");
export const getCoworkAgent = (id: string) => coworkFetch<CoworkAgent>(`/agents/${id}`);
export const spawnAgent = (id: string, task?: string) => {
    const params = task ? `?task=${encodeURIComponent(task)}` : "";
    return coworkFetch<AgentStatus>(`/agents/${id}/spawn${params}`, { method: "POST" });
};
export const killAgent = (id: string) =>
    coworkFetch<{ status: string; agent_id: string }>(`/agents/${id}/kill`, { method: "POST" });
export const getAgentStatuses = () => coworkFetch<Record<string, AgentStatus>>("/statuses");
export const getAgentOutput = (id: string) => coworkFetch<{ lines: string[] }>(`/agents/${id}/output`);

// Task Endpoints
export const getCoworkTasks = () => coworkFetch<CoworkTask[]>("/tasks");
export async function createCoworkTask(
    title: string, description: string, assignedTo: string, priority: string
): Promise<CoworkTask> {
    const fd = new FormData();
    fd.append("title", title);
    fd.append("description", description);
    fd.append("assigned_to", assignedTo);
    fd.append("priority", priority);
    const res = await fetch(`${BASE}/tasks`, { method: "POST", body: fd });
    if (!res.ok) throw new Error(`API error ${res.status}`);
    return res.json() as Promise<CoworkTask>;
}

// Autonomous Loop
export const startAutonomousLoop = () => coworkFetch<{ status: string }>("/autonomous/start", { method: "POST" });
export const stopAutonomousLoop = () => coworkFetch<{ status: string }>("/autonomous/stop", { method: "POST" });
export const getAutonomousStatus = () => coworkFetch<AutonomousStatus>("/autonomous/status");
export const getAutonomousEvents = (limit = 50, since = "") =>
    coworkFetch<AutonomousEvent[]>(`/autonomous/events?limit=${limit}&since=${encodeURIComponent(since)}`);

// Server Info
export const getServerInfo = () => coworkFetch<ServerInfo>("/info");
```

### ADIM 4: `components/cowork-army/CoworkOffice3D.tsx` — 3D Ofis Sahnesi

Dosya: `cowork-army/frontend/components/cowork-army/CoworkOffice3D.tsx`

Bu component su ozelliklere sahip olmali:

**Genel Yapi:**
- `@react-three/fiber` Canvas icinde tum sahne
- `@react-three/drei` yardimci araclari (OrbitControls, Text, Html, Environment, ContactShadows)
- Responsive: parent container'in %100 genisligi ve yuksekligi
- Dark tema uyumlu (koyu zemin, neon isiklar)

**3D Sahne Elemanlari:**

1. **Zemin (Floor):**
   - 30x30 birimlik koyu grid zemin
   - Hafif reflective yuzey
   - Grid cizgileri #1a1a2e renkte

2. **Agent Masalari (AgentDesk):**
   - Her agent icin bir masa (box geometry: 1.2 x 0.05 x 0.8)
   - Masa rengi agent'in kendi rengi (agent.color)
   - Masa uzerinde kucuk monitor (box 0.4 x 0.3 x 0.02) icinde agent ikon ve ismi
   - Masanin altinda agent tier badge (COMMANDER=altin, SUPERVISOR=kirmizi, DIRECTOR=mor, WORKER=gri)

3. **Agent Avatarlari:**
   - Her masanin arkasinda bir avatar (sphere + cone body)
   - Avatar rengi agent.color
   - Idle: hafif yukari-asagi bobbing animasyonu (useFrame ile sin(time) * 0.05)
   - Working: hizli rotation + particle efekt
   - Thinking: yavas pulse (scale 1.0 -> 1.1 -> 1.0)
   - Error: kirmizi flash

4. **Status Indikatoru:**
   - Her agent'in uzerinde yuvarlak LED isik
   - idle = gri, working = yesil pulse, thinking = mavi pulse, error = kirmizi, done = beyaz
   - PointLight ile gercek isik etkisi

5. **Konusma Baloncuklari (SpeechBubble):**
   - Agent'in son aktivitesini gosteren HTML overlay
   - `@react-three/drei` Html component kullan
   - Otonom dongu eventleri burada gosterilsin
   - Fade-in/fade-out animasyonu, 5 saniye sonra kaybolsun

6. **Bolge Ayirimi (4 Bolge):**
   - Masalar bolgeler halinde gruplansin:
     - SOL UST: Yonetim bolgesi (Commander, Supervisor) — altin cerceve
     - SOL ALT: Medikal & Seyahat (med-health, travel-agent) — cyan cerceve
     - ORTA: Trading Swarm (trade-engine, alpha-scout, tech-analyst, risk-sentinel, quant-lab) — mor cerceve, "TRADING SWARM" yazisi
     - SAG: Operasyon (growth-ops, web-dev, finance) — yesil cerceve
   - Her bolgenin etrafinda hafif neon glow cerceve (lineSegments)

7. **Merkez Hologram:**
   - Sahnenin ortasinda donen bir hologram kupu
   - Icerisinde COWORK.ARMY logosu ve "v4.3" yazisi
   - Wireframe + transparent material
   - Continuous rotation

8. **Kamera:**
   - Baslangic pozisyonu: [12, 10, 12], look at [0, 0, 0]
   - OrbitControls ile serbest hareket
   - minDistance: 5, maxDistance: 30
   - Scroll ile zoom

9. **Isiklandirma:**
   - Ambient light (dusuk intensity: 0.3)
   - Her bolgenin uzerinde SpotLight
   - Trading bolgesi icin ozel mor SpotLight
   - Commander masasinda altin SpotLight

**Data Baglantisi:**

- Component props: `agents: CoworkAgent[]`, `statuses: Record<string, AgentStatus>`, `events: AutonomousEvent[]`
- Her 2 saniyede API'den status ve event guncelleme (parent component'te)
- WebSocket baglantisi `ws://localhost:8888/ws/events` icin opsiyonel

**Agent Yerlesim Haritasi (POZISYONLAR):**

```
const DESK_POSITIONS: Record<string, [number, number, number]> = {
    // Yonetim (sol ust)
    "commander":     [-8, 0, -6],
    "supervisor":    [-6, 0, -6],
    // Medikal & Seyahat (sol alt)
    "med-health":    [-8, 0, -2],
    "travel-agent":  [-6, 0, -2],
    // Trading Swarm (orta)
    "trade-engine":  [0, 0, -4],   // Orchestrator — merkez
    "alpha-scout":   [-2, 0, -2],
    "tech-analyst":  [2, 0, -2],
    "risk-sentinel": [-2, 0, -6],
    "quant-lab":     [2, 0, -6],
    // Operasyon (sag)
    "growth-ops":    [6, 0, -6],
    "web-dev":       [8, 0, -6],
    "finance":       [6, 0, -4],
};
```

### ADIM 5: `app/page.tsx` — Ana Sayfa

Dosya: `cowork-army/frontend/app/page.tsx`

Bu sayfa (cowork-army kendi bagimsiz frontend'i oldugu icin ana sayfa):
- Sol panel: Agent listesi sidebar (%20 genislik)
  - Her agent: ikon + isim + status dot
  - Tiklayinca agent detay popup
- Orta: 3D Canvas (%60 genislik, tam yukseklik)
  - CoworkOffice3D component'i
- Sag panel: Event feed + kontroller (%20 genislik)
  - Otonom loop start/stop butonu
  - Son olaylarin listesi (scrollable)
  - Server info (versiyon, agent sayisi, bridge durumu)
  - "Gorev Olustur" butonu -> modal form

**Data Fetch:**
- `useEffect` ile baslangicta `getCoworkAgents()` ve `getAgentStatuses()` cagir
- 2 saniye interval ile `getAgentStatuses()` ve `getAutonomousEvents()` guncelle
- `getServerInfo()` ile server durumu al

### ADIM 6: Layout

`cowork-army/frontend/app/layout.tsx` — Bagimsiz layout, Med-UI-Tra'dan bagimsiz.

## ONEMLI NOTLAR

1. Tum component'ler TypeScript olmali
2. `"use client"` direktifi Canvas iceren sayfalarda zorunlu
3. Three.js SSR'da calismaz — dynamic import ile `ssr: false` kullan:
   ```typescript
   import dynamic from "next/dynamic";
   const CoworkOffice3D = dynamic(() => import("@/components/cowork-army/CoworkOffice3D"), { ssr: false });
   ```
4. Tailwind CSS kullan
5. COWORK.ARMY backend'i port 8888'de calisiyor, `/cowork-api/*` proxy ile erisim
6. Bu frontend Med-UI-Tra'dan **tamamen bagimsiz** calisir (port 3002)
7. Med-UI-Tra ve uAlgoTrade projeleri bu agent sistemi tarafindan **disaridan yonetilir**

## AGENT REGISTRY (12 Agent — v4.3)

| ID | Icon | Name | Tier | Color | Domain |
|---|---|---|---|---|---|
| commander | crown | Commander | COMMANDER | #fbbf24 | Genel Yonetim |
| supervisor | detective | Supervisor | SUPERVISOR | #f43f5e | Kalite Kontrol + Dosya Gateway |
| med-health | hospital | Med Health | DIRECTOR | #22d3ee | Medikal Saglik (hasta yasam dongusu) |
| travel-agent | airplane | Travel & Hospitality | DIRECTOR | #8b5cf6 | Seyahat + Konaklama |
| trade-engine | brain | PrimeOrchestrator | DIRECTOR | #a78bfa | Trading Swarm Beyni |
| alpha-scout | magnifier | AlphaScout | WORKER | #f59e0b | Sentiment Analiz |
| tech-analyst | ruler | TechnicalAnalyst | WORKER | #6366f1 | Teknik Analiz |
| risk-sentinel | shield | RiskSentinel | WORKER | #ef4444 | Risk Yonetimi (HARD VETO) |
| quant-lab | microscope | QuantLab | WORKER | #8b5cf6 | Performans Optimizasyon |
| growth-ops | rocket | Growth Ops | WORKER | #f472b6 | Pazarlama + Veri + CRM |
| finance | moneybag | Finance | WORKER | #84cc16 | Muhasebe/Butce |
| web-dev | laptop | Web Dev | WORKER | #a855f7 | Full-stack Dev |

## API ENDPOINTLERI (port 8888)

```
GET  /api/agents            -> CoworkAgent[]
GET  /api/agents/:id        -> CoworkAgent
POST /api/agents/:id/spawn  -> AgentStatus
POST /api/agents/:id/kill   -> {status, agent_id}
GET  /api/statuses           -> Record<string, AgentStatus>
GET  /api/agents/:id/output -> {lines: string[]}
GET  /api/tasks              -> CoworkTask[]
POST /api/tasks              -> CoworkTask (FormData: title, description, assigned_to, priority)
GET  /api/autonomous/status  -> AutonomousStatus
GET  /api/autonomous/events  -> AutonomousEvent[]
POST /api/autonomous/start   -> {status: string}
POST /api/autonomous/stop    -> {status: string}
GET  /api/info               -> ServerInfo
WS   /ws/events              -> Real-time status + autonomous events
```

## BEKLENEN SONUC

`npm run dev` calistiginda `http://localhost:3002/` adresinde:
- 3D ofis sahnesi gorunmeli
- 12 agent masalarda yerlesik
- Status renkleri canli guncellenmeli
- Otonom loop eventleri konusma balonlarinda gosterilmeli
- Kamera serbest hareket edebilmeli
- Sol panelde agent listesi, sag panelde event feed
- Med-UI-Tra frontend'inden (port 3000) tamamen bagimsiz calisir
