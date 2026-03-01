"use client";
/**
 * COWORK.ARMY v7.0 — Main Dashboard
 * Modern command center with 4 departments, cargo agent, event feed
 */
import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import type {
  Department, CoworkAgent, AgentStatus, AutonomousEvent,
  AutonomousStatus, ServerInfo, CargoResult,
} from "@/lib/cowork-api";
import {
  getDepartments, getCoworkAgents, getAgentStatuses,
  getAutonomousEvents, getAutonomousStatus, getServerInfo,
  startAutonomousLoop, stopAutonomousLoop, uploadCargo,
  delegateCargo, createCoworkTask, spawnAgent,
} from "@/lib/cowork-api";

const DEPT_META: Record<string, { color: string; icon: string; gradient: string }> = {
  trade:    { color: "#a78bfa", icon: "📈", gradient: "from-violet-500/10 to-purple-600/5" },
  medical:  { color: "#22d3ee", icon: "🏥", gradient: "from-cyan-500/10 to-teal-600/5" },
  hotel:    { color: "#f59e0b", icon: "🏨", gradient: "from-amber-500/10 to-orange-600/5" },
  software: { color: "#22c55e", icon: "💻", gradient: "from-green-500/10 to-emerald-600/5" },
};

export default function Home() {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [agents, setAgents] = useState<CoworkAgent[]>([]);
  const [statuses, setStatuses] = useState<Record<string, AgentStatus>>({});
  const [events, setEvents] = useState<AutonomousEvent[]>([]);
  const [autoStatus, setAutoStatus] = useState<AutonomousStatus | null>(null);
  const [info, setInfo] = useState<ServerInfo | null>(null);
  const [connected, setConnected] = useState<boolean | null>(null); // null = loading
  const [connError, setConnError] = useState<string>("");
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [showCargoModal, setShowCargoModal] = useState(false);

  const fetchAll = useCallback(async () => {
    try {
      const [dep, ag, st, ev, au, inf] = await Promise.all([
        getDepartments(), getCoworkAgents(), getAgentStatuses(),
        getAutonomousEvents(30), getAutonomousStatus(), getServerInfo(),
      ]);
      setDepartments(dep); setAgents(ag); setStatuses(st);
      setEvents(ev); setAutoStatus(au); setInfo(inf);
      setConnected(true);
      setConnError("");
    } catch (err) {
      setConnected(false);
      setConnError(err instanceof Error ? err.message : String(err));
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);
  useEffect(() => {
    const iv = setInterval(async () => {
      try {
        const [st, ev, au] = await Promise.all([
          getAgentStatuses(), getAutonomousEvents(30), getAutonomousStatus(),
        ]);
        setStatuses(st); setEvents(ev); setAutoStatus(au);
        setConnected(true);
      } catch {
        setConnected(false);
      }
    }, 2000);
    return () => clearInterval(iv);
  }, []);

  const liveCount = Object.values(statuses).filter(
    s => ["working", "thinking", "coding", "searching"].includes(s.status)
  ).length;

  const agentsByDept = (deptId: string) => agents.filter(a => a.department_id === deptId);
  const liveInDept = (deptId: string) =>
    agentsByDept(deptId).filter(a => {
      const s = statuses[a.id]?.status;
      return s && ["working", "thinking", "coding", "searching"].includes(s);
    }).length;

  // Loading state
  if (connected === null) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-2xl mx-auto mb-4 animate-pulse">
            👑
          </div>
          <div className="text-sm font-bold tracking-widest text-gradient mb-1">COWORK.ARMY</div>
          <div className="text-xs text-gray-500">Baglaniyor...</div>
        </div>
      </div>
    );
  }

  // Connection error state
  if (connected === false && departments.length === 0) {
    return (
      <div className="h-screen flex items-center justify-center noise-bg">
        <div className="text-center max-w-md mx-auto px-6">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-red-500/20 to-red-600/10 border border-red-500/20 flex items-center justify-center text-3xl mx-auto mb-6">
            ⚡
          </div>
          <h1 className="text-lg font-bold text-white mb-2">Backend Baglantisi Kurulamadi</h1>
          <p className="text-sm text-gray-400 mb-4 leading-relaxed">
            COWORK.ARMY backend sunucusuna baglanilamiyor.
          </p>
          {connError && (
            <div className="bg-red-500/5 border border-red-500/20 rounded-lg p-3 mb-4 text-left">
              <div className="text-[10px] text-red-400/60 mb-1">Hata:</div>
              <div className="text-xs text-red-300 font-code break-all">{connError}</div>
            </div>
          )}
          <div className="bg-[#0c0d18] border border-[#1a1f35] rounded-xl p-4 text-left mb-6">
            <div className="text-xs text-gray-500 mb-2 font-medium">API Endpoint:</div>
            <div className="text-xs text-gray-300 font-code break-all mb-3">
              {process.env.NEXT_PUBLIC_COWORK_API_URL || "/cowork-api (fallback)"}
            </div>
            <div className="text-xs text-gray-500 mb-2 font-medium">Kontrol adimlar:</div>
            <div className="space-y-2 text-xs font-code">
              <div className="flex items-start gap-2">
                <span className="text-amber-400 flex-shrink-0">1.</span>
                <span className="text-gray-300">Backend servisinin calistigini dogrulayin</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-amber-400 flex-shrink-0">2.</span>
                <span className="text-gray-300">NEXT_PUBLIC_COWORK_API_URL env var kontrolu</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-amber-400 flex-shrink-0">3.</span>
                <span className="text-gray-300">Browser Console (F12) ile hata detayini gorun</span>
              </div>
            </div>
          </div>
          <button onClick={fetchAll}
            className="px-6 py-2.5 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/30 text-sm font-semibold hover:bg-amber-500/20 transition-colors">
            Tekrar Dene
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col overflow-hidden noise-bg">
      {/* HEADER */}
      <header className="flex items-center justify-between px-5 py-3 border-b border-[#1a1f35] flex-shrink-0 bg-[#0c0d18]/50 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-lg shadow-lg shadow-amber-500/10">
            👑
          </div>
          <div>
            <h1 className="text-sm font-extrabold tracking-[3px]">
              COWORK<span className="text-gradient">.ARMY</span>
            </h1>
            <p className="text-[10px] text-gray-500">
              v{info?.version ?? "7.0"} — {info?.departments ?? 4} Dept — {info?.agents ?? 13} Agents
            </p>
          </div>
        </div>
        <div className="flex items-center gap-5">
          <StatBadge value={departments.length} label="DEPTS" color="#fbbf24" />
          <StatBadge value={agents.length} label="AGENTS" />
          <StatBadge value={liveCount} label="LIVE" color="#22c55e" pulse={liveCount > 0} />
          <StatBadge value={autoStatus?.tick_count ?? 0} label="TICKS" color="#818cf8" />
          {connected === false && (
            <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-red-500/10 border border-red-500/20">
              <div className="w-1.5 h-1.5 rounded-full bg-red-500 pulse-dot" />
              <span className="text-[10px] text-red-400 font-medium">Baglanti kesildi</span>
            </div>
          )}
          {connected === true && (
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
              <span className="text-[10px] text-green-400/60">Online</span>
            </div>
          )}
        </div>
      </header>

      {/* MAIN CONTENT */}
      <div className="flex-1 overflow-y-auto p-5">
        {/* DEPARTMENT GRID */}
        <div className="grid grid-cols-2 gap-4 mb-5 max-w-5xl mx-auto">
          {["trade", "medical", "hotel", "software"].map(deptId => {
            const dept = departments.find(d => d.id === deptId);
            const deptAgents = agentsByDept(deptId);
            const live = liveInDept(deptId);
            const meta = DEPT_META[deptId];

            return (
              <Link key={deptId} href={`/departments/${deptId}`}
                className={`group block border rounded-2xl p-5 card-hover bg-gradient-to-br ${meta.gradient}`}
                style={{ borderColor: `${meta.color}20` }}>
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl"
                    style={{ background: `${meta.color}15` }}>
                    {meta.icon}
                  </div>
                  <div className="flex-1">
                    <div className="text-xs font-bold tracking-wider" style={{ color: meta.color }}>
                      {dept?.name || deptId.toUpperCase()}
                    </div>
                    <div className="text-[10px] text-gray-500 mt-0.5">
                      {dept?.description || ""}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-extrabold font-code" style={{ color: live > 0 ? "#22c55e" : `${meta.color}60` }}>
                      {live}
                    </div>
                    <div className="text-[8px] text-gray-500 tracking-widest">LIVE</div>
                  </div>
                </div>
                {/* Agent chips */}
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {deptAgents.map(a => {
                    const st = statuses[a.id]?.status || "idle";
                    const isActive = ["working", "thinking", "coding", "searching"].includes(st);
                    return (
                      <span key={a.id}
                        className={`inline-flex items-center gap-1 text-[10px] px-2 py-1 rounded-lg border transition-all ${
                          isActive ? "glow-active" : ""
                        }`}
                        style={{
                          borderColor: isActive ? "#22c55e40" : `${meta.color}15`,
                          background: isActive ? "#22c55e08" : `${meta.color}06`,
                          color: isActive ? "#22c55e" : "#94a3b8",
                        }}>
                        <span className={`w-1.5 h-1.5 rounded-full ${isActive ? "bg-green-500 pulse-dot" : "bg-gray-600"}`} />
                        {a.icon} {a.name}
                      </span>
                    );
                  })}
                </div>
                <div className="text-[10px] text-gray-500 group-hover:text-gray-300 transition-colors flex items-center gap-1.5">
                  <span>3D Sahne</span>
                  <span className="opacity-40">→</span>
                  <span style={{ color: meta.color }} className="font-medium">Goruntule</span>
                </div>
              </Link>
            );
          })}
        </div>

        {/* CARGO + EVENTS ROW */}
        <div className="grid grid-cols-3 gap-4 max-w-5xl mx-auto">
          {/* CARGO SECTION */}
          <div className="col-span-2 border border-pink-500/15 rounded-2xl p-5 bg-gradient-to-br from-pink-500/5 to-rose-600/3">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-pink-500/10 flex items-center justify-center text-xl">
                📦
              </div>
              <div className="flex-1">
                <div className="text-xs font-bold text-pink-400 tracking-wider">CARGO AGENT</div>
                <div className="text-[10px] text-gray-500 mt-0.5">Dosya analiz & departman routing</div>
              </div>
              <StatusIndicator status={statuses["cargo"]?.status || "idle"} />
            </div>
            <div className="flex gap-2.5">
              <ActionButton onClick={() => setShowCargoModal(true)}
                icon="📤" label="Dosya Yukle" color="pink" />
              <ActionButton onClick={() => setShowTaskModal(true)}
                icon="📋" label="Gorev Olustur" color="indigo" />
              <button onClick={async () => {
                  if (autoStatus?.running) await stopAutonomousLoop();
                  else await startAutonomousLoop();
                  const s = await getAutonomousStatus();
                  setAutoStatus(s);
                }}
                className={`flex items-center gap-1.5 text-[11px] px-4 py-2 rounded-lg font-semibold border transition-all ${
                  autoStatus?.running
                    ? "bg-green-500/10 text-green-400 border-green-500/25 hover:bg-green-500/20"
                    : "bg-gray-500/8 text-gray-400 border-gray-500/20 hover:bg-gray-500/15"
                }`}>
                <span className={`w-2 h-2 rounded-full ${autoStatus?.running ? "bg-green-500 pulse-dot" : "bg-gray-600"}`} />
                {autoStatus?.running ? "Otonom ACIK" : "Otonom KAPALI"}
              </button>
            </div>
          </div>

          {/* EVENT FEED */}
          <div className="border border-[#1a1f35] rounded-2xl overflow-hidden bg-[#0c0d18]/50">
            <div className="px-4 py-2.5 text-[10px] text-gray-500 tracking-widest border-b border-[#1a1f35]/50 flex justify-between items-center font-medium">
              <span>EVENT FEED</span>
              <span className="text-[10px] text-indigo-400 font-code">{events.length}</span>
            </div>
            <div className="h-[180px] overflow-y-auto p-3 space-y-1.5">
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
                    {ev.department_id && (
                      <span className="ml-1" style={{ color: DEPT_META[ev.department_id]?.color }}>
                        [{ev.department_id}]
                      </span>
                    )}
                  </div>
                  <div className="text-gray-400 truncate mt-0.5">{ev.message}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* SERVER INFO */}
        <div className="max-w-5xl mx-auto mt-4 flex items-center gap-4 text-[10px] text-gray-600 px-1 font-code">
          <span>{info?.name} v{info?.version}</span>
          <span className="text-gray-700">|</span>
          <span>{info?.agents} agents</span>
          <span className="text-gray-700">|</span>
          <span>{info?.departments} departments</span>
          <span className="text-gray-700">|</span>
          <span>{autoStatus?.tick_count} ticks</span>
        </div>
      </div>

      {/* MODALS */}
      {showTaskModal && <TaskModal agents={agents} departments={departments} onClose={() => setShowTaskModal(false)} />}
      {showCargoModal && <CargoModal onClose={() => setShowCargoModal(false)} />}
    </div>
  );
}

