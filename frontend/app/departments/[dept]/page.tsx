"use client";
/**
 * COWORK.ARMY v7.0 — Department Detail Page
 * Full 3D scene + agent sidebar + event feed
 */
import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import dynamic from "next/dynamic";
import type {
  Department, CoworkAgent, AgentStatus, AutonomousEvent,
  AutonomousStatus,
} from "@/lib/cowork-api";
import {
  getDepartment, getCoworkAgents, getAgentStatuses,
  getAutonomousEvents, getAutonomousStatus,
  spawnAgent, killAgent,
} from "@/lib/cowork-api";

const DepartmentScene3D = dynamic(
  () => import("@/components/cowork-army/scenes/DepartmentScene3D"),
  { ssr: false }
);

const DEPT_COLORS: Record<string, string> = {
  trade: "#a78bfa", medical: "#22d3ee", hotel: "#f59e0b", software: "#22c55e",
};

export default function DepartmentPage() {
  const params = useParams();
  const deptId = params.dept as string;
  const color = DEPT_COLORS[deptId] || "#818cf8";

  const [department, setDepartment] = useState<Department | null>(null);
  const [agents, setAgents] = useState<CoworkAgent[]>([]);
  const [statuses, setStatuses] = useState<Record<string, AgentStatus>>({});
  const [events, setEvents] = useState<AutonomousEvent[]>([]);
  const [autoStatus, setAutoStatus] = useState<AutonomousStatus | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [connected, setConnected] = useState<boolean | null>(null);

  const fetchAll = useCallback(async () => {
    try {
      const [dept, ag, st, ev, au] = await Promise.all([
        getDepartment(deptId),
        getCoworkAgents(deptId),
        getAgentStatuses(),
        getAutonomousEvents(30, "", deptId),
        getAutonomousStatus(),
      ]);
      setDepartment(dept);
      setAgents(ag);
      setStatuses(st);
      setEvents(ev);
      setAutoStatus(au);
      setConnected(true);
    } catch {
      setConnected(false);
    }
  }, [deptId]);

  useEffect(() => { fetchAll(); }, [fetchAll]);
  useEffect(() => {
    const iv = setInterval(async () => {
      try {
        const [st, ev] = await Promise.all([
          getAgentStatuses(),
          getAutonomousEvents(30, "", deptId),
        ]);
        setStatuses(st); setEvents(ev); setConnected(true);
      } catch {
        setConnected(false);
      }
    }, 2000);
    return () => clearInterval(iv);
  }, [deptId]);

  const liveCount = agents.filter(a => {
    const s = statuses[a.id]?.status;
    return s && ["working", "thinking", "coding", "searching"].includes(s);
  }).length;

  const selAgent = agents.find(a => a.id === selected);

  // Connection error
  if (connected === false && agents.length === 0) {
    return (
      <div className="h-screen flex items-center justify-center noise-bg">
        <div className="text-center max-w-sm">
          <div className="w-14 h-14 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-2xl mx-auto mb-5">
            ⚡
          </div>
          <h2 className="text-base font-bold text-white mb-2">Backend Baglantisi Yok</h2>
          <p className="text-sm text-gray-400 mb-5">Sunucu calismiyor veya erisilemiyor.</p>
          <div className="flex items-center gap-3 justify-center">
            <Link href="/"
              className="px-4 py-2 rounded-lg bg-gray-500/8 text-gray-400 border border-gray-500/20 text-xs font-semibold">
              ← Ana Sayfa
            </Link>
            <button onClick={fetchAll}
              className="px-4 py-2 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/30 text-xs font-semibold">
              Tekrar Dene
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col">
      {/* HEADER */}
      <header className="flex items-center justify-between px-5 py-3 border-b flex-shrink-0 bg-[#0c0d18]/50 backdrop-blur-sm"
        style={{ borderColor: `${color}25` }}>
        <div className="flex items-center gap-3">
          <Link href="/"
            className="text-xs px-3 py-1.5 rounded-lg border border-[#1a1f35] text-gray-400 hover:text-white hover:border-gray-500 transition-colors font-medium">
            ← Geri
          </Link>
          <div className="w-9 h-9 rounded-xl flex items-center justify-center text-xl" style={{ background: `${color}15` }}>
            {department?.icon}
          </div>
          <div>
            <h1 className="text-sm font-bold tracking-wider" style={{ color }}>
              {department?.name || deptId.toUpperCase()}
            </h1>
            <p className="text-[10px] text-gray-500">{department?.description}</p>
          </div>
        </div>
        <div className="flex items-center gap-5">
          <StatBadge value={agents.length} label="AGENTS" color={color} />
          <StatBadge value={liveCount} label="LIVE" color="#22c55e" />
          <StatBadge value={autoStatus?.tick_count ?? 0} label="TICKS" color="#818cf8" />
          {connected === false && (
            <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-red-500/10 border border-red-500/20">
              <div className="w-1.5 h-1.5 rounded-full bg-red-500 pulse-dot" />
              <span className="text-[10px] text-red-400">Offline</span>
            </div>
          )}
        </div>
      </header>

      {/* MAIN */}
      <div className="flex-1 flex overflow-hidden">
        {/* LEFT SIDEBAR — agents */}
        <aside className="w-[220px] border-r border-[#1a1f35] flex flex-col flex-shrink-0 bg-[#0c0d18]/30">
          <div className="px-4 py-3 text-[10px] text-gray-500 tracking-widest border-b border-[#1a1f35]/50 flex justify-between items-center font-medium">
            <span>AGENTS ({agents.length})</span>
            <button onClick={() => agents.forEach(a => spawnAgent(a.id))}
              className="text-[9px] px-2.5 py-1 rounded-md bg-green-500/10 text-green-400 border border-green-500/25 hover:bg-green-500/20 font-semibold transition-colors">
              ▶ ALL
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {agents.map(a => {
              const st = statuses[a.id]?.status || "idle";
              const isActive = ["working", "thinking", "coding", "searching"].includes(st);
              return (
                <button key={a.id} onClick={() => setSelected(a.id)}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left transition-all text-xs
                    ${selected === a.id ? "bg-indigo-500/10 border border-indigo-500/20" : "border border-transparent hover:bg-white/[0.02]"}
                    ${isActive ? "border-l-2 !border-l-green-500" : ""}`}>
                  <span className="text-base flex-shrink-0">{a.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold truncate" style={{ color: a.color }}>{a.name}</div>
                    <div className="text-[9px] text-gray-500 tracking-wider">{a.tier}</div>
                  </div>
                  <div className={`w-2 h-2 rounded-full flex-shrink-0 ${isActive ? "bg-green-500 pulse-dot" : st === "error" ? "bg-red-500" : "bg-gray-600"}`} />
                </button>
              );
            })}
          </div>
        </aside>

        {/* CENTER: 3D Scene */}
        <main className="flex-1 relative">
          <DepartmentScene3D
            departmentId={deptId}
            agents={agents}
            statuses={statuses}
            events={events}
          />

          {/* Agent detail overlay */}
          {selAgent && (
            <div className="absolute top-3 left-3 w-[280px] bg-[#0c0d18]/95 border border-[#1a1f35] rounded-2xl p-4 backdrop-blur-md z-10 shadow-2xl">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl" style={{ background: `${selAgent.color}15` }}>
                  {selAgent.icon}
                </div>
                <div className="flex-1">
                  <div className="text-sm font-bold" style={{ color: selAgent.color }}>{selAgent.name}</div>
                  <div className="text-[10px] text-gray-500">{selAgent.tier} — {selAgent.domain}</div>
                </div>
                <button onClick={() => setSelected(null)} className="text-gray-500 hover:text-white text-sm transition-colors">✕</button>
              </div>
              <p className="text-xs text-gray-400 mb-3 leading-relaxed">{selAgent.desc}</p>
              <div className="flex gap-2 mb-3">
                <button onClick={() => spawnAgent(selAgent.id)}
                  className="text-[10px] px-3 py-1.5 rounded-lg bg-green-500/10 text-green-400 border border-green-500/25 font-semibold hover:bg-green-500/20 transition-colors">
                  ▶ Baslat
                </button>
                <button onClick={() => killAgent(selAgent.id)}
                  className="text-[10px] px-3 py-1.5 rounded-lg bg-red-500/10 text-red-400 border border-red-500/25 font-semibold hover:bg-red-500/20 transition-colors">
                  ⏹ Durdur
                </button>
              </div>
              <div className="text-[9px] text-gray-500 mb-1.5 tracking-widest font-medium">SKILLS</div>
              <div className="flex flex-wrap gap-1.5 mb-3">
                {selAgent.skills?.map(s => (
                  <span key={s} className="text-[10px] px-2 py-0.5 rounded-md bg-indigo-500/10 text-indigo-300">{s}</span>
                ))}
              </div>
              {statuses[selAgent.id]?.lines?.length > 0 && (
                <div className="bg-[#09090f] rounded-lg p-2.5 max-h-[130px] overflow-y-auto mt-2 font-code">
                  {statuses[selAgent.id].lines.slice(-10).map((l, i) => (
                    <div key={i} className="text-[10px] text-gray-400 whitespace-pre-wrap leading-relaxed">{l}</div>
                  ))}
                </div>
              )}
            </div>
          )}
        </main>

        {/* RIGHT PANEL — events */}
        <aside className="w-[220px] border-l border-[#1a1f35] flex flex-col flex-shrink-0 bg-[#0c0d18]/30">
          <div className="px-4 py-3 text-[10px] text-gray-500 tracking-widest border-b border-[#1a1f35]/50 font-medium">
            EVENT FEED
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
            {events.length === 0 && (
              <div className="text-center text-[11px] text-gray-600 py-10">Henuz event yok</div>
            )}
            {events.map((ev, i) => (
              <div key={i} className={`text-[11px] p-2 rounded-lg border-l-2 bg-white/[0.01] ${
                ev.type === "task_created" ? "border-l-green-500" :
                ev.type === "warning" ? "border-l-red-500" :
                ev.type === "inbox_check" ? "border-l-amber-500" : "border-l-indigo-500"
              }`}>
                <div className="text-[9px] text-gray-500 font-code">
                  {ev.timestamp?.split("T")[1]?.split(".")[0]} — {ev.agent_id}
                </div>
                <div className="text-gray-400 truncate mt-0.5">{ev.message}</div>
              </div>
            ))}
          </div>
        </aside>
      </div>
    </div>
  );
}

function StatBadge({ value, label, color }: { value: number | string; label: string; color?: string }) {
  return (
    <div className="text-center">
      <div className="text-base font-extrabold font-code" style={{ color }}>{value}</div>
      <div className="text-[8px] text-gray-500 tracking-widest uppercase font-medium">{label}</div>
    </div>
  );
}
