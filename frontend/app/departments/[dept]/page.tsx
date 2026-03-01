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
  spawnAgent, killAgent, createCoworkTask,
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
  const [error, setError] = useState("");

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
      setError("");
    } catch {
      setError("Baglanti hatasi");
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
        setStatuses(st); setEvents(ev); setError("");
      } catch {}
    }, 2000);
    return () => clearInterval(iv);
  }, [deptId]);

  const liveCount = agents.filter(a => {
    const s = statuses[a.id]?.status;
    return s && ["working", "thinking", "coding", "searching"].includes(s);
  }).length;

  const selAgent = agents.find(a => a.id === selected);

  return (
    <div className="h-screen flex flex-col">
      {/* HEADER */}
      <header className="flex items-center justify-between px-4 py-2 border-b flex-shrink-0"
        style={{ borderColor: `${color}30` }}>
        <div className="flex items-center gap-3">
          <Link href="/"
            className="text-[10px] px-2 py-1 rounded border border-[#1a1f30] text-gray-400 hover:text-white hover:border-gray-500 transition-colors">
            ← Geri
          </Link>
          <span className="text-xl">{department?.icon}</span>
          <div>
            <h1 className="text-xs font-extrabold tracking-[2px]" style={{ color }}>
              {department?.name || deptId.toUpperCase()}
            </h1>
            <p className="text-[8px] text-gray-500">{department?.description}</p>
          </div>
        </div>
        <div className="flex items-center gap-4 text-center">
          <Stat value={agents.length} label="AGENTS" color={color} />
          <Stat value={liveCount} label="LIVE" color="#22c55e" />
          <Stat value={autoStatus?.tick_count ?? 0} label="TICKS" color="#818cf8" />
          {error && <span className="text-[8px] text-red-400">{error}</span>}
        </div>
      </header>

      {/* MAIN */}
      <div className="flex-1 flex overflow-hidden">
        {/* LEFT SIDEBAR — agents */}
        <aside className="w-[200px] border-r border-[#1a1f30] flex flex-col flex-shrink-0">
          <div className="px-3 py-2 text-[7px] text-gray-500 tracking-[2px] border-b border-[#1a1f3030] flex justify-between items-center">
            <span>AGENTS ({agents.length})</span>
            <button onClick={() => agents.forEach(a => spawnAgent(a.id))}
              className="text-[6px] px-2 py-0.5 rounded bg-green-500/10 text-green-400 border border-green-500/30 hover:bg-green-500/20 font-bold">
              ▶ ALL
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-1 space-y-0.5">
            {agents.map(a => {
              const st = statuses[a.id]?.status || "idle";
              const isActive = ["working", "thinking", "coding", "searching"].includes(st);
              return (
                <button key={a.id} onClick={() => setSelected(a.id)}
                  className={`w-full flex items-center gap-2 px-2 py-1.5 rounded text-left transition-all text-[9px]
                    ${selected === a.id ? "bg-indigo-500/10 border border-indigo-500/20" : "border border-transparent hover:bg-white/[0.02]"}
                    ${isActive ? "border-l-2 !border-l-green-500" : ""}`}>
                  <span className="text-sm flex-shrink-0">{a.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="font-bold truncate" style={{ color: a.color }}>{a.name}</div>
                    <div className="text-[6px] text-gray-500 tracking-wider">{a.tier}</div>
                  </div>
                  <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${isActive ? "bg-green-500 pulse-dot" : st === "error" ? "bg-red-500" : "bg-gray-600"}`} />
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
            <div className="absolute top-2 left-2 w-[260px] bg-[#0b0c14]/95 border border-[#1a1f30] rounded-lg p-3 backdrop-blur z-10">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-2xl">{selAgent.icon}</span>
                <div>
                  <div className="text-sm font-extrabold" style={{ color: selAgent.color }}>{selAgent.name}</div>
                  <div className="text-[7px] text-gray-500">{selAgent.tier} — {selAgent.domain}</div>
                </div>
                <button onClick={() => setSelected(null)} className="ml-auto text-gray-500 hover:text-white text-xs">✕</button>
              </div>
              <p className="text-[9px] text-gray-400 mb-2">{selAgent.desc}</p>
              <div className="flex gap-1.5 mb-2">
                <button onClick={() => spawnAgent(selAgent.id)}
                  className="text-[8px] px-2 py-1 rounded bg-green-500/10 text-green-400 border border-green-500/30 font-bold">
                  ▶ Baslat
                </button>
                <button onClick={() => killAgent(selAgent.id)}
                  className="text-[8px] px-2 py-1 rounded bg-red-500/10 text-red-400 border border-red-500/30 font-bold">
                  ⏹ Durdur
                </button>
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
        </main>

        {/* RIGHT PANEL — events */}
        <aside className="w-[200px] border-l border-[#1a1f30] flex flex-col flex-shrink-0">
          <div className="px-3 py-2 text-[7px] text-gray-500 tracking-[2px] border-b border-[#1a1f3030]">
            EVENT FEED
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {events.length === 0 && (
              <div className="text-center text-[8px] text-gray-600 py-8">Henuz event yok</div>
            )}
            {events.map((ev, i) => (
              <div key={i} className={`text-[8px] p-1.5 rounded border-l-2 bg-white/[0.01] ${
                ev.type === "task_created" ? "border-l-green-500" :
                ev.type === "warning" ? "border-l-red-500" :
                ev.type === "inbox_check" ? "border-l-amber-500" : "border-l-indigo-500"
              }`}>
                <div className="text-[6px] text-gray-500">
                  {ev.timestamp?.split("T")[1]?.split(".")[0]} — {ev.agent_id}
                </div>
                <div className="text-gray-400 truncate">{ev.message}</div>
              </div>
            ))}
          </div>
        </aside>
      </div>
    </div>
  );
}

function Stat({ value, label, color }: { value: number | string; label: string; color?: string }) {
  return (
    <div className="text-center">
      <div className="text-sm font-extrabold" style={{ color }}>{value}</div>
      <div className="text-[5px] text-gray-500 tracking-[2px] uppercase">{label}</div>
    </div>
  );
}