/* ═══ STAT BADGE ═══ */
function StatBadge({ value, label, color, pulse }: { value: number | string; label: string; color?: string; pulse?: boolean }) {
  return (
    <div className="text-center">
      <div className={`text-base font-extrabold font-code ${pulse ? "glow-active rounded" : ""}`} style={{ color }}>
        {value}
      </div>
      <div className="text-[8px] text-gray-500 tracking-widest uppercase font-medium">{label}</div>
    </div>
  );
}

/* ═══ STATUS INDICATOR ═══ */
function StatusIndicator({ status }: { status: string }) {
  const isActive = ["working", "thinking", "coding", "searching"].includes(status);
  const color = isActive ? "#22c55e" : status === "error" ? "#ef4444" : "#4b5563";
  return (
    <div className="flex items-center gap-1.5 px-2 py-1 rounded-md" style={{ background: `${color}10` }}>
      <div className={`w-2 h-2 rounded-full ${isActive ? "pulse-dot" : ""}`} style={{ background: color }} />
      <span className="text-[10px] font-code" style={{ color }}>{status}</span>
    </div>
  );
}

/* ═══ ACTION BUTTON ═══ */
function ActionButton({ onClick, icon, label, color }: {
  onClick: () => void; icon: string; label: string; color: string;
}) {
  const colors: Record<string, string> = {
    pink: "bg-pink-500/10 text-pink-400 border-pink-500/25 hover:bg-pink-500/20",
    indigo: "bg-indigo-500/10 text-indigo-400 border-indigo-500/25 hover:bg-indigo-500/20",
  };
  return (
    <button onClick={onClick}
      className={`flex items-center gap-1.5 text-[11px] px-4 py-2 rounded-lg font-semibold border transition-all ${colors[color]}`}>
      {icon} {label}
    </button>
  );
}

