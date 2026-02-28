# cowork-army frontend

**COWORK.ARMY Agent Kontrol Paneli** — 3D gorsellestime ile AI agent yonetim arayuzu.

## Tech Stack

- **Framework:** Next.js 15.3 (App Router)
- **UI:** React 19
- **3D:** Three.js 0.172 + React Three Fiber 9 + Drei 10
- **Styling:** Tailwind CSS 4.0
- **Language:** TypeScript 5.7 (strict mode)

## Kurulum

```bash
npm install
npm run dev       # → http://localhost:3333
```

## Ortam Degiskenleri

| Degisken | Aciklama | Varsayilan |
|----------|----------|------------|
| `COWORK_API_URL` | Backend API URL'i | `http://localhost:8888` |
| `PORT` | Frontend port | `3333` |

## Dosya Yapisi

```
frontend/
├── app/
│   ├── globals.css              → Global stiller
│   ├── layout.tsx               → Root layout, metadata, ToastProvider
│   └── page.tsx                 → Ana sayfa: 3-panel layout + modals
│
├── lib/
│   └── cowork-api.ts            → Backend API client (TypeScript interfaces)
│
├── components/
│   ├── Toast.tsx                → Toast bildirim sistemi
│   └── cowork-army/
│       ├── CoworkOffice3D.tsx   → 3D ofis sahnesi (R3F Canvas)
│       ├── AgentAvatar.tsx      → Agent 3D karakter modelleri
│       ├── AgentDesk.tsx        → Agent masa bileşenleri
│       ├── CenterHologram.tsx   → Merkez hologram gorunumu
│       ├── Floor.tsx            → 3D zemin
│       ├── SpeechBubble.tsx     → Agent durum baloncuklari
│       ├── StatusLED.tsx        → Durum LED gostergeleri
│       ├── ZoneBorder.tsx       → Bolge sinirlari
│       ├── scene-constants.ts   → Masa pozisyonlari, zone tanimlari
│       │
│       ├── characters/
│       │   ├── CharacterBuilder.tsx    → Prosedural karakter olusturma
│       │   ├── character-registry.ts   → Karakter preset kayitlari
│       │   └── accessories.tsx         → Ekipman ve aksesuar tanimlari
│       │
│       ├── movement/
│       │   ├── MovementSystem.tsx      → Agent hareket sistemi
│       │   └── pathfinding.ts          → A* pathfinding algoritmasi
│       │
│       └── collaboration/
│           ├── CollaborationBeam.tsx    → Isbirligi isik huzmeleri
│           └── CollaborationDetector.ts → Yakinlik/isbirligi algilama
│
├── next.config.ts               → API proxy rewrites, Three.js transpile
├── tsconfig.json                → TypeScript strict config
├── postcss.config.mjs           → Tailwind PostCSS
└── package.json                 → Bagimliliklar ve script'ler
```

## Ozellikler

### 3D Ofis Sahnesi
- 15 base agent + dinamik agentlar 3D sahnede gorsellesiyor
- Her agentin kendi masasi ve pozisyonu var
- Zone'lar: Management, Medical, Trading Swarm, Operations, Dynamic Agents
- Agent durumlari renk kodlu LED'ler ile gosteriliyor (idle/working/thinking/coding)

### Agent Yonetimi
- Agent olusturma, duzenleme, silme modallari
- Agent spawn/kill kontrolleri
- Terminal output goruntusu
- Canli durum takibi

### Gorev Sistemi
- Gorev olusturma ve atama
- Commander ile otomatik yonlendirme
- Gorev durumu takibi

### Otonom Mod
- Otonom donguyu baslat/durdur
- Event feed ile canli takip
- Tick sayaci

### Isbirligi Gorsellestirmesi
- Agentlar arasi isbirligi beam'leri
- Yakinlik algilama ile otomatik beam olusturma
- Hareket sistemi ile masalar arasi gecis

## API Proxy

`next.config.ts` uzerinden `/api/*` istekleri backend'e yonlendirilir:

```
Frontend (:3333) /api/* → Backend (:8888) /api/*
```

## TypeScript Interfaces

```typescript
CoworkAgent    // Agent tanimi (id, name, tier, skills, vb.)
AgentStatus    // Canli durum (status, pid, output lines)
CoworkTask     // Gorev (title, assigned_to, status, log)
AutonomousEvent // Otonom dongu olaylari
AutonomousStatus // Dongu durumu (running, tick_count)
```

## Build & Deploy

```bash
npm run build     # Production build
npm run start     # Production server (PORT env var)
```

Railway uzerinde deploy edilir. `COWORK_API_URL` env var ile backend adresini alir.
