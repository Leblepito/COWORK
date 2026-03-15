"use client";
/**
 * COWORK.ARMY — Main Page (thin shell)
 * Left: AgentSidebar | Center: 3D Canvas | Right: EventPanel
 */
import { useState, useEffect, useCallback, useRef } from "react";
import { useSSE, SSEEvent } from "../hooks/useSSE";
import dynamic from "next/dynamic";
import type { CoworkAgent, AgentStatus, AutonomousEvent, AutonomousStatus, ServerInfo, BudgetStatus } from "@/lib/cowork-api";
import { getCoworkAgents, getAgentStatuses, getAutonomousEvents, getAutonomousStatus,
  getServerInfo, spawnAgent, killAgent, deleteAgent, getUsageBudget } from "@/lib/cowork-api";

import AgentSidebar from "@/components/cowork-army/AgentSidebar";
import EventPanel from "@/components/cowork-army/EventPanel";
import TaskModal from "@/components/cowork-army/TaskModal";
import AgentModal from "@/components/cowork-army/AgentModal";
import SettingsModal from "@/components/cowork-army/SettingsModal";
import ErrorBoundary from "@/components/cowork-army/ErrorBoundary";
import CostDashboard from "@/components/cowork-army/CostDashboard";
import SystemHealth from "@/components/cowork-army/SystemHealth";
import TaskListView from "@/components/cowork-army/TaskListView";
import AgentDetailSidebar from "@/components/cowork-army/AgentDetailSidebar";

const CoworkOffice3D = dynamic(
  () => import("@/components/cowork-army/CoworkOffice3D"),
  {
    ssr: false,
    loading: () => (
      <div className="flex-1 flex items-center justify-center bg-[#060710]">
        <div className="text-slate-500 text-sm animate-pulse">Loading 3D Scene...</div>
      </div>
    ),
  }
);

function Stat({ value, label, color }: { value: number | string; label: string; color?: string }) {
  return (
    <div className="text-center">
      <div className="text-sm font-extrabold" style={{ color }}>{value}</div>
      <div className="text-[5px] text-gray-500 tracking-[2px] uppercase">{label}</div>
    </div>
  );
}