/* ═══ TASK MODAL ═══ */
function TaskModal({ agents, departments, onClose }: {
  agents: CoworkAgent[]; departments: Department[]; onClose: () => void;
}) {
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [agent, setAgent] = useState("");
  const [deptId, setDeptId] = useState("");
  const [priority, setPriority] = useState("normal");

  const submit = async () => {
    if (!title) return;
    await createCoworkTask(title, desc, agent, priority, deptId || undefined);
    onClose();
  };

  const filteredAgents = deptId ? agents.filter(a => a.department_id === deptId) : agents;

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center" onClick={onClose}>
      <div className="bg-[#0f1019] border border-amber-500/20 rounded-2xl p-6 w-[460px] shadow-2xl" onClick={e => e.stopPropagation()}>
        <h2 className="text-sm font-bold text-amber-400 mb-5 flex items-center gap-2">
          <span className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center">📋</span>
          Gorev Olustur
        </h2>
        <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Gorev basligi"
          className="w-full bg-[#0a0b12] border border-[#1e293b] text-white text-xs p-3 rounded-lg mb-3 focus:border-amber-500/40 focus:outline-none transition-colors" />
        <textarea value={desc} onChange={e => setDesc(e.target.value)} placeholder="Aciklama (opsiyonel)"
          className="w-full bg-[#0a0b12] border border-[#1e293b] text-white text-xs p-3 rounded-lg mb-3 h-20 resize-none focus:border-amber-500/40 focus:outline-none transition-colors" />
        <div className="flex gap-2 mb-4">
          <select value={deptId} onChange={e => { setDeptId(e.target.value); setAgent(""); }}
            className="flex-1 bg-[#0a0b12] border border-[#1e293b] text-white text-xs p-3 rounded-lg">
            <option value="">Tum Departmanlar</option>
            {departments.map(d => <option key={d.id} value={d.id}>{d.icon} {d.name}</option>)}
          </select>
          <select value={agent} onChange={e => setAgent(e.target.value)}
            className="flex-1 bg-[#0a0b12] border border-[#1e293b] text-white text-xs p-3 rounded-lg">
            <option value="">📦 Auto (Cargo)</option>
            {filteredAgents.map(a => <option key={a.id} value={a.id}>{a.icon} {a.name}</option>)}
          </select>
          <select value={priority} onChange={e => setPriority(e.target.value)}
            className="w-28 bg-[#0a0b12] border border-[#1e293b] text-white text-xs p-3 rounded-lg">
            <option>normal</option><option>high</option><option>urgent</option>
          </select>
        </div>
        <div className="flex gap-2">
          <button onClick={submit}
            className="px-5 py-2.5 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/25 text-xs font-semibold hover:bg-indigo-500/20 transition-colors">
            Olustur
          </button>
          <button onClick={onClose}
            className="px-5 py-2.5 rounded-lg bg-gray-500/8 text-gray-400 border border-gray-500/20 text-xs font-semibold hover:bg-gray-500/15 transition-colors">
            Iptal
          </button>
        </div>
      </div>
    </div>
  );
}

