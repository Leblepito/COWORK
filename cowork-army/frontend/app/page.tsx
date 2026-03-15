"use client";
/**
 * COWORK.ARMY — Main Page (responsive: 3-panel desktop, tab-based mobile)
 */
import { useState, useEffect, useCallback } from "react";
import dynamic from "next/dynamic";
import type { CoworkAgent, AgentStatus, CoworkTask, AutonomousEvent, AutonomousStatus, ServerInfo, ApiKeyStatus, AnimationState } from "@/lib/cowork-api";
import { getCoworkAgents, getAgentStatuses, getAutonomousEvents, getAutonomousStatus,
  getServerInfo, spawnAgent, killAgent, startAutonomousLoop, stopAutonomousLoop,
  createCoworkTask, createAgent, deleteAgent,
  getApiKeyStatus, saveApiKey, setLlmProvider,
  getAnimationStates, triggerAnimation, broadcastAnimation } from "@/lib/cowork-api";
import { AGENT_DEPARTMENT, DEPT_COLORS } from "@/components/cowork-army/scene-constants";
import { useAuth } from "@/lib/auth-context";

const CoworkOffice3D = dynamic(() => import("@/components/cowork-army/CoworkOffice3D"), { ssr: false });

// Agent capability suggestions based on role/domain
const AGENT_CAPABILITIES: Record<string, string[]> = {
  "cargo": [
    "Departmanlar arasi dosya transferi",
    "Gorev paketlerini ilgili agent'a ilet",
    "Oncelikli teslimat kuyrugu yonetimi",
    "Inter-departman sync raporu olustur",
  ],
  "trade-master": [
    "Kripto piyasa analizi baslat",
    "Swarm konsensus oylama yonet",
    "Pozisyon boyutlandirma hesapla",
    "Gunluk trading raporu olustur",
  ],
  "chart-eye": [
    "BTC/ETH chart analizi yap",
    "Destek/direnc seviyeleri belirle",
    "Pattern recognition (head&shoulders, triangle...)",
    "Multi-timeframe analiz raporu",
  ],
  "risk-guard": [
    "Trade onerisi risk degerlendirmesi",
    "Drawdown analizi ve VETO karari",
    "Korelasyon kontrolu calistir",
    "Gunluk risk limiti raporu",
  ],
  "quant-brain": [
    "Strateji backtest calistir (min 1000 trade)",
    "Parametre optimizasyonu yap",
    "Walk-forward validation",
    "ML sinyal modeli egit ve raporla",
  ],
  "clinic-director": [
    "Klinik operasyon plani olustur",
    "Hasta akis koordinasyonu yap",
    "JCI uyumluluk kontrolu",
    "Tedavi planlama ve zamanla",
  ],
  "patient-care": [
    "Yeni hasta sorgu formu degerlendir",
    "Pre-op hazirlik checklist olustur",
    "Post-op 6 ay takip plani yap",
    "Cok dilli hasta iletisimi (TR/EN/RU/KZ)",
  ],
  "hotel-manager": [
    "Doluluk orani analizi ve alarm",
    "Dinamik fiyatlama optimizasyonu",
    "VIP misafir protokolu olustur",
    "Gunluk gelir raporu hazirla",
  ],
  "travel-planner": [
    "Ucus + transfer paketi olustur",
    "Medikal hasta VIP transfer organize et",
    "Tur paketi planlama ve fiyatlandirma",
    "Arac kiralama koordinasyonu",
  ],
  "concierge": [
    "Misafir talebi karsilama (5dk SLA)",
    "Restoran rezervasyon yap",
    "Aktivite ve tur onerileri sun",
    "Sikayet yonetimi ve escalation",
  ],
  "tech-lead": [
    "Kod review ve mimari karar",
    "Sprint planlama ve gorev dagitimi",
    "Deploy oncesi kontrol ve onay",
    "Teknik borc analizi yap",
  ],
  "full-stack": [
    "Next.js frontend gelistirme",
    "FastAPI backend endpoint olustur",
    "API entegrasyon ve test yaz",
    "Performans optimizasyon (CWV > 90)",
  ],
  "data-ops": [
    "SEO analiz ve iyilestirme raporu",
    "Dijital pazarlama kampanya olustur",
    "A/B test planlama ve analiz",
    "Haftalik ROI ve analytics raporu",
  ],
  "debugger": [
    "Hata event'lerini analiz et (400/500)",
    "Kok neden analizi ve duzeltme onerisi",
    "Otomatik retry ve recovery",
    "Hata raporu olustur ve logla",
  ],
};

