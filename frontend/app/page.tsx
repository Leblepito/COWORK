"use client";
/**
 * COWORK.ARMY v7.0 — Main Dashboard
 * 4-department grid + Cargo agent + Event feed
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

const DEPT_COLORS: Record<string, string> = {
  trade: "#a78bfa", medical: "#22d3ee", hotel: "#f59e0b", software: "#22c55e",
};
const DEPT_ICONS: Record<string, string> = {
  trade: "📈", medical: "🏥", hotel: "🏨", software: "💻",
};

export default function Home() {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [agents, setAgents] = useState<CoworkAgent[]>([]);
  const [statuses, setStatuses] = useState<Record<string, AgentStatus>>({});
  const [events, setEvents] = useState<AutonomousEvent[]>([]);
  const [autoStatus, setAutoStatus] = useState<AutonomousStatus | null>(null);
  const [info, setInfo] = useState<ServerInfo | null>(null);
  const [error, setError] = useState("");
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
      setError("");
    } catch {
      setError("Backend baglanti hatasi");
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);
  useEffect(() => {
    const iv = setInterval(async () => {
      try {
        const [st, ev, au] = await Promise.all([
          getAgentStatuses(), getAutonomousEvents(30), getAutonomousStatus(),
        ]);
        setStatuses(st); setEvents(ev); setAutoStatus(au); setError("");
      } catch {}
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

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      {/* HEADER */}
      <header className="flex items-center justify-between px-4 py-2 border-b border-[#1a1f30] flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-sm">
            👑
          </div>
          <div>
            <h1 className="text-xs font-extrabold tracking-[3px]">
              COWORK<span className="text-amber-400">.ARMY</span>
            </h1>
            <p className="text-[8px] text-gray-500 tracking-wider">
              v7 — {info?.departments ?? 4} DEPTS — {info?.agents ?? 13} AGENTS — POSTGRESQL
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4 text-center">
          <Stat value={departments.length} label="DEPTS" color="#fbbf24" />
          <Stat value={agents.length} label="AGENTS" />
          <Stat value={liveCount} label="LIVE" color="#22c55e" />
          <Stat value={autoStatus?.tick_count ?? 0} label="TICKS" color="#818cf8" />
          {error && <span className="text-[8px] text-red-400 max-w-[200px] truncate">{error}</span>}
        </div>
      </header>

      {/* MAIN CONTENT */}
      <div className="flex-1 overflow-y-auto p-4">
        {/* DEPARTMENT GRID */}
        <div className="grid grid-cols-2 gap-3 mb-4 max-w-5xl mx-auto">
          {["trade", "medical", "hotel", "software"].map(deptId => {
            const dept = departments.find(d => d.id === deptId);
            const deptAgents = agentsByDept(deptId);
            const live = liveInDept(deptId);
            const color = DEPT_COLORS[deptId];
            const icon = DEPT_ICONS[deptId];

            return (
              <Link key={deptId} href={`/departments/${deptId}`}
                className="group block border rounded-xl p-4 transition-all hover:scale-[1.01]"
                style={{ borderColor: `${color}30`, background: `${color}05` }}>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xl">{icon}</span>
                  <div className="flex-1">
                    <div className="text-[11px] font-extrabold tracking-wider" style={{ color }}>
                      {dept?.name || deptId.toUpperCase()}
                    </div>
                    <div className="text-[8px] text-gray-500">
                      {dept?.description || ""}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-[10px] font-bold" style={{ color }}>{live}</div>
                    <div className="text-[6px] text-gray-500">LIVE</div>
                  </div>
                </div>
                {/* Agent chips */}
                <div className="flex flex-wrap gap-1 mb-2">
                  {deptAgents.map(a => {
                    const st = statuses[a.id]?.status || "idle";
                    const isActive = ["working", "thinking", "coding", "searching"].includes(st);
                    return (
                      <span key={a.id} className="inline-flex items-center gap-1 text-[8px] px-1.5 py-0.5 rounded-full border"
                        style={{
                          borderColor: isActive ? "#22c55e50" : `${color}25`,
                          background: isActive ? "#22c55e10" : `${color}08`,
                          color: isActive ? "#22c55e" : "#94a3b8",
                        }}>
                        <span className={`w-1 h-1 rounded-full ${isActive ? "bg-green-500 pulse-dot" : "bg-gray-600"}`} />
                        {a.icon} {a.name}
                      </span>
                    );
                  })}
                </div>
                <div className="text-[7px] text-gray-500 group-hover:text-gray-300 transition-colors flex items-center gap-1">
                  3D Sahne → <span style={{ color }}>Goruntule</span>
                </div>
              </Link>
            );
          })}
        </div>

        {/* CARGO + EVENTS ROW */}
        <div className="grid grid-cols-3 gap-3 max-w-5xl mx-auto">
          {/* CARGO SECTION */}
          <div className="col-span-2 border border-[#f472b630] rounded-xl p-4 bg-[#f472b605]">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-xl">📦</span>
              <div className="flex-1">
                <div className="text-[11px] font-extrabold text-pink-400 tracking-wider">CARGO AGENT</div>
                <div className="text-[8px] text-gray-500">Dosya analiz & departman routing</div>
              </div>
              <CargoStatusDot status={statuses["cargo"]?.status || "idle"} />
            </div>
            <div className="flex gap-2">
              <button onClick={() => setShowCargoModal(true)}
                className="text-[9px] px-3 py-1.5 rounded bg-pink-500/10 text-pink-400 border border-pink-500/30 font-bold hover:bg-pink-500/20 transition-colors">
                📤 Dosya Yukle
              </button>
              <button onClick={() => setShowTaskModal(true)}
                className="text-[9px] px-3 py-1.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/30 font-bold hover:bg-indigo-500/20 transition-colors">
                📋 Gorev Olustur
              </button>
              <button onClick={async () => {
                  if (autoStatus?.running) await stopAutonomousLoop();
                  else await startAutonomousLoop();
                  const s = await getAutonomousStatus();
                  setAutoStatus(s);
                }}
                className={`text-[9px] px-3 py-1.5 rounded font-bold border transition-colors ${
                  autoStatus?.running
                    ? "bg-green-500/10 text-green-400 border-green-500/30"
                    : "bg-gray-500/10 text-gray-400 border-gray-500/30"
                }`}>
                {autoStatus?.running ? "▶ Otonom ACIK" : "⏸ Otonom KAPALI"}
              </button>
            </div>
          </div>

          {/* EVENT FEED */}
          <div className="border border-[#1a1f30] rounded-xl overflow-hidden">
            <div className="px-3 py-2 text-[7px] text-gray-500 tracking-[2px] border-b border-[#1a1f3030] flex justify-between items-center">
              <span>EVENT FEED</span>
              <span className="text-[6px] text-indigo-400">{events.length}</span>
            </div>
            <div className="h-[160px] overflow-y-auto p-2 space-y-1">
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
                    {ev.department_id && <span className="ml-1" style={{ color: DEPT_COLORS[ev.department_id] }}>[{ev.department_id}]</span>}
                  </div>
                  <div className="text-gray-400 truncate">{ev.message}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* SERVER INFO */}
        <div className="max-w-5xl mx-auto mt-3 flex items-center gap-4 text-[7px] text-gray-600 px-1">
          <span>SERVER: {info?.name} v{info?.version}</span>
          <span>|</span>
          <span>Agents: {info?.agents}</span>
          <span>|</span>
          <span>Departments: {info?.departments}</span>
          <span>|</span>
          <span>Ticks: {autoStatus?.tick_count}</span>
        </div>
      </div>

      {/* MODALS */}
      {showTaskModal && <TaskModal agents={agents} departments={departments} onClose={() => setShowTaskModal(false)} />}
      {showCargoModal && <CargoModal onClose={() => setShowCargoModal(false)} />}
    </div>
  );
}