/* ═══ CARGO MODAL ═══ */
function CargoModal({ onClose }: { onClose: () => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [description, setDescription] = useState("");
  const [result, setResult] = useState<CargoResult | null>(null);
  const [loading, setLoading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const submit = async () => {
    if (!file && !description) return;
    setLoading(true);
    try {
      const r = await uploadCargo(file || undefined, description || undefined);
      setResult(r);
    } catch {
      setResult({ success: false, error: "Upload hatasi" } as CargoResult);
    }
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center" onClick={onClose}>
      <div className="bg-[#0f1019] border border-pink-500/20 rounded-2xl p-6 w-[460px] shadow-2xl" onClick={e => e.stopPropagation()}>
        <h2 className="text-sm font-bold text-pink-400 mb-5 flex items-center gap-2">
          <span className="w-8 h-8 rounded-lg bg-pink-500/10 flex items-center justify-center">📦</span>
          Cargo — Dosya Yukle
        </h2>

        {!result ? (
          <>
            <div className="border-2 border-dashed border-pink-500/20 rounded-xl p-8 text-center mb-4 cursor-pointer hover:border-pink-400/40 transition-colors"
              onClick={() => fileRef.current?.click()}>
              <input ref={fileRef} type="file" className="hidden" onChange={e => setFile(e.target.files?.[0] || null)} />
              {file ? (
                <div className="text-xs text-pink-400 font-medium">{file.name} ({(file.size / 1024).toFixed(1)} KB)</div>
              ) : (
                <div>
                  <div className="text-2xl mb-2">📂</div>
                  <div className="text-xs text-gray-500">Dosya secmek icin tiklayin</div>
                </div>
              )}
            </div>
            <textarea value={description} onChange={e => setDescription(e.target.value)}
              placeholder="Aciklama veya icerik (opsiyonel)"
              className="w-full bg-[#0a0b12] border border-[#1e293b] text-white text-xs p-3 rounded-lg mb-4 h-20 resize-none focus:border-pink-500/40 focus:outline-none transition-colors" />
            <div className="flex gap-2">
              <button onClick={submit} disabled={loading}
                className="px-5 py-2.5 rounded-lg bg-pink-500/10 text-pink-400 border border-pink-500/25 text-xs font-semibold disabled:opacity-50 hover:bg-pink-500/20 transition-colors">
                {loading ? "Analiz ediliyor..." : "📤 Yukle & Analiz Et"}
              </button>
              <button onClick={onClose}
                className="px-5 py-2.5 rounded-lg bg-gray-500/8 text-gray-400 border border-gray-500/20 text-xs font-semibold hover:bg-gray-500/15 transition-colors">
                Iptal
              </button>
            </div>
          </>
        ) : (
          <div className="space-y-3">
            <div className={`flex items-center gap-2 text-sm font-semibold ${result.success ? "text-green-400" : "text-red-400"}`}>
              <span>{result.success ? "✓" : "✕"}</span>
              {result.success ? "Basarili!" : "Hata: " + result.error}
            </div>
            {result.success && (
              <div className="bg-[#0a0b12] rounded-xl p-4 space-y-2">
                <InfoRow label="Hedef Departman" value={result.target_department_id} />
                <InfoRow label="Hedef Agent" value={result.target_agent_id} />
                <InfoRow label="Guven" value={`${result.confidence}%`} />
                {result.reasoning && (
                  <div className="text-[11px] text-gray-400 mt-2 pt-2 border-t border-[#1a1f35]">{result.reasoning}</div>
                )}
                {result.keywords_found && result.keywords_found.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {result.keywords_found.map((k, i) => (
                      <span key={i} className="text-[10px] px-2 py-0.5 rounded-md bg-pink-500/10 text-pink-300">{k}</span>
                    ))}
                  </div>
                )}
              </div>
            )}
            <button onClick={onClose}
              className="px-5 py-2.5 rounded-lg bg-gray-500/8 text-gray-400 border border-gray-500/20 text-xs font-semibold hover:bg-gray-500/15 transition-colors mt-2">
              Kapat
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="flex items-center justify-between text-xs">
      <span className="text-gray-500">{label}</span>
      <span className="text-white font-medium font-code">{value || "—"}</span>
    </div>
  );
}