// Generate capabilities for dynamic agents based on skills
function getAgentCapabilities(agent: CoworkAgent): string[] {
  if (AGENT_CAPABILITIES[agent.id]) return AGENT_CAPABILITIES[agent.id];
  // For dynamic agents, generate from skills
  if (agent.skills?.length) {
    return agent.skills.slice(0, 4).map(s =>
      s.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase()) + " gorevi calistir"
    );
  }
  return ["Ozel gorev atanabilir"];
}

type MobileTab = "3d" | "agents" | "events";

export default function Home() {
  const { user, logout } = useAuth();
  const [agents, setAgents] = useState<CoworkAgent[]>([]);
  const [statuses, setStatuses] = useState<Record<string, AgentStatus>>({});
  const [events, setEvents] = useState<AutonomousEvent[]>([]);
  const [autoStatus, setAutoStatus] = useState<AutonomousStatus | null>(null);
  const [info, setInfo] = useState<ServerInfo | null>(null);
  const [animStates, setAnimStates] = useState<Record<string, AnimationState>>({});
  const [selected, setSelected] = useState<string | null>(null);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [showAgentModal, setShowAgentModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [dayNightEnabled, setDayNightEnabled] = useState(true);
  const [weatherType, setWeatherType] = useState<"fireflies" | "rain" | "snow" | "energy">("fireflies");
  const [error, setError] = useState("");
  const [mobileTab, setMobileTab] = useState<MobileTab>("3d");

  // ── Data Fetching ──
  const fetchAll = useCallback(async () => {
    try {
      const [ag, st, ev, au, inf, anim] = await Promise.all([
        getCoworkAgents(), getAgentStatuses(), getAutonomousEvents(30),
        getAutonomousStatus(), getServerInfo(),
        getAnimationStates().catch(() => ({})),
      ]);
      setAgents(ag); setStatuses(st); setEvents(ev); setAutoStatus(au); setInfo(inf);
      setAnimStates(anim as Record<string, AnimationState>);
      setError("");
    } catch (e: unknown) {
      setError("Backend baglanti hatasi");
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);
  useEffect(() => {
    const i1 = setInterval(async () => {
      try {
        const [st, ev, au, anim] = await Promise.all([
          getAgentStatuses(), getAutonomousEvents(30), getAutonomousStatus(),
          getAnimationStates().catch(() => ({})),
        ]);
        setStatuses(st); setEvents(ev); setAutoStatus(au);
        setAnimStates(anim as Record<string, AnimationState>);
        setError("");
      } catch {}
    }, 2000);
    return () => clearInterval(i1);
  }, []);

  const liveCount = Object.values(statuses).filter(
    s => ["working","thinking","coding","searching"].includes(s.status)
  ).length;
  const selAgent = agents.find(a => a.id === selected);

  return (
    <div className="h-screen flex flex-col dashboard-layout">
      {/* HEADER */}
      <header className="flex items-center justify-between px-3 md:px-4 py-2 border-b border-[#1a1f30] flex-shrink-0">
        <div className="flex items-center gap-2 md:gap-3">
          <div className="w-7 h-7 md:w-8 md:h-8 rounded-lg bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-xs md:text-sm">👑</div>
          <div>
            <h1 className="text-[10px] md:text-xs font-extrabold tracking-[2px] md:tracking-[3px]">COWORK<span className="text-amber-400">.ARMY</span></h1>
            <p className="text-[6px] md:text-[8px] text-gray-500 tracking-wider hidden sm:block">v9 • {info?.agents ?? 0} AGENTS</p>
          </div>
        </div>
        <div className="flex items-center gap-2 md:gap-4 text-center">
          <Stat value={agents.length} label="AGENTS" />
          <Stat value={liveCount} label="LIVE" color="#22c55e" />
          <span className="hidden sm:block"><Stat value={autoStatus?.tick_count ?? 0} label="TICKS" color="#818cf8" /></span>
          {error && <span className="text-[7px] text-red-400 max-w-[100px] md:max-w-[200px] truncate">{error}</span>}
          {user && (
            <div className="flex items-center gap-1.5 md:gap-2 ml-1 md:ml-2 pl-1.5 md:pl-2 border-l border-[#1a1f30]">
              <div className="text-right hidden sm:block">
                <div className="text-[9px] font-bold text-amber-400">{user.avatar} {user.name}</div>
                <div className="text-[6px] text-gray-500">{user.plan.toUpperCase()} PLAN</div>
              </div>
              <button onClick={logout}
                className="text-[7px] px-2 py-1 rounded bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 font-bold">
                Cikis
              </button>
            </div>
          )}
        </div>
      </header>

      {/* MAIN CONTENT */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* LEFT SIDEBAR — Desktop only */}
        <aside className="hidden md:flex w-[200px] border-r border-[#1a1f30] flex-col flex-shrink-0">
          <AgentSidebar agents={agents} statuses={statuses} selected={selected} setSelected={setSelected}
            onNewAgent={() => setShowAgentModal(true)} onSpawnAll={() => agents.forEach(a => spawnAgent(a.id))} />
        </aside>

        {/* CENTER: 3D — Always rendered, visible based on tab on mobile */}
        <main className={`flex-1 relative ${mobileTab !== "3d" ? "hidden md:block" : ""}`}>
          <CoworkOffice3D
            agents={agents} statuses={statuses} events={events} animationStates={animStates}
            autonomousActive={autoStatus?.running ?? false} dayNightEnabled={dayNightEnabled} weatherType={weatherType}
          />
          {/* Agent detail overlay */}
          {selAgent && (
            <div className="absolute top-2 left-2 right-2 md:right-auto w-auto md:w-[260px] bg-[#0b0c14]/95 border border-[#1a1f30] rounded-lg p-3 backdrop-blur z-10 mobile-panel">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-2xl">{selAgent.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-extrabold truncate" style={{ color: selAgent.color }}>{selAgent.name}</div>
                  <div className="text-[7px] text-gray-500">{selAgent.tier} • {selAgent.domain}</div>
                </div>
                <button onClick={() => setSelected(null)} className="ml-auto text-gray-500 hover:text-white text-xs flex-shrink-0">✕</button>
              </div>
              <p className="text-[9px] text-gray-400 mb-2">{selAgent.desc}</p>
              <div className="flex flex-wrap gap-1.5 mb-2">
                <button onClick={() => spawnAgent(selAgent.id)} className="text-[8px] px-2 py-1 rounded bg-green-500/10 text-green-400 border border-green-500/30 font-bold">▶ Baslat</button>
                <button onClick={() => killAgent(selAgent.id)} className="text-[8px] px-2 py-1 rounded bg-red-500/10 text-red-400 border border-red-500/30 font-bold">⏹ Durdur</button>
                {!selAgent.is_base && (
                  <button onClick={async () => {
                    await deleteAgent(selAgent.id);
                    setSelected(null);
                    fetchAll();
                  }} className="text-[8px] px-2 py-1 rounded bg-red-500/10 text-red-400 border border-red-500/30 font-bold">🗑 Sil</button>
                )}
              </div>
              <div className="text-[7px] text-gray-500 mb-1 tracking-wider">SKILLS</div>
              <div className="flex flex-wrap gap-1 mb-2">
                {selAgent.skills?.map(s => (
                  <span key={s} className="text-[7px] px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-300">{s}</span>
                ))}
              </div>
              <div className="text-[7px] text-gray-500 mb-1 tracking-wider">YAPABILECEGI GOREVLER</div>
              <div className="space-y-0.5 mb-2">
                {getAgentCapabilities(selAgent).map((cap, i) => (
                  <div key={i} className="flex items-start gap-1.5">
                    <span className="text-[7px] text-amber-500 mt-[1px]">▸</span>
                    <span className="text-[8px] text-gray-300">{cap}</span>
                  </div>
                ))}
              </div>
              {statuses[selAgent.id]?.lines?.length > 0 && (
                <div className="bg-[#09090f] rounded p-2 max-h-[120px] overflow-y-auto mt-2">
                  {statuses[selAgent.id].lines.slice(-10).map((l, i) => (
                    <div key={i} className="text-[8px] text-gray-400 whitespace-pre-wrap">{l}</div>
                  ))}
                </div>
              )}
            </div>
          )}
          {/* FAB */}
          <button onClick={() => setShowTaskModal(true)}
            className="absolute bottom-16 md:bottom-4 right-4 w-12 h-12 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-lg shadow-lg hover:scale-110 transition-transform z-10">
            📋
          </button>
        </main>

        {/* RIGHT PANEL — Desktop only */}
        <aside className="hidden md:flex w-[200px] border-l border-[#1a1f30] flex-col flex-shrink-0">
          <EventPanel events={events} autoStatus={autoStatus} info={info}
            dayNightEnabled={dayNightEnabled} setDayNightEnabled={setDayNightEnabled}
            weatherType={weatherType} setWeatherType={setWeatherType}
            onToggleAuto={async () => {
              if (autoStatus?.running) await stopAutonomousLoop();
              else await startAutonomousLoop();
              setAutoStatus(await getAutonomousStatus());
            }}
            onShowSettings={() => setShowSettingsModal(true)} />
        </aside>

        {/* MOBILE: Agents Tab */}
        {mobileTab === "agents" && (
          <div className="md:hidden absolute inset-0 bg-[#060710] z-20 flex flex-col mobile-panel">
            <AgentSidebar agents={agents} statuses={statuses} selected={selected}
              setSelected={(id) => { setSelected(id); setMobileTab("3d"); }}
              onNewAgent={() => setShowAgentModal(true)}
              onSpawnAll={() => agents.forEach(a => spawnAgent(a.id))} />
          </div>
        )}

        {/* MOBILE: Events Tab */}
        {mobileTab === "events" && (
          <div className="md:hidden absolute inset-0 bg-[#060710] z-20 flex flex-col mobile-panel">
            <EventPanel events={events} autoStatus={autoStatus} info={info}
              dayNightEnabled={dayNightEnabled} setDayNightEnabled={setDayNightEnabled}
              weatherType={weatherType} setWeatherType={setWeatherType}
              onToggleAuto={async () => {
                if (autoStatus?.running) await stopAutonomousLoop();
                else await startAutonomousLoop();
                setAutoStatus(await getAutonomousStatus());
              }}
              onShowSettings={() => setShowSettingsModal(true)} />
          </div>
        )}
      </div>

      {/* MOBILE BOTTOM NAV */}
      <nav className="md:hidden flex items-center justify-around border-t border-[#1a1f30] bg-[#0b0c14] flex-shrink-0 mobile-bottom-nav">
        {([
          { id: "agents" as MobileTab, icon: "🤖", label: "Agents", count: agents.length },
          { id: "3d" as MobileTab, icon: "🏢", label: "3D Ofis" },
          { id: "events" as MobileTab, icon: "📡", label: "Events", count: events.length },
        ]).map(tab => (
          <button key={tab.id} onClick={() => setMobileTab(tab.id)}
            className={`flex-1 flex flex-col items-center py-2.5 gap-0.5 transition-all ${
              mobileTab === tab.id ? "text-amber-400" : "text-gray-500"
            }`}>
            <span className="text-lg">{tab.icon}</span>
            <span className="text-[7px] font-bold tracking-wider">{tab.label}</span>
            {tab.count !== undefined && (
              <span className={`text-[6px] px-1.5 py-0.5 rounded-full ${
                mobileTab === tab.id ? "bg-amber-500/20 text-amber-400" : "bg-gray-500/10 text-gray-500"
              }`}>{tab.count}</span>
            )}
          </button>
        ))}
      </nav>

      {/* MODALS */}
      {showTaskModal && <TaskModal agents={agents} onClose={() => setShowTaskModal(false)} />}
      {showAgentModal && <AgentModal onClose={() => { setShowAgentModal(false); fetchAll(); }} />}
      {showSettingsModal && <SettingsModal onClose={() => setShowSettingsModal(false)} />}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// Extracted components for reuse between desktop and mobile
// ═══════════════════════════════════════════════════════════

function AgentSidebar({ agents, statuses, selected, setSelected, onNewAgent, onSpawnAll }: {
  agents: CoworkAgent[]; statuses: Record<string, AgentStatus>;
  selected: string | null; setSelected: (id: string) => void;
  onNewAgent: () => void; onSpawnAll: () => void;
}) {
  return (
    <>
      <div className="px-3 py-2 text-[7px] text-gray-500 tracking-[2px] border-b border-[#1a1f3030] flex justify-between items-center flex-shrink-0">
        <span>AGENTS ({agents.length})</span>
        <div className="flex gap-1">
          <button onClick={onNewAgent}
            className="text-[7px] md:text-[6px] px-2 py-1 md:py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/30 hover:bg-amber-500/20 font-bold">
            + Yeni
          </button>
          <button onClick={onSpawnAll}
            className="text-[7px] md:text-[6px] px-2 py-1 md:py-0.5 rounded bg-green-500/10 text-green-400 border border-green-500/30 hover:bg-green-500/20 font-bold">
            ▶ ALL
          </button>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-1 space-y-0.5">
        {(["cargo", "trade", "medical", "hotel", "software"] as const).map(dept => {
          const deptAgents = agents.filter(a => AGENT_DEPARTMENT[a.id] === dept);
          if (deptAgents.length === 0) return null;
          const deptLabel = dept === "cargo" ? "📦 CARGO" : dept === "trade" ? "📊 TRADE" : dept === "medical" ? "🏥 MEDICAL" : dept === "hotel" ? "🏨 HOTEL" : "💻 SOFTWARE";
          return (
            <div key={dept}>
              <div className="px-2 py-1 text-[7px] md:text-[6px] tracking-[2px] font-bold" style={{ color: DEPT_COLORS[dept] }}>
                {deptLabel}
              </div>
              {deptAgents.map(a => <AgentRow key={a.id} agent={a} status={statuses[a.id]} selected={selected === a.id} onClick={() => setSelected(a.id)} />)}
            </div>
          );
        })}
        {agents.filter(a => !AGENT_DEPARTMENT[a.id]).length > 0 && (
          <div>
            <div className="px-2 py-1 text-[7px] md:text-[6px] tracking-[2px] font-bold text-gray-500">DYNAMIC</div>
            {agents.filter(a => !AGENT_DEPARTMENT[a.id]).map(a =>
              <AgentRow key={a.id} agent={a} status={statuses[a.id]} selected={selected === a.id} onClick={() => setSelected(a.id)} />
            )}
          </div>
        )}
      </div>
    </>
  );
}

function AgentRow({ agent: a, status, selected, onClick }: {
  agent: CoworkAgent; status?: AgentStatus; selected: boolean; onClick: () => void;
}) {
  const st = status?.status || "idle";
  const isActive = ["working","thinking","coding","searching","delivering"].includes(st);
  return (
    <button onClick={onClick}
      className={`w-full flex items-center gap-2 px-2 py-2 md:py-1.5 rounded text-left transition-all text-[10px] md:text-[9px]
        ${selected ? "bg-indigo-500/10 border border-indigo-500/20" : "border border-transparent hover:bg-white/[0.02]"}
        ${isActive ? "border-l-2 !border-l-green-500" : ""}`}>
      <span className="text-base md:text-sm flex-shrink-0">{a.icon}</span>
      <div className="flex-1 min-w-0">
        <div className="font-bold truncate" style={{ color: a.color }}>{a.name}</div>
        <div className="text-[7px] md:text-[6px] text-gray-500 tracking-wider">{a.tier}</div>
      </div>
      <div className={`w-2 h-2 md:w-1.5 md:h-1.5 rounded-full flex-shrink-0 ${isActive ? "bg-green-500 pulse-dot" : st === "error" ? "bg-red-500" : "bg-gray-600"}`} />
    </button>
  );
}

function EventPanel({ events, autoStatus, info, dayNightEnabled, setDayNightEnabled,
  weatherType, setWeatherType, onToggleAuto, onShowSettings }: {
  events: AutonomousEvent[]; autoStatus: AutonomousStatus | null; info: ServerInfo | null;
  dayNightEnabled: boolean; setDayNightEnabled: (v: boolean) => void;
  weatherType: string; setWeatherType: (v: "fireflies" | "rain" | "snow" | "energy") => void;
  onToggleAuto: () => void; onShowSettings: () => void;
}) {
  return (
    <>
      <div className="px-3 py-2 text-[7px] text-gray-500 tracking-[2px] border-b border-[#1a1f3030] flex justify-between items-center flex-shrink-0">
        <span>EVENT FEED</span>
        <button onClick={onToggleAuto}
          className={`text-[7px] md:text-[6px] px-2 py-1 md:py-0.5 rounded font-bold border ${
            autoStatus?.running
              ? "bg-green-500/10 text-green-400 border-green-500/30"
              : "bg-gray-500/10 text-gray-400 border-gray-500/30"
          }`}>
          {autoStatus?.running ? "▶ AUTO" : "⏸ AUTO"}
        </button>
      </div>
      {/* Server info */}
      <div className="px-3 py-2 border-b border-[#1a1f3030] space-y-1 flex-shrink-0">
        <div className="flex justify-between items-center">
          <div className="text-[7px] text-gray-500">SERVER</div>
          <button onClick={onShowSettings}
            className="text-[7px] md:text-[6px] px-2 py-1 md:py-0.5 rounded bg-gray-500/10 text-gray-400 border border-gray-500/30 hover:bg-gray-500/20 font-bold">
            Settings
          </button>
        </div>
        <div className="text-[8px]">{info?.name} v{info?.version}</div>
        <div className="text-[8px] text-gray-400">Agents: {info?.agents} | Ticks: {autoStatus?.tick_count}</div>
      </div>
      {/* Animation Controls */}
      <div className="px-3 py-2 border-b border-[#1a1f3030] space-y-1.5 flex-shrink-0">
        <div className="text-[7px] text-gray-500 tracking-[2px]">ANIMATIONS</div>
        <div className="flex gap-1 flex-wrap">
          <button onClick={() => setDayNightEnabled(!dayNightEnabled)}
            className={`text-[7px] md:text-[6px] px-2 py-1 md:py-0.5 rounded font-bold border ${
              dayNightEnabled ? "bg-amber-500/10 text-amber-400 border-amber-500/30" : "bg-gray-500/10 text-gray-400 border-gray-500/30"
            }`}>
            {dayNightEnabled ? "☀ D/N ON" : "☀ D/N OFF"}
          </button>
          <select value={weatherType} onChange={e => setWeatherType(e.target.value as "fireflies" | "rain" | "snow" | "energy")}
            className="text-[7px] md:text-[6px] px-1 py-1 md:py-0.5 rounded bg-[#0a0b12] text-gray-400 border border-gray-500/30">
            <option value="fireflies">Fireflies</option>
            <option value="rain">Rain</option>
            <option value="snow">Snow</option>
          </select>
        </div>
        <div className="flex gap-1 flex-wrap">
          <button onClick={() => broadcastAnimation("celebrate").catch(() => {})}
            className="text-[7px] md:text-[6px] px-2 py-1 md:py-0.5 rounded bg-yellow-500/10 text-yellow-400 border border-yellow-500/30 font-bold">
            Celebrate
          </button>
          <button onClick={() => broadcastAnimation("alert").catch(() => {})}
            className="text-[7px] md:text-[6px] px-2 py-1 md:py-0.5 rounded bg-red-500/10 text-red-400 border border-red-500/30 font-bold">
            Alert
          </button>
          <button onClick={() => broadcastAnimation("power_up").catch(() => {})}
            className="text-[7px] md:text-[6px] px-2 py-1 md:py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 font-bold">
            Power Up
          </button>
        </div>
      </div>
      {/* Credit error warning */}
      {autoStatus?.credit_error && (
        <div className="mx-2 mt-2 p-2 rounded bg-red-500/10 border border-red-500/30">
          <div className="text-[8px] font-bold text-red-400 mb-1">⚠ API KREDI HATASI</div>
          <div className="text-[7px] text-red-300/80">Anthropic API krediniz yetersiz. Agent spawn duraklatildi.</div>
          <div className="text-[7px] text-gray-400 mt-1">Settings'den yeni API key girin veya kredi yukleyin.</div>
        </div>
      )}
      {/* Events */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {events.length === 0 && <div className="text-center text-[8px] text-gray-600 py-8">Henuz event yok</div>}
        {events.map((ev, i) => (
          <div key={i} className={`text-[8px] p-1.5 rounded border-l-2 bg-white/[0.01] ${
            ev.type === "task_created" ? "border-l-green-500" :
            ev.type === "warning" ? "border-l-red-500" :
            ev.type === "inbox_check" ? "border-l-amber-500" : "border-l-indigo-500"
          }`}>
            <div className="text-[6px] text-gray-500">{ev.timestamp?.split("T")[1]?.split(".")[0]} • {ev.agent_id}</div>
            <div className="text-gray-400 truncate">{ev.message}</div>
          </div>
        ))}
      </div>
    </>
  );
}

function Stat({ value, label, color }: { value: number | string; label: string; color?: string }) {
  return (
    <div className="text-center">
      <div className="text-xs md:text-sm font-extrabold" style={{ color }}>{value}</div>
      <div className="text-[5px] text-gray-500 tracking-[2px] uppercase">{label}</div>
    </div>
  );
}

function TaskModal({ agents, onClose }: { agents: CoworkAgent[]; onClose: () => void }) {
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [agent, setAgent] = useState("");
  const [priority, setPriority] = useState("normal");

  const submit = async () => {
    if (!title) return;
    await createCoworkTask(title, desc, agent, priority);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-end md:items-center justify-center" onClick={onClose}>
      <div className="bg-[#0f1019] border border-[#fbbf2440] rounded-t-xl md:rounded-xl p-5 md:p-6 w-full md:w-[420px] max-h-[80vh] overflow-y-auto slide-up md:animate-none" onClick={e => e.stopPropagation()}>
        <h2 className="text-sm font-bold text-amber-400 mb-4">📋 Gorev Olustur</h2>
        <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Gorev basligi"
          className="w-full bg-[#0a0b12] border border-[#1e293b] text-white font-mono text-xs md:text-[10px] p-3 md:p-2 rounded mb-2" />
        <textarea value={desc} onChange={e => setDesc(e.target.value)} placeholder="Aciklama (opsiyonel)"
          className="w-full bg-[#0a0b12] border border-[#1e293b] text-white font-mono text-xs md:text-[10px] p-3 md:p-2 rounded mb-2 h-20 resize-none" />
        <div className="flex flex-col md:flex-row gap-2 mb-3">
          <select value={agent} onChange={e => setAgent(e.target.value)}
            className="flex-1 bg-[#0a0b12] border border-[#1e293b] text-white font-mono text-xs md:text-[10px] p-3 md:p-2 rounded">
            <option value="">Otomatik (Commander)</option>
            {agents.map(a => <option key={a.id} value={a.id}>{a.icon} {a.name}</option>)}
          </select>
          <select value={priority} onChange={e => setPriority(e.target.value)}
            className="md:w-24 bg-[#0a0b12] border border-[#1e293b] text-white font-mono text-xs md:text-[10px] p-3 md:p-2 rounded">
            <option>normal</option><option>high</option><option>urgent</option>
          </select>
        </div>
        <div className="flex gap-2">
          <button onClick={submit} className="flex-1 md:flex-none px-4 py-2.5 md:py-2 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/30 text-[11px] md:text-[10px] font-bold">
            📋 Olustur
          </button>
          <button onClick={onClose} className="flex-1 md:flex-none px-4 py-2.5 md:py-2 rounded bg-gray-500/10 text-gray-400 border border-gray-500/30 text-[11px] md:text-[10px] font-bold">
            Iptal
          </button>
        </div>
      </div>
    </div>
  );
}

function SettingsModal({ onClose }: { onClose: () => void }) {
  const [keyStatus, setKeyStatus] = useState<ApiKeyStatus | null>(null);
  const [activeProvider, setActiveProvider] = useState("anthropic");
  const [anthropicKey, setAnthropicKey] = useState("");
  const [geminiKey, setGeminiKey] = useState("");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    getApiKeyStatus().then(s => {
      setKeyStatus(s);
      setActiveProvider(s.active_provider || "anthropic");
    }).catch(() => {});
  }, []);

  const handleProviderChange = async (p: string) => {
    setActiveProvider(p);
    try {
      await setLlmProvider(p);
      setMsg(`Provider: ${p}`);
      const s = await getApiKeyStatus();
      setKeyStatus(s);
    } catch { setMsg("Provider degistirilemedi"); }
  };

  const handleSaveKey = async (provider: string, key: string) => {
    if (!key) return;
    setSaving(true);
    try {
      await saveApiKey(key, provider);
      setMsg(`${provider} key kaydedildi`);
      const s = await getApiKeyStatus();
      setKeyStatus(s);
      if (provider === "anthropic") setAnthropicKey("");
      else setGeminiKey("");
    } catch { setMsg("Key kaydedilemedi"); }
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-end md:items-center justify-center" onClick={onClose}>
      <div className="bg-[#0f1019] border border-[#fbbf2440] rounded-t-xl md:rounded-xl p-5 md:p-6 w-full md:w-[420px] max-h-[80vh] overflow-y-auto slide-up md:animate-none" onClick={e => e.stopPropagation()}>
        <h2 className="text-sm font-bold text-amber-400 mb-4">Settings</h2>

        <div className="text-[8px] text-gray-500 mb-1 tracking-wider">LLM PROVIDER</div>
        <div className="flex gap-2 mb-4">
          {(["anthropic", "gemini"] as const).map(p => (
            <button key={p} onClick={() => handleProviderChange(p)}
              className={`flex-1 text-[11px] md:text-[10px] py-2.5 md:py-2 rounded font-bold border transition-all ${
                activeProvider === p
                  ? "bg-amber-500/10 text-amber-400 border-amber-500/30"
                  : "bg-gray-500/5 text-gray-500 border-gray-500/20 hover:bg-gray-500/10"
              }`}>
              {p === "anthropic" ? "Claude" : "Gemini"}
            </button>
          ))}
        </div>

        <div className="text-[8px] text-gray-500 mb-1 tracking-wider">
          ANTHROPIC API KEY
          {keyStatus?.anthropic?.set && <span className="text-green-400 ml-2">({keyStatus.anthropic.preview})</span>}
        </div>
        <div className="flex gap-2 mb-3">
          <input value={anthropicKey} onChange={e => setAnthropicKey(e.target.value)}
            type="password" placeholder="sk-ant-..."
            className="flex-1 bg-[#0a0b12] border border-[#1e293b] text-white font-mono text-xs md:text-[10px] p-3 md:p-2 rounded" />
          <button onClick={() => handleSaveKey("anthropic", anthropicKey)} disabled={saving || !anthropicKey}
            className="text-[10px] md:text-[9px] px-3 py-1 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/30 font-bold disabled:opacity-30">
            Kaydet
          </button>
        </div>

        <div className="text-[8px] text-gray-500 mb-1 tracking-wider">
          GOOGLE API KEY
          {keyStatus?.gemini?.set && <span className="text-green-400 ml-2">({keyStatus.gemini.preview})</span>}
        </div>
        <div className="flex gap-2 mb-3">
          <input value={geminiKey} onChange={e => setGeminiKey(e.target.value)}
            type="password" placeholder="AIza..."
            className="flex-1 bg-[#0a0b12] border border-[#1e293b] text-white font-mono text-xs md:text-[10px] p-3 md:p-2 rounded" />
          <button onClick={() => handleSaveKey("gemini", geminiKey)} disabled={saving || !geminiKey}
            className="text-[10px] md:text-[9px] px-3 py-1 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/30 font-bold disabled:opacity-30">
            Kaydet
          </button>
        </div>

        {msg && <div className="text-[9px] text-amber-400 mb-3">{msg}</div>}

        <button onClick={onClose} className="w-full md:w-auto px-4 py-2.5 md:py-2 rounded bg-gray-500/10 text-gray-400 border border-gray-500/30 text-[11px] md:text-[10px] font-bold">
          Kapat
        </button>
      </div>
    </div>
  );
}

function AgentModal({ onClose }: { onClose: () => void }) {
  const [agentId, setAgentId] = useState("");
  const [name, setName] = useState("");
  const [icon, setIcon] = useState("");
  const [domain, setDomain] = useState("");
  const [desc, setDesc] = useState("");
  const [skills, setSkills] = useState("");
  const [systemPrompt, setSystemPrompt] = useState("");

  const submit = async () => {
    if (!agentId || !name) return;
    await createAgent({
      id: agentId, name, icon: icon || "\u{1F916}", tier: "WORKER", color: "#818cf8",
      domain, desc, skills: skills.split(",").map(s => s.trim()).filter(Boolean),
      rules: [], triggers: [], workspace_dir: agentId, system_prompt: systemPrompt,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-end md:items-center justify-center" onClick={onClose}>
      <div className="bg-[#0f1019] border border-[#fbbf2440] rounded-t-xl md:rounded-xl p-5 md:p-6 w-full md:w-[420px] max-h-[85vh] overflow-y-auto slide-up md:animate-none" onClick={e => e.stopPropagation()}>
        <h2 className="text-sm font-bold text-amber-400 mb-4">+ Yeni Agent</h2>
        <div className="flex gap-2 mb-2">
          <input value={agentId} onChange={e => setAgentId(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
            placeholder="agent-id (orn: seo-expert)"
            className="flex-1 bg-[#0a0b12] border border-[#1e293b] text-white font-mono text-xs md:text-[10px] p-3 md:p-2 rounded" />
          <input value={icon} onChange={e => setIcon(e.target.value)} placeholder="Icon"
            className="w-14 bg-[#0a0b12] border border-[#1e293b] text-white text-center text-sm p-3 md:p-2 rounded" />
        </div>
        <input value={name} onChange={e => setName(e.target.value)} placeholder="Agent adi"
          className="w-full bg-[#0a0b12] border border-[#1e293b] text-white font-mono text-xs md:text-[10px] p-3 md:p-2 rounded mb-2" />
        <input value={domain} onChange={e => setDomain(e.target.value)} placeholder="Domain (orn: SEO & Content)"
          className="w-full bg-[#0a0b12] border border-[#1e293b] text-white font-mono text-xs md:text-[10px] p-3 md:p-2 rounded mb-2" />
        <textarea value={desc} onChange={e => setDesc(e.target.value)} placeholder="Aciklama"
          className="w-full bg-[#0a0b12] border border-[#1e293b] text-white font-mono text-xs md:text-[10px] p-3 md:p-2 rounded mb-2 h-16 resize-none" />
        <input value={skills} onChange={e => setSkills(e.target.value)} placeholder="Yetenekler (virgul ile ayirin)"
          className="w-full bg-[#0a0b12] border border-[#1e293b] text-white font-mono text-xs md:text-[10px] p-3 md:p-2 rounded mb-2" />
        <textarea value={systemPrompt} onChange={e => setSystemPrompt(e.target.value)} placeholder="System prompt (opsiyonel)"
          className="w-full bg-[#0a0b12] border border-[#1e293b] text-white font-mono text-xs md:text-[10px] p-3 md:p-2 rounded mb-3 h-16 resize-none" />
        <div className="flex gap-2">
          <button onClick={submit} disabled={!agentId || !name}
            className="flex-1 md:flex-none px-4 py-2.5 md:py-2 rounded bg-amber-500/10 text-amber-400 border border-amber-500/30 text-[11px] md:text-[10px] font-bold disabled:opacity-30">
            + Olustur
          </button>
          <button onClick={onClose}
            className="flex-1 md:flex-none px-4 py-2.5 md:py-2 rounded bg-gray-500/10 text-gray-400 border border-gray-500/30 text-[11px] md:text-[10px] font-bold">
            Iptal
          </button>
        </div>
      </div>
    </div>
  );
}