// ═══ STAT ═══
function Stat({ value, label, color }: { value: number | string; label: string; color?: string }) {
  return (
    <div className="text-center">
      <div className="text-sm font-extrabold" style={{ color }}>{value}</div>
      <div className="text-[5px] text-gray-500 tracking-[2px] uppercase">{label}</div>
    </div>
  );
}

// ═══ CARGO STATUS DOT ═══
function CargoStatusDot({ status }: { status: string }) {
  const isActive = ["working", "thinking", "coding", "searching"].includes(status);
  return (
    <div className="flex items-center gap-1">
      <div className={`w-2 h-2 rounded-full ${isActive ? "bg-green-500 pulse-dot" : status === "error" ? "bg-red-500" : "bg-gray-600"}`} />
      <span className="text-[7px] text-gray-500">{status}</span>
    </div>
  );
}

// ═══ TASK MODAL ═══
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
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center" onClick={onClose}>
      <div className="bg-[#0f1019] border border-[#fbbf2440] rounded-xl p-6 w-[440px]" onClick={e => e.stopPropagation()}>
        <h2 className="text-sm font-bold text-amber-400 mb-4">📋 Gorev Olustur</h2>
        <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Gorev basligi"
          className="w-full bg-[#0a0b12] border border-[#1e293b] text-white font-mono text-[10px] p-2 rounded mb-2" />
        <textarea value={desc} onChange={e => setDesc(e.target.value)} placeholder="Aciklama (opsiyonel)"
          className="w-full bg-[#0a0b12] border border-[#1e293b] text-white font-mono text-[10px] p-2 rounded mb-2 h-20 resize-none" />
        <div className="flex gap-2 mb-3">
          <select value={deptId} onChange={e => { setDeptId(e.target.value); setAgent(""); }}
            className="flex-1 bg-[#0a0b12] border border-[#1e293b] text-white font-mono text-[10px] p-2 rounded">
            <option value="">Tum Departmanlar</option>
            {departments.map(d => <option key={d.id} value={d.id}>{d.icon} {d.name}</option>)}
          </select>
          <select value={agent} onChange={e => setAgent(e.target.value)}
            className="flex-1 bg-[#0a0b12] border border-[#1e293b] text-white font-mono text-[10px] p-2 rounded">
            <option value="">📦 Auto (Cargo)</option>
            {filteredAgents.map(a => <option key={a.id} value={a.id}>{a.icon} {a.name}</option>)}
          </select>
          <select value={priority} onChange={e => setPriority(e.target.value)}
            className="w-24 bg-[#0a0b12] border border-[#1e293b] text-white font-mono text-[10px] p-2 rounded">
            <option>normal</option><option>high</option><option>urgent</option>
          </select>
        </div>
        <div className="flex gap-2">
          <button onClick={submit}
            className="px-4 py-2 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/30 text-[10px] font-bold">
            📋 Olustur
          </button>
          <button onClick={onClose}
            className="px-4 py-2 rounded bg-gray-500/10 text-gray-400 border border-gray-500/30 text-[10px] font-bold">
            Iptal
          </button>
        </div>
      </div>
    </div>
  );
}

