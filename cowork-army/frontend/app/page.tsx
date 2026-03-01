"use client";
/**
 * COWORK.ARMY — Main Page (3-panel layout)
 * Left: Agent sidebar | Center: 3D Canvas | Right: Events + Controls
 */
import { useState, useEffect, useCallback } from "react";
import dynamic from "next/dynamic";
import type { CoworkAgent, AgentStatus, CoworkTask, AutonomousEvent, AutonomousStatus, ServerInfo, ApiKeyStatus } from "@/lib/cowork-api";
import { getCoworkAgents, getAgentStatuses, getAutonomousEvents, getAutonomousStatus,
  getServerInfo, spawnAgent, killAgent, startAutonomousLoop, stopAutonomousLoop,
  createCoworkTask, createAgent, deleteAgent,
  getApiKeyStatus, saveApiKey, setLlmProvider } from "@/lib/cowork-api";
import { AGENT_DEPARTMENT, DEPT_COLORS } from "@/components/cowork-army/scene-constants";

const CoworkOffice3D = dynamic(() => import("@/components/cowork-army/CoworkOffice3D"), { ssr: false });

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
  const [error, setError] = useState("");

  // ── Data Fetching ──
  const fetchAll = useCallback(async () => {
    try {
      const [ag, st, ev, au, inf] = await Promise.all([
        getCoworkAgents(), getAgentStatuses(), getAutonomousEvents(30),
        getAutonomousStatus(), getServerInfo(),
      ]);
      setAgents(ag); setStatuses(st); setEvents(ev); setAutoStatus(au); setInfo(inf);
      setError("");
    } catch (e: unknown) {
      setError("Backend bağlantı hatası — python server.py çalışıyor mu?");
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);
  useEffect(() => {
    const i1 = setInterval(async () => {
      try {
        const [st, ev, au] = await Promise.all([
          getAgentStatuses(), getAutonomousEvents(30), getAutonomousStatus(),
        ]);
        setStatuses(st); setEvents(ev); setAutoStatus(au); setError("");
      } catch {}
    }, 2000);
    return () => clearInterval(i1);
  }, []);

  const liveCount = Object.values(statuses).filter(
    s => ["working","thinking","coding","searching"].includes(s.status)
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
          {error && <span className="text-[8px] text-red-400 max-w-[200px] truncate">{error}</span>}
        </div>
      </header>

      {/* MAIN */}
      <div className="flex-1 flex overflow-hidden">
        {/* LEFT SIDEBAR */}
        <aside className="w-[200px] border-r border-[#1a1f30] flex flex-col flex-shrink-0">
          <div className="px-3 py-2 text-[7px] text-gray-500 tracking-[2px] border-b border-[#1a1f3030] flex justify-between items-center">
            <span>AGENTS ({agents.length})</span>
            <div className="flex gap-1">
              <button onClick={() => setShowAgentModal(true)}
                className="text-[6px] px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/30 hover:bg-amber-500/20 font-bold">
                + Yeni
              </button>
              <button onClick={() => agents.forEach(a => spawnAgent(a.id))}
                className="text-[6px] px-2 py-0.5 rounded bg-green-500/10 text-green-400 border border-green-500/30 hover:bg-green-500/20 font-bold">
                ▶ ALL
              </button>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-1 space-y-0.5">
            {/* Department-grouped agents */}
            {(["cargo", "trade", "medical", "hotel", "software"] as const).map(dept => {
              const deptAgents = agents.filter(a => AGENT_DEPARTMENT[a.id] === dept);
              if (deptAgents.length === 0) return null;
              const deptLabel = dept === "cargo" ? "📦 CARGO" : dept === "trade" ? "📊 TRADE" : dept === "medical" ? "🏥 MEDICAL" : dept === "hotel" ? "🏨 HOTEL" : "💻 SOFTWARE";
              return (
                <div key={dept}>
                  <div className="px-2 py-1 text-[6px] tracking-[2px] font-bold" style={{ color: DEPT_COLORS[dept] }}>
                    {deptLabel}
                  </div>
                  {deptAgents.map(a => {
                    const st = statuses[a.id]?.status || "idle";
                    const isActive = ["working","thinking","coding","searching","delivering"].includes(st);
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
              );
            })}
            {/* Dynamic (unassigned) agents */}
            {agents.filter(a => !AGENT_DEPARTMENT[a.id]).length > 0 && (
              <div>
                <div className="px-2 py-1 text-[6px] tracking-[2px] font-bold text-gray-500">
                  DYNAMIC
                </div>
                {agents.filter(a => !AGENT_DEPARTMENT[a.id]).map(a => {
                  const st = statuses[a.id]?.status || "idle";
                  const isActive = ["working","thinking","coding","searching"].includes(st);
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
            )}
          </div>
        </aside>

        {/* CENTER: 3D */}
        <main className="flex-1 relative">
          <CoworkOffice3D agents={agents} statuses={statuses} events={events} />
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
              {/* Terminal output */}
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
            className="absolute bottom-4 right-4 w-12 h-12 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-lg shadow-lg hover:scale-110 transition-transform z-10">
            📋
          </button>
        </main>

        {/* RIGHT PANEL */}
        <aside className="w-[200px] border-l border-[#1a1f30] flex flex-col flex-shrink-0">
          <div className="px-3 py-2 text-[7px] text-gray-500 tracking-[2px] border-b border-[#1a1f3030] flex justify-between items-center">
            <span>EVENT FEED</span>
            <button onClick={async () => {
                if (autoStatus?.running) await stopAutonomousLoop();
                else await startAutonomousLoop();
                const s = await getAutonomousStatus();
                setAutoStatus(s);
              }}
              className={`text-[6px] px-2 py-0.5 rounded font-bold border ${
                autoStatus?.running
                  ? "bg-green-500/10 text-green-400 border-green-500/30"
                  : "bg-gray-500/10 text-gray-400 border-gray-500/30"
              }`}>
              {autoStatus?.running ? "▶ AUTO" : "⏸ AUTO"}
            </button>
          </div>
          {/* Server info */}
          <div className="px-3 py-2 border-b border-[#1a1f3030] space-y-1">
            <div className="flex justify-between items-center">
              <div className="text-[7px] text-gray-500">SERVER</div>
              <button onClick={() => setShowSettingsModal(true)}
                className="text-[6px] px-2 py-0.5 rounded bg-gray-500/10 text-gray-400 border border-gray-500/30 hover:bg-gray-500/20 font-bold">
                Settings
              </button>
            </div>
            <div className="text-[8px]">{info?.name} v{info?.version}</div>
            <div className="text-[8px] text-gray-400">Agents: {info?.agents} | Ticks: {autoStatus?.tick_count}</div>
          </div>
          {/* Events */}
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {events.length === 0 && <div className="text-center text-[8px] text-gray-600 py-8">Henüz event yok</div>}
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
        </aside>
      </div>

      {/* TASK MODAL */}
      {showTaskModal && <TaskModal agents={agents} onClose={() => setShowTaskModal(false)} />}
      {/* AGENT MODAL */}
      {showAgentModal && <AgentModal onClose={() => { setShowAgentModal(false); fetchAll(); }} />}
      {/* SETTINGS MODAL */}
      {showSettingsModal && <SettingsModal onClose={() => setShowSettingsModal(false)} />}
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
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center" onClick={onClose}>
      <div className="bg-[#0f1019] border border-[#fbbf2440] rounded-xl p-6 w-[420px]" onClick={e => e.stopPropagation()}>
        <h2 className="text-sm font-bold text-amber-400 mb-4">📋 Görev Oluştur</h2>
        <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Görev başlığı"
          className="w-full bg-[#0a0b12] border border-[#1e293b] text-white font-mono text-[10px] p-2 rounded mb-2" />
        <textarea value={desc} onChange={e => setDesc(e.target.value)} placeholder="Açıklama (opsiyonel)"
          className="w-full bg-[#0a0b12] border border-[#1e293b] text-white font-mono text-[10px] p-2 rounded mb-2 h-20 resize-none" />
        <div className="flex gap-2 mb-3">
          <select value={agent} onChange={e => setAgent(e.target.value)}
            className="flex-1 bg-[#0a0b12] border border-[#1e293b] text-white font-mono text-[10px] p-2 rounded">
            <option value="">🎯 Otomatik (Commander)</option>
            {agents.map(a => <option key={a.id} value={a.id}>{a.icon} {a.name}</option>)}
          </select>
          <select value={priority} onChange={e => setPriority(e.target.value)}
            className="w-24 bg-[#0a0b12] border border-[#1e293b] text-white font-mono text-[10px] p-2 rounded">
            <option>normal</option><option>high</option><option>urgent</option>
          </select>
        </div>
        <div className="flex gap-2">
          <button onClick={submit} className="px-4 py-2 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/30 text-[10px] font-bold">
            📋 Oluştur
          </button>
          <button onClick={onClose} className="px-4 py-2 rounded bg-gray-500/10 text-gray-400 border border-gray-500/30 text-[10px] font-bold">
            İptal
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
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center" onClick={onClose}>
      <div className="bg-[#0f1019] border border-[#fbbf2440] rounded-xl p-6 w-[420px]" onClick={e => e.stopPropagation()}>
        <h2 className="text-sm font-bold text-amber-400 mb-4">Settings</h2>

        {/* Provider Toggle */}
        <div className="text-[8px] text-gray-500 mb-1 tracking-wider">LLM PROVIDER</div>
        <div className="flex gap-2 mb-4">
          {(["anthropic", "gemini"] as const).map(p => (
            <button key={p} onClick={() => handleProviderChange(p)}
              className={`flex-1 text-[10px] py-2 rounded font-bold border transition-all ${
                activeProvider === p
                  ? "bg-amber-500/10 text-amber-400 border-amber-500/30"
                  : "bg-gray-500/5 text-gray-500 border-gray-500/20 hover:bg-gray-500/10"
              }`}>
              {p === "anthropic" ? "Claude (Anthropic)" : "Gemini (Google)"}
            </button>
          ))}
        </div>

        {/* Anthropic Key */}
        <div className="text-[8px] text-gray-500 mb-1 tracking-wider">
          ANTHROPIC API KEY
          {keyStatus?.anthropic?.set && <span className="text-green-400 ml-2">({keyStatus.anthropic.preview})</span>}
        </div>
        <div className="flex gap-2 mb-3">
          <input value={anthropicKey} onChange={e => setAnthropicKey(e.target.value)}
            type="password" placeholder="sk-ant-..."
            className="flex-1 bg-[#0a0b12] border border-[#1e293b] text-white font-mono text-[10px] p-2 rounded" />
          <button onClick={() => handleSaveKey("anthropic", anthropicKey)} disabled={saving || !anthropicKey}
            className="text-[9px] px-3 py-1 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/30 font-bold disabled:opacity-30">
            Kaydet
          </button>
        </div>

        {/* Gemini Key */}
        <div className="text-[8px] text-gray-500 mb-1 tracking-wider">
          GOOGLE API KEY
          {keyStatus?.gemini?.set && <span className="text-green-400 ml-2">({keyStatus.gemini.preview})</span>}
        </div>
        <div className="flex gap-2 mb-3">
          <input value={geminiKey} onChange={e => setGeminiKey(e.target.value)}
            type="password" placeholder="AIza..."
            className="flex-1 bg-[#0a0b12] border border-[#1e293b] text-white font-mono text-[10px] p-2 rounded" />
          <button onClick={() => handleSaveKey("gemini", geminiKey)} disabled={saving || !geminiKey}
            className="text-[9px] px-3 py-1 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/30 font-bold disabled:opacity-30">
            Kaydet
          </button>
        </div>

        {msg && <div className="text-[9px] text-amber-400 mb-3">{msg}</div>}

        <button onClick={onClose} className="px-4 py-2 rounded bg-gray-500/10 text-gray-400 border border-gray-500/30 text-[10px] font-bold">
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
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center" onClick={onClose}>
      <div className="bg-[#0f1019] border border-[#fbbf2440] rounded-xl p-6 w-[420px]" onClick={e => e.stopPropagation()}>
        <h2 className="text-sm font-bold text-amber-400 mb-4">+ Yeni Agent</h2>
        <div className="flex gap-2 mb-2">
          <input value={agentId} onChange={e => setAgentId(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
            placeholder="agent-id (orn: seo-expert)"
            className="flex-1 bg-[#0a0b12] border border-[#1e293b] text-white font-mono text-[10px] p-2 rounded" />
          <input value={icon} onChange={e => setIcon(e.target.value)} placeholder="Icon"
            className="w-14 bg-[#0a0b12] border border-[#1e293b] text-white text-center text-sm p-2 rounded" />
        </div>
        <input value={name} onChange={e => setName(e.target.value)} placeholder="Agent adi"
          className="w-full bg-[#0a0b12] border border-[#1e293b] text-white font-mono text-[10px] p-2 rounded mb-2" />
        <input value={domain} onChange={e => setDomain(e.target.value)} placeholder="Domain (orn: SEO & Content)"
          className="w-full bg-[#0a0b12] border border-[#1e293b] text-white font-mono text-[10px] p-2 rounded mb-2" />
        <textarea value={desc} onChange={e => setDesc(e.target.value)} placeholder="Aciklama"
          className="w-full bg-[#0a0b12] border border-[#1e293b] text-white font-mono text-[10px] p-2 rounded mb-2 h-16 resize-none" />
        <input value={skills} onChange={e => setSkills(e.target.value)} placeholder="Yetenekler (virgul ile ayirin)"
          className="w-full bg-[#0a0b12] border border-[#1e293b] text-white font-mono text-[10px] p-2 rounded mb-2" />
        <textarea value={systemPrompt} onChange={e => setSystemPrompt(e.target.value)} placeholder="System prompt (opsiyonel)"
          className="w-full bg-[#0a0b12] border border-[#1e293b] text-white font-mono text-[10px] p-2 rounded mb-3 h-16 resize-none" />
        <div className="flex gap-2">
          <button onClick={submit} disabled={!agentId || !name}
            className="px-4 py-2 rounded bg-amber-500/10 text-amber-400 border border-amber-500/30 text-[10px] font-bold disabled:opacity-30">
            + Olustur
          </button>
          <button onClick={onClose} className="px-4 py-2 rounded bg-gray-500/10 text-gray-400 border border-gray-500/30 text-[10px] font-bold">
            Iptal
          </button>
        </div>
      </div>
    </div>
  );
}