export default function Home() {
  const [agents, setAgents] = useState<CoworkAgent[]>([]);
  const [statuses, setStatuses] = useState<Record<string, AgentStatus>>({});
  const [events, setEvents] = useState<AutonomousEvent[]>([]);
  const [autoStatus, setAutoStatus] = useState<AutonomousStatus | null>(null);
  const [info, setInfo] = useState<ServerInfo | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [showAgentModal, setShowAgentModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showTaskList, setShowTaskList] = useState(false);
  const [budget, setBudget] = useState<BudgetStatus | null>(null);
  const [error, setError] = useState("");
  // Task 11: initial loading state for skeletons
  const [loading, setLoading] = useState(true);
  // Task 10: backoff tracking
  const [pollInterval, setPollInterval] = useState(2000);
  const failCountRef = useRef(0);

  // ── Data Fetching (Task 10: exponential backoff) ──
  const fetchAll = useCallback(async () => {
    try {
      const [ag, st, ev, au, inf, bg] = await Promise.all([
        getCoworkAgents(), getAgentStatuses(), getAutonomousEvents(30),
        getAutonomousStatus(), getServerInfo(), getUsageBudget().catch(() => null),
      ]);
      setAgents(ag); setStatuses(st); setEvents(ev); setAutoStatus(au); setInfo(inf);
      if (bg) setBudget(bg);
      setError("");
      // Task 11: clear loading after first success
      setLoading(false);
      // Task 10: reset backoff on success
      if (failCountRef.current > 0) {
        failCountRef.current = 0;
        setPollInterval(2000);
      }
    } catch {
      failCountRef.current += 1;
      if (failCountRef.current >= 3) {
        setError("Connection lost — retrying with backoff...");
        setPollInterval(Math.min(2000 * Math.pow(2, failCountRef.current - 3), 30000));
      } else {
        setError("Backend bağlantı hatası — python server.py çalışıyor mu?");
      }
    }
  }, []);

  // ── SSE real-time updates (alongside polling fallback) ──
  const sseUrl = `${process.env.NEXT_PUBLIC_COWORK_API_URL || "/cowork-api"}/events/stream`

  const handleSSEEvent = useCallback((event: SSEEvent) => {
    if (event.event === "agent_event" || event.event === "agent_status" || event.event === "task_update") {
      fetchAll()
    }
    if (event.event === "budget_warning") {
      getUsageBudget().then(setBudget).catch(() => {})
    }
  }, [fetchAll])

  useSSE({ url: sseUrl, onEvent: handleSSEEvent, enabled: true })

  // Task 10: dynamic interval driven by pollInterval state
  useEffect(() => {
    fetchAll();
    const id = setInterval(fetchAll, pollInterval);
    return () => clearInterval(id);
  }, [fetchAll, pollInterval]);

  // Task 9: stable useCallback handlers for all prop callbacks
  const handleSelectAgent = useCallback((id: string | null) => setSelected(id), []);
  const handleCloseTask = useCallback(() => setShowTaskModal(false), []);
  const handleCloseAgent = useCallback(() => setShowAgentModal(false), []);
  const handleCloseSettings = useCallback(() => setShowSettingsModal(false), []);
  const handleOpenTask = useCallback(() => setShowTaskModal(true), []);
  const handleOpenAgent = useCallback(() => setShowAgentModal(true), []);
  const handleOpenSettings = useCallback(() => setShowSettingsModal(true), []);
  const handleOpenTaskList = useCallback(() => setShowTaskList(true), []);
  const handleCloseTaskList = useCallback(() => setShowTaskList(false), []);
  const handleCloseDetail = useCallback(() => setSelected(null), []);

  const liveCount = Object.values(statuses).filter(
    s => ["working", "thinking", "coding", "searching"].includes(s.status)
  ).length;
  const selAgent = agents.find(a => a.id === selected);

  return (
    <div className="h-screen flex flex-col">
      {/* HEADER */}
      <header className="flex items-center justify-between px-4 py-2 border-b border-[#1a1f30] flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-sm">👑</div>
          <div>
            <h1 className="text-xs font-extrabold tracking-[3px]">COWORK<span className="text-amber-400">.ARMY</span></h1>
            <p className="text-[8px] text-gray-500 tracking-wider">v7 • {info?.agents ?? 0} AGENTS • 4 DEPTS • AUTONOMOUS</p>
          </div>
        </div>
        <div className="flex items-center gap-4 text-center">
          <Stat value={agents.length} label="AGENTS" />
          <Stat value={liveCount} label="LIVE" color="#22c55e" />
          <Stat value={autoStatus?.tick_count ?? 0} label="TICKS" color="#818cf8" />
          {budget && (
            <div className="flex flex-col items-center gap-0.5">
              <div className="w-24 h-1.5 bg-[#1e293b] rounded-full overflow-hidden">
                <div className={`h-full rounded-full transition-all ${budget.exceeded ? "bg-red-500" : budget.warning ? "bg-amber-400" : "bg-cyan-400"}`}
                  style={{ width: `${Math.min(budget.percent, 100)}%` }} />
              </div>
              <span className={`text-[7px] ${budget.exceeded ? "text-red-400" : budget.warning ? "text-amber-400" : "text-slate-500"}`}>
                ${budget.total.toFixed(2)} / ${budget.limit.toFixed(2)}
              </span>
            </div>
          )}
          <button onClick={handleOpenTaskList} className="text-[9px] px-2 py-1 rounded bg-[#1e293b] text-slate-300 hover:text-white hover:bg-[#334155] transition-colors">
            Tasks
          </button>
          {error && <span className="text-[8px] text-red-400 max-w-[200px] truncate">{error}</span>}
        </div>
      </header>

      {/* MAIN */}
      <div className="flex-1 flex overflow-hidden">
        {/* Task 9+11: stable callbacks + loading skeleton prop */}
        <AgentSidebar
          agents={agents}
          statuses={statuses}
          selected={selected}
          onSelect={handleSelectAgent}
          onNewAgent={handleOpenAgent}
          onRefresh={fetchAll}
          loading={loading}
        />

        {/* CENTER: 3D (Task 12: Suspense fallback verified in dynamic import above) */}
        <main className="flex-1 relative">
          <ErrorBoundary>
            <CoworkOffice3D agents={agents} statuses={statuses} events={events} />
          </ErrorBoundary>

          {/* Agent detail overlay */}
          {selAgent && (
            <div className="absolute top-2 left-2 w-[260px] bg-[#0b0c14]/95 border border-[#1a1f30] rounded-lg p-3 backdrop-blur z-10">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-2xl">{selAgent.icon}</span>
                <div>
                  <div className="text-sm font-extrabold" style={{ color: selAgent.color }}>{selAgent.name}</div>
                  <div className="text-[7px] text-gray-500">{selAgent.tier} • {selAgent.domain}</div>
                </div>
                <button onClick={() => setSelected(null)} className="ml-auto text-gray-500 hover:text-white text-xs">✕</button>
              </div>
              <p className="text-[9px] text-gray-400 mb-2">{selAgent.desc}</p>
              <div className="flex gap-1.5 mb-2">
                <button onClick={() => spawnAgent(selAgent.id)} className="text-[8px] px-2 py-1 rounded bg-green-500/10 text-green-400 border border-green-500/30 font-bold">▶ Baslat</button>
                <button onClick={() => killAgent(selAgent.id)} className="text-[8px] px-2 py-1 rounded bg-red-500/10 text-red-400 border border-red-500/30 font-bold">⏹ Durdur</button>
                {!selAgent.is_base && (
                  <button onClick={async () => { await deleteAgent(selAgent.id); setSelected(null); fetchAll(); }}
                    className="text-[8px] px-2 py-1 rounded bg-red-500/10 text-red-400 border border-red-500/30 font-bold">🗑 Sil</button>
                )}
              </div>
              <div className="text-[7px] text-gray-500 mb-1 tracking-wider">SKILLS</div>
              <div className="flex flex-wrap gap-1 mb-2">
                {selAgent.skills?.map(s => (
                  <span key={s} className="text-[7px] px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-300">{s}</span>
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
          <button
            onClick={handleOpenTask}
            className="absolute bottom-4 right-4 w-12 h-12 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-lg shadow-lg hover:scale-110 transition-transform z-10"
          >
            📋
          </button>
        </main>

        {/* Right column: AgentDetailSidebar when selected, else EventPanel + widgets */}
        {selAgent ? (
          <AgentDetailSidebar agent={selAgent} status={statuses[selAgent.id] || null} onClose={handleCloseDetail} />
        ) : (
          <div className="flex flex-col w-[200px] border-l border-[#1a1f30] flex-shrink-0 overflow-hidden">
            <EventPanel
              events={events}
              autoStatus={autoStatus}
              info={info}
              onRefresh={fetchAll}
              onOpenSettings={handleOpenSettings}
              loading={loading}
            />
            <div className="flex flex-col gap-3 p-3 border-t border-[#1e293b]">
              <SystemHealth statuses={statuses} />
              <CostDashboard />
            </div>
          </div>
        )}
      </div>

      {showTaskModal && <TaskModal agents={agents} onClose={handleCloseTask} onCreated={fetchAll} />}
      {showAgentModal && <AgentModal onClose={handleCloseAgent} onCreated={fetchAll} />}
      {showSettingsModal && <SettingsModal onClose={handleCloseSettings} />}
      {showTaskList && <TaskListView agents={agents} onClose={handleCloseTaskList} />}
    </div>
  );
}