// ═══ CARGO MODAL ═══
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
      setResult({ success: false, error: "Upload hatasi" });
    }
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center" onClick={onClose}>
      <div className="bg-[#0f1019] border border-[#f472b640] rounded-xl p-6 w-[440px]" onClick={e => e.stopPropagation()}>
        <h2 className="text-sm font-bold text-pink-400 mb-4">📦 Cargo — Dosya Yukle</h2>

        {!result ? (
          <>
            <div className="border-2 border-dashed border-[#f472b630] rounded-lg p-6 text-center mb-3 cursor-pointer hover:border-pink-400/50 transition-colors"
              onClick={() => fileRef.current?.click()}>
              <input ref={fileRef} type="file" className="hidden" onChange={e => setFile(e.target.files?.[0] || null)} />
              {file ? (
                <div className="text-[10px] text-pink-400">{file.name} ({(file.size / 1024).toFixed(1)} KB)</div>
              ) : (
                <div className="text-[10px] text-gray-500">Dosya secmek icin tiklayin</div>
              )}
            </div>
            <textarea value={description} onChange={e => setDescription(e.target.value)}
              placeholder="Aciklama veya icerik (opsiyonel)"
              className="w-full bg-[#0a0b12] border border-[#1e293b] text-white font-mono text-[10px] p-2 rounded mb-3 h-20 resize-none" />
            <div className="flex gap-2">
              <button onClick={submit} disabled={loading}
                className="px-4 py-2 rounded bg-pink-500/10 text-pink-400 border border-pink-500/30 text-[10px] font-bold disabled:opacity-50">
                {loading ? "Analiz ediliyor..." : "📤 Yukle & Analiz Et"}
              </button>
              <button onClick={onClose}
                className="px-4 py-2 rounded bg-gray-500/10 text-gray-400 border border-gray-500/30 text-[10px] font-bold">
                Iptal
              </button>
            </div>
          </>
        ) : (
          <div className="space-y-2">
            <div className={`text-[10px] font-bold ${result.success ? "text-green-400" : "text-red-400"}`}>
              {result.success ? "Basarili!" : "Hata: " + result.error}
            </div>
            {result.success && (
              <>
                <div className="text-[9px] text-gray-400">
                  Hedef Departman: <span className="text-white">{result.target_department_id}</span>
                </div>
                <div className="text-[9px] text-gray-400">
                  Hedef Agent: <span className="text-white">{result.target_agent_id}</span>
                </div>
                <div className="text-[9px] text-gray-400">
                  Guven: <span className="text-white">{result.confidence}%</span>
                </div>
                {result.reasoning && (
                  <div className="text-[8px] text-gray-500 bg-[#0a0b12] p-2 rounded">{result.reasoning}</div>
                )}
                {result.keywords_found && result.keywords_found.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {result.keywords_found.map((k, i) => (
                      <span key={i} className="text-[7px] px-1.5 py-0.5 rounded bg-pink-500/10 text-pink-300">{k}</span>
                    ))}
                  </div>
                )}
              </>
            )}
            <button onClick={onClose}
              className="px-4 py-2 rounded bg-gray-500/10 text-gray-400 border border-gray-500/30 text-[10px] font-bold mt-2">
              Kapat
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
