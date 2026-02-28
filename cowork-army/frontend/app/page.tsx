"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import dynamic from "next/dynamic";
import { useToast } from "@/components/Toast";
import type {
    CoworkAgent,
    AgentStatus,
    AutonomousEvent,
    AutonomousStatus,
    ServerInfo,
} from "@/lib/cowork-api";
import {
    getCoworkAgents,
    getAgentStatuses,
    getAutonomousEvents,
    getAutonomousStatus,
    getServerInfo,
    startAutonomousLoop,
    stopAutonomousLoop,
    createCoworkTask,
    commanderDelegate,
    getApiKeyStatus,
    saveApiKey,
    getAgentOutput,
    spawnAgent,
    killAgent,
    createAgent,
    deleteAgent,
} from "@/lib/cowork-api";
import type { ApiKeyStatus, CreateAgentPayload } from "@/lib/cowork-api";

const CoworkOffice3D = dynamic(
    () => import("@/components/cowork-army/CoworkOffice3D"),
    {
        ssr: false,
        loading: () => (
            <div className="w-full h-full flex items-center justify-center bg-[#0a0a1a]">
                <div className="w-8 h-8 border-3 border-purple-500 border-t-transparent rounded-full animate-spin" />
            </div>
        ),
    }
);

const STATUS_DOT: Record<string, string> = {
    idle: "bg-gray-500",
    working: "bg-green-500 animate-pulse",
    searching: "bg-green-500 animate-pulse",
    thinking: "bg-blue-500 animate-pulse",
    coding: "bg-purple-500 animate-pulse",
    planning: "bg-yellow-500 animate-pulse",
    error: "bg-red-500",
    done: "bg-white",
};

export default function CoworkArmyPage() {
    const { showToast } = useToast();

    const [agents, setAgents] = useState<CoworkAgent[]>([]);
    const [statuses, setStatuses] = useState<Record<string, AgentStatus>>({});
    const [events, setEvents] = useState<AutonomousEvent[]>([]);
    const [autoStatus, setAutoStatus] = useState<AutonomousStatus | null>(null);
    const [serverInfo, setServerInfo] = useState<ServerInfo | null>(null);
    const [loading, setLoading] = useState(true);
    const [apiKeyStatus, setApiKeyStatus] = useState<ApiKeyStatus | null>(null);

    // Modal states
    const [showTaskModal, setShowTaskModal] = useState(false);
    const [selectedAgent, setSelectedAgent] = useState<CoworkAgent | null>(null);
    const [showApiKeyModal, setShowApiKeyModal] = useState(false);
    const [showCreateAgentModal, setShowCreateAgentModal] = useState(false);

    // Mobile panel toggle
    const [mobilePanel, setMobilePanel] = useState<"none" | "left" | "right">("none");

    // Initial load
    const fetchInitial = useCallback(async () => {
        try {
            const [agentsData, statusData, eventsData, autoData, infoData, keyData] =
                await Promise.all([
                    getCoworkAgents(),
                    getAgentStatuses(),
                    getAutonomousEvents(50),
                    getAutonomousStatus(),
                    getServerInfo(),
                    getApiKeyStatus(),
                ]);
            setAgents(agentsData);
            setStatuses(statusData);
            setEvents(eventsData);
            setAutoStatus(autoData);
            setServerInfo(infoData);
            setApiKeyStatus(keyData);
        } catch (e) {
            showToast(
                e instanceof Error ? e.message : "COWORK.ARMY backend'e bağlanılamadı",
                "error"
            );
        } finally {
            setLoading(false);
        }
    }, [showToast]);

    useEffect(() => {
        fetchInitial();
    }, [fetchInitial]);

    // 2s polling for statuses & events
    useEffect(() => {
        const interval = setInterval(async () => {
            try {
                const [statusData, eventsData, autoData] = await Promise.all([
                    getAgentStatuses(),
                    getAutonomousEvents(50),
                    getAutonomousStatus(),
                ]);
                setStatuses(statusData);
                setEvents(eventsData);
                setAutoStatus(autoData);
            } catch {
                // Silently ignore polling errors
            }
        }, 2000);
        return () => clearInterval(interval);
    }, []);

    const handleAutoToggle = async () => {
        try {
            if (autoStatus?.running) {
                await stopAutonomousLoop();
                showToast("Otonom döngü durduruldu", "info");
            } else {
                await startAutonomousLoop();
                showToast("Otonom döngü başlatıldı", "success");
            }
            const data = await getAutonomousStatus();
            setAutoStatus(data);
        } catch (e) {
            showToast(e instanceof Error ? e.message : "İşlem başarısız", "error");
        }
    };

    const getStatusStr = (agentId: string) => {
        const s = statuses[agentId];
        return s?.alive ? (s.status || "idle") : "idle";
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-screen bg-[#0a0a1a]">
                <div className="flex flex-col items-center gap-3">
                    <div className="w-8 h-8 border-3 border-purple-500 border-t-transparent rounded-full animate-spin" />
                    <p className="text-sm text-slate-500">COWORK.ARMY yükleniyor...</p>
                </div>
            </div>
        );
    }

    // Full-screen API Key setup when no key is configured
    if (apiKeyStatus && !apiKeyStatus.has_key) {
        return (
            <ApiKeySetupScreen
                onSaved={(masked) => {
                    setApiKeyStatus({ has_key: true, masked });
                    showToast("API Key kaydedildi! Sistem hazir.", "success");
                }}
            />
        );
    }

    return (
        <div className="flex h-screen gap-0 relative">
            {/* Mobile Top Bar */}
            <div className="md:hidden fixed top-0 left-0 right-0 z-40 bg-slate-900 border-b border-slate-700 flex items-center justify-between px-4 py-2">
                <button onClick={() => setMobilePanel(mobilePanel === "left" ? "none" : "left")} className="p-2 text-slate-400 hover:text-white">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
                </button>
                <span className="text-sm font-bold text-white">COWORK.ARMY</span>
                <button onClick={() => setMobilePanel(mobilePanel === "right" ? "none" : "right")} className="p-2 text-slate-400 hover:text-white">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
                </button>
            </div>

            {/* LEFT PANEL — Agent List */}
            <div className={`
                w-64 bg-slate-900 border-r border-slate-700 overflow-y-auto flex-shrink-0
                max-md:fixed max-md:inset-y-0 max-md:left-0 max-md:z-30 max-md:pt-12
                max-md:transition-transform max-md:duration-200
                ${mobilePanel === "left" ? "max-md:translate-x-0" : "max-md:-translate-x-full"}
            `}>
                <div className="px-4 py-3 border-b border-slate-700 flex items-center justify-between">
                    <h2 className="text-sm font-semibold text-white">Agents ({agents.length})</h2>
                    <button
                        onClick={() => setShowCreateAgentModal(true)}
                        className="px-2 py-1 rounded bg-orange-500/20 border border-orange-500/30 text-orange-400 text-[10px] font-semibold hover:bg-orange-500/30 transition-colors"
                    >
                        + Yeni
                    </button>
                </div>
                <div className="p-2 space-y-0.5">
                    {agents.map((agent) => {
                        const st = getStatusStr(agent.id);
                        const dotClass = STATUS_DOT[st] || STATUS_DOT.idle;
                        return (
                            <button
                                key={agent.id}
                                onClick={() => { setSelectedAgent(agent); setMobilePanel("none"); }}
                                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left hover:bg-slate-800 transition-colors"
                            >
                                <span className="text-base flex-shrink-0">{agent.icon}</span>
                                <div className="flex-1 min-w-0">
                                    <p className="text-xs font-medium text-slate-200 truncate">{agent.name}</p>
                                    <p className="text-[10px] text-slate-500 truncate">{agent.domain}</p>
                                </div>
                                <div className="flex items-center gap-1.5 flex-shrink-0">
                                    {!agent.is_base && (
                                        <span className="px-1 py-0.5 rounded text-[8px] bg-orange-500/20 text-orange-400 border border-orange-500/20">DYN</span>
                                    )}
                                    <span className={`w-2 h-2 rounded-full ${dotClass}`} />
                                </div>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Mobile overlay backdrop */}
            {mobilePanel !== "none" && (
                <div className="md:hidden fixed inset-0 bg-black/40 z-20" onClick={() => setMobilePanel("none")} />
            )}

            {/* CENTER — 3D Scene */}
            <div className="flex-1 relative overflow-hidden min-h-0 max-md:pt-12">
                <div className="absolute inset-0 max-md:top-12">
                    <CoworkOffice3D agents={agents} statuses={statuses} events={events} />
                </div>
                {agents.length === 0 && !loading && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
                        <div className="bg-red-500/20 backdrop-blur-sm border border-red-500/30 rounded-xl px-6 py-4 text-center pointer-events-auto">
                            <p className="text-red-400 text-sm font-semibold mb-1">Backend Baglantisi Yok</p>
                            <p className="text-red-300/70 text-xs">COWORK.ARMY sunucusu (port 8888) calismaiyor.</p>
                            <p className="text-red-300/70 text-xs mt-1">python cowork-army/server.py</p>
                        </div>
                    </div>
                )}
            </div>

            {/* RIGHT PANEL — Event Feed & Controls */}
            <div className={`
                w-72 bg-slate-900 border-l border-slate-700 overflow-y-auto flex-shrink-0 flex flex-col
                max-md:fixed max-md:inset-y-0 max-md:right-0 max-md:z-30 max-md:pt-12
                max-md:transition-transform max-md:duration-200
                ${mobilePanel === "right" ? "max-md:translate-x-0" : "max-md:translate-x-full"}
            `}>
                {/* API Key Status */}
                <div className="px-4 py-3 border-b border-slate-700">
                    <div className="flex items-center justify-between mb-2">
                        <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">API Key</h3>
                        <span className={`w-2 h-2 rounded-full ${apiKeyStatus?.has_key ? "bg-green-500" : "bg-red-500 animate-pulse"}`} />
                    </div>
                    {apiKeyStatus?.has_key ? (
                        <div className="flex items-center justify-between">
                            <p className="text-[11px] text-green-400 font-mono">{apiKeyStatus.masked}</p>
                            <button
                                onClick={() => setShowApiKeyModal(true)}
                                className="text-[10px] text-slate-500 hover:text-slate-300 transition-colors"
                            >
                                Değiştir
                            </button>
                        </div>
                    ) : (
                        <button
                            onClick={() => setShowApiKeyModal(true)}
                            className="w-full px-3 py-2 rounded-lg bg-amber-500/20 border border-amber-500/30 text-amber-400 text-xs font-medium hover:bg-amber-500/30 transition-colors"
                        >
                            🔑 API Key Gir
                        </button>
                    )}
                </div>

                {/* Server Info */}
                {serverInfo && (
                    <div className="px-4 py-3 border-b border-slate-700">
                        <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Server</h3>
                        <div className="space-y-1 text-xs text-slate-300">
                            <p>{serverInfo.name} <span className="text-slate-500">v{serverInfo.version}</span></p>
                            <p>Agents: <span className="text-white font-medium">{serverInfo.agents}</span></p>
                            <p>Bridge: <span className={serverInfo.bridge_connected ? "text-green-400" : "text-red-400"}>{serverInfo.bridge_connected ? `Bağlı (${serverInfo.bridge_count})` : "Bağlı değil"}</span></p>
                        </div>
                    </div>
                )}

                {/* Autonomous Control */}
                <div className="px-4 py-3 border-b border-slate-700">
                    <div className="flex items-center justify-between mb-2">
                        <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Otonom Döngü</h3>
                        <button
                            onClick={handleAutoToggle}
                            className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                                autoStatus?.running
                                    ? "bg-red-500/20 text-red-400 hover:bg-red-500/30"
                                    : "bg-green-500/20 text-green-400 hover:bg-green-500/30"
                            }`}
                        >
                            {autoStatus?.running ? "Durdur" : "Başlat"}
                        </button>
                    </div>
                    {autoStatus && (
                        <div className="text-[10px] text-slate-500 space-y-0.5">
                            <p>Tick: {autoStatus.tick_count} | Events: {autoStatus.total_events}</p>
                            <p>Tracked: {autoStatus.agents_tracked} agents</p>
                        </div>
                    )}
                </div>

                {/* Create Task Button */}
                <div className="px-4 py-3 border-b border-slate-700">
                    <button
                        onClick={() => setShowTaskModal(true)}
                        className="w-full px-3 py-2 rounded-lg bg-purple-600 text-white text-xs font-semibold hover:bg-purple-700 transition-colors"
                    >
                        + Görev Oluştur
                    </button>
                </div>

                {/* Event Feed */}
                <div className="flex-1 overflow-y-auto">
                    <div className="px-4 py-3">
                        <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Son Olaylar</h3>
                    </div>
                    <div className="px-2 pb-4 space-y-1">
                        {events.length === 0 ? (
                            <p className="px-2 text-xs text-slate-600 italic">Henüz olay yok</p>
                        ) : (
                            events.slice(0, 30).map((ev, i) => (
                                <div key={i} className="px-2 py-1.5 rounded text-[11px]">
                                    <div className="flex items-center gap-1.5 mb-0.5">
                                        <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                                            ev.type === "warning" ? "bg-yellow-400" :
                                            ev.type === "task_created" ? "bg-green-400" :
                                            ev.type === "self_improve" ? "bg-purple-400" :
                                            "bg-slate-500"
                                        }`} />
                                        <span className="text-slate-400 font-medium">{ev.agent_id}</span>
                                        <span className="text-slate-600 text-[9px] ml-auto">
                                            {new Date(ev.timestamp).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                                        </span>
                                    </div>
                                    <p className="text-slate-300 pl-3">{ev.message}</p>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>

            {/* Agent Detail Modal with Terminal */}
            {selectedAgent && (
                <AgentDetailModal
                    agent={selectedAgent}
                    status={getStatusStr(selectedAgent.id)}
                    agentStatus={statuses[selectedAgent.id]}
                    onClose={() => setSelectedAgent(null)}
                    onDeleted={async () => {
                        const agentsData = await getCoworkAgents();
                        setAgents(agentsData);
                    }}
                />
            )}

            {/* Create Task Modal */}
            {showTaskModal && (
                <CreateTaskModal
                    agents={agents}
                    onClose={() => setShowTaskModal(false)}
                    onCreated={async () => {
                        setShowTaskModal(false);
                        showToast("Gorev olusturuldu", "success");
                        const agentsData = await getCoworkAgents();
                        setAgents(agentsData);
                    }}
                />
            )}

            {/* API Key Modal */}
            {showApiKeyModal && (
                <ApiKeyModal
                    currentMasked={apiKeyStatus?.masked || ""}
                    onClose={() => setShowApiKeyModal(false)}
                    onSaved={(masked) => {
                        setApiKeyStatus({ has_key: true, masked });
                        setShowApiKeyModal(false);
                        showToast("API Key kaydedildi", "success");
                    }}
                />
            )}

            {/* Create Agent Modal */}
            {showCreateAgentModal && (
                <CreateAgentModal
                    onClose={() => setShowCreateAgentModal(false)}
                    onCreated={async () => {
                        setShowCreateAgentModal(false);
                        showToast("Agent olusturuldu", "success");
                        const agentsData = await getCoworkAgents();
                        setAgents(agentsData);
                    }}
                />
            )}
        </div>
    );
}

// ──────────────────────────────────────────────────
// Agent Detail Modal with Terminal
// ──────────────────────────────────────────────────

function AgentDetailModal({
    agent,
    status,
    agentStatus,
    onClose,
    onDeleted,
}: {
    agent: CoworkAgent;
    status: string;
    agentStatus?: AgentStatus;
    onClose: () => void;
    onDeleted?: () => void;
}) {
    const { showToast } = useToast();
    const [activeTab, setActiveTab] = useState<"info" | "terminal">("terminal");
    const [outputLines, setOutputLines] = useState<string[]>([]);
    const [loadingOutput, setLoadingOutput] = useState(false);
    const [spawning, setSpawning] = useState(false);
    const [killing, setKilling] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [spawnTask, setSpawnTask] = useState("");
    const terminalRef = useRef<HTMLDivElement>(null);

    const isAlive = agentStatus?.alive ?? false;

    // Fetch output on mount and poll every 2s
    useEffect(() => {
        let cancelled = false;
        const fetchOutput = async () => {
            try {
                const data = await getAgentOutput(agent.id);
                if (!cancelled) {
                    setOutputLines(data.lines);
                    setLoadingOutput(false);
                }
            } catch {
                if (!cancelled) setLoadingOutput(false);
            }
        };
        setLoadingOutput(true);
        fetchOutput();
        const interval = setInterval(fetchOutput, 2000);
        return () => { cancelled = true; clearInterval(interval); };
    }, [agent.id]);

    // Auto-scroll terminal to bottom
    useEffect(() => {
        if (terminalRef.current) {
            terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
        }
    }, [outputLines]);

    const handleSpawn = async () => {
        setSpawning(true);
        try {
            await spawnAgent(agent.id, spawnTask || undefined);
            showToast(`${agent.name} başlatıldı`, "success");
            setSpawnTask("");
        } catch (err) {
            showToast(err instanceof Error ? err.message : "Spawn başarısız", "error");
        } finally {
            setSpawning(false);
        }
    };

    const handleKill = async () => {
        setKilling(true);
        try {
            await killAgent(agent.id);
            showToast(`${agent.name} durduruldu`, "info");
        } catch (err) {
            showToast(err instanceof Error ? err.message : "Kill basarisiz", "error");
        } finally {
            setKilling(false);
        }
    };

    const handleDelete = async () => {
        if (!confirm(`"${agent.name}" agentini silmek istediginize emin misiniz?`)) return;
        setDeleting(true);
        try {
            await deleteAgent(agent.id);
            showToast(`${agent.name} silindi`, "info");
            onDeleted?.();
            onClose();
        } catch (err) {
            showToast(err instanceof Error ? err.message : "Silme basarisiz", "error");
        } finally {
            setDeleting(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={onClose}>
            <div
                className="bg-slate-900 rounded-2xl border border-slate-700 shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="px-6 py-4 border-b border-slate-700 flex items-center justify-between flex-shrink-0">
                    <div className="flex items-center gap-3">
                        <span className="text-2xl">{agent.icon}</span>
                        <div>
                            <h3 className="font-semibold text-white">{agent.name}</h3>
                            <p className="text-xs text-slate-400">{agent.tier} • {agent.domain}</p>
                        </div>
                        <span className={`ml-2 px-2 py-0.5 rounded-full text-[10px] font-medium ${
                            isAlive
                                ? "bg-green-500/20 text-green-400 border border-green-500/30"
                                : "bg-slate-700 text-slate-400 border border-slate-600"
                        }`}>
                            {isAlive ? status : "idle"}
                        </span>
                    </div>
                    <div className="flex items-center gap-2">
                        {!agent.is_base && (
                            <button
                                onClick={handleDelete}
                                disabled={deleting}
                                className="px-2 py-1 rounded bg-red-500/20 border border-red-500/30 text-red-400 text-[10px] font-medium hover:bg-red-500/30 disabled:opacity-50 transition-colors"
                            >
                                {deleting ? "..." : "Sil"}
                            </button>
                        )}
                        <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-white">
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-slate-700 flex-shrink-0">
                    <button
                        onClick={() => setActiveTab("terminal")}
                        className={`flex-1 px-4 py-2.5 text-xs font-medium transition-colors ${
                            activeTab === "terminal"
                                ? "text-green-400 border-b-2 border-green-400 bg-slate-800/50"
                                : "text-slate-400 hover:text-white"
                        }`}
                    >
                        Terminal
                    </button>
                    <button
                        onClick={() => setActiveTab("info")}
                        className={`flex-1 px-4 py-2.5 text-xs font-medium transition-colors ${
                            activeTab === "info"
                                ? "text-purple-400 border-b-2 border-purple-400 bg-slate-800/50"
                                : "text-slate-400 hover:text-white"
                        }`}
                    >
                        Bilgi & Yetenekler
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-hidden flex flex-col min-h-0">
                    {activeTab === "terminal" ? (
                        <>
                            {/* Terminal Output */}
                            <div
                                ref={terminalRef}
                                className="flex-1 overflow-y-auto bg-[#0d1117] p-4 font-mono text-xs leading-relaxed"
                            >
                                {loadingOutput && outputLines.length === 0 ? (
                                    <p className="text-slate-600 italic">Yükleniyor...</p>
                                ) : outputLines.length === 0 ? (
                                    <div className="text-slate-600 space-y-1">
                                        <p>$ agent --id {agent.id} --status idle</p>
                                        <p className="text-slate-500">Henüz output yok. Agent&apos;ı başlatmak için aşağıdaki spawn butonunu kullanın.</p>
                                    </div>
                                ) : (
                                    outputLines.map((line, i) => {
                                        let lineColor = "text-slate-300";
                                        if (line.startsWith("[TOOL]") || line.startsWith("[tool_use]")) lineColor = "text-cyan-400";
                                        else if (line.startsWith("[RESULT]") || line.startsWith("[tool_result]")) lineColor = "text-yellow-400";
                                        else if (line.startsWith("[RESPONSE]") || line.startsWith("[text]")) lineColor = "text-green-400";
                                        else if (line.startsWith("[ERROR]") || line.toLowerCase().includes("error")) lineColor = "text-red-400";
                                        else if (line.startsWith("[STATUS]") || line.startsWith("[Round")) lineColor = "text-purple-400";
                                        else if (line.startsWith("─") || line.startsWith("═")) lineColor = "text-slate-600";
                                        return (
                                            <div key={i} className={`${lineColor} whitespace-pre-wrap break-all`}>
                                                {line}
                                            </div>
                                        );
                                    })
                                )}
                                {isAlive && (
                                    <div className="text-green-500 animate-pulse mt-1">▌</div>
                                )}
                            </div>

                            {/* Spawn / Kill Controls */}
                            <div className="flex-shrink-0 border-t border-slate-700 px-4 py-3 bg-slate-800/50">
                                {!isAlive ? (
                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            value={spawnTask}
                                            onChange={(e) => setSpawnTask(e.target.value)}
                                            placeholder="Görev açıklaması (opsiyonel)..."
                                            className="flex-1 px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-green-500/30 focus:border-green-500"
                                            onKeyDown={(e) => { if (e.key === "Enter") handleSpawn(); }}
                                        />
                                        <button
                                            onClick={handleSpawn}
                                            disabled={spawning}
                                            className="px-4 py-2 rounded-lg bg-green-600 text-white text-xs font-semibold hover:bg-green-700 disabled:opacity-50 transition-colors whitespace-nowrap"
                                        >
                                            {spawning ? "Başlatılıyor..." : "Spawn"}
                                        </button>
                                    </div>
                                ) : (
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                                            <span className="text-xs text-green-400 font-medium">Çalışıyor — {status}</span>
                                            {agentStatus?.started_at && (
                                                <span className="text-[10px] text-slate-500">
                                                    ({new Date(agentStatus.started_at).toLocaleTimeString("tr-TR")})
                                                </span>
                                            )}
                                        </div>
                                        <button
                                            onClick={handleKill}
                                            disabled={killing}
                                            className="px-4 py-2 rounded-lg bg-red-600/20 border border-red-500/30 text-red-400 text-xs font-semibold hover:bg-red-600/30 disabled:opacity-50 transition-colors"
                                        >
                                            {killing ? "Durduruluyor..." : "Durdur"}
                                        </button>
                                    </div>
                                )}
                            </div>
                        </>
                    ) : (
                        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
                            <div>
                                <p className="text-xs text-slate-500 mb-1">Açıklama</p>
                                <p className="text-sm text-slate-300">{agent.desc}</p>
                            </div>
                            <div>
                                <p className="text-xs text-slate-500 mb-1">Çalışma Dizini</p>
                                <p className="text-xs text-slate-300 font-mono bg-slate-800 px-3 py-1.5 rounded">{agent.workspace_path || agent.workspace_dir}</p>
                            </div>
                            {agent.skills.length > 0 && (
                                <div>
                                    <p className="text-xs text-slate-500 mb-1">Yetenekler</p>
                                    <div className="flex flex-wrap gap-1">
                                        {agent.skills.map((s) => (
                                            <span key={s} className="px-2 py-0.5 rounded-full bg-slate-800 text-[10px] text-slate-300 border border-slate-700">{s}</span>
                                        ))}
                                    </div>
                                </div>
                            )}
                            {agent.rules.length > 0 && (
                                <div>
                                    <p className="text-xs text-slate-500 mb-1">Kurallar</p>
                                    <ul className="space-y-1">
                                        {agent.rules.map((r, i) => (
                                            <li key={i} className="text-[11px] text-slate-400 flex gap-1.5">
                                                <span className="text-slate-600 flex-shrink-0">•</span>
                                                <span>{r}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

// ──────────────────────────────────────────────────
// Create Task Modal
// ──────────────────────────────────────────────────

function CreateTaskModal({
    agents,
    onClose,
    onCreated,
}: {
    agents: CoworkAgent[];
    onClose: () => void;
    onCreated: () => void;
}) {
    const { showToast } = useToast();
    const [mode, setMode] = useState<"auto" | "manual">("auto");
    const [form, setForm] = useState({ title: "", description: "", assigned_to: "", priority: "medium" });
    const [submitting, setSubmitting] = useState(false);
    const [delegateResult, setDelegateResult] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.title) return;
        if (mode === "manual" && !form.assigned_to) return;
        setSubmitting(true);
        setDelegateResult(null);
        try {
            if (mode === "auto") {
                const result = await commanderDelegate(form.title, form.description, form.priority, true);
                const createdTag = result.agent_created ? " [YENI AGENT]" : "";
                setDelegateResult(`${result.agent_name} (${result.routed_to}) ${result.spawned ? "spawn edildi" : "kuyruga eklendi"}${createdTag}`);
                showToast(`Commander: ${result.routed_to} atandi${createdTag}`, "success");
                setTimeout(() => onCreated(), 1500);
            } else {
                await createCoworkTask(form.title, form.description, form.assigned_to, form.priority);
                onCreated();
            }
        } catch (err) {
            showToast(err instanceof Error ? err.message : "Görev oluşturulamadı", "error");
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
            <div className="bg-slate-900 rounded-2xl border border-slate-700 shadow-xl w-full max-w-md" onClick={(e) => e.stopPropagation()}>
                <div className="px-6 py-4 border-b border-slate-700 flex items-center justify-between">
                    <h3 className="font-semibold text-white">Yeni Görev</h3>
                    <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-white">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>
                <form onSubmit={handleSubmit} className="px-6 py-4 space-y-4">
                    {/* Mode Toggle */}
                    <div className="flex rounded-lg bg-slate-800 p-0.5">
                        <button
                            type="button"
                            onClick={() => setMode("auto")}
                            className={`flex-1 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                                mode === "auto" ? "bg-purple-600 text-white" : "text-slate-400 hover:text-white"
                            }`}
                        >
                            Commander Auto-Route
                        </button>
                        <button
                            type="button"
                            onClick={() => setMode("manual")}
                            className={`flex-1 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                                mode === "manual" ? "bg-slate-600 text-white" : "text-slate-400 hover:text-white"
                            }`}
                        >
                            Manuel Atama
                        </button>
                    </div>

                    {mode === "auto" && (
                        <p className="text-[11px] text-purple-400/80">
                            Commander görevi analiz edip en uygun agent&apos;a otomatik yönlendirir ve spawn eder.
                        </p>
                    )}

                    <div>
                        <label className="block text-xs text-slate-400 mb-1">Başlık</label>
                        <input
                            type="text"
                            value={form.title}
                            onChange={(e) => setForm({ ...form, title: e.target.value })}
                            className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500/30 focus:border-purple-500"
                            placeholder={mode === "auto" ? "Ne yapılmasını istiyorsun?" : "Görev başlığı..."}
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-xs text-slate-400 mb-1">Açıklama</label>
                        <textarea
                            value={form.description}
                            onChange={(e) => setForm({ ...form, description: e.target.value })}
                            className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500/30 focus:border-purple-500 resize-none"
                            rows={3}
                            placeholder="Görev detayları..."
                        />
                    </div>

                    {mode === "manual" && (
                        <div>
                            <label className="block text-xs text-slate-400 mb-1">Atanan Agent</label>
                            <select
                                value={form.assigned_to}
                                onChange={(e) => setForm({ ...form, assigned_to: e.target.value })}
                                className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-sm text-white focus:outline-none focus:ring-2 focus:ring-purple-500/30 focus:border-purple-500"
                                required
                            >
                                <option value="">Agent seçin...</option>
                                {agents.map((a) => (
                                    <option key={a.id} value={a.id}>{a.icon} {a.name}</option>
                                ))}
                            </select>
                        </div>
                    )}

                    <div>
                        <label className="block text-xs text-slate-400 mb-1">Öncelik</label>
                        <select
                            value={form.priority}
                            onChange={(e) => setForm({ ...form, priority: e.target.value })}
                            className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-sm text-white focus:outline-none focus:ring-2 focus:ring-purple-500/30 focus:border-purple-500"
                        >
                            <option value="low">Düşük</option>
                            <option value="medium">Orta</option>
                            <option value="high">Yüksek</option>
                            <option value="critical">Kritik</option>
                        </select>
                    </div>

                    {delegateResult && (
                        <div className="px-3 py-2 rounded-lg bg-green-500/10 border border-green-500/20 text-xs text-green-400">
                            {delegateResult}
                        </div>
                    )}

                    <div className="flex justify-end gap-2 pt-2">
                        <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg text-sm text-slate-400 hover:text-white transition-colors">
                            İptal
                        </button>
                        <button
                            type="submit"
                            disabled={submitting}
                            className={`px-4 py-2 rounded-lg text-white text-sm font-semibold disabled:opacity-50 transition-colors ${
                                mode === "auto"
                                    ? "bg-purple-600 hover:bg-purple-700"
                                    : "bg-slate-600 hover:bg-slate-700"
                            }`}
                        >
                            {submitting ? "İşleniyor..." : mode === "auto" ? "Commander'a Gönder" : "Oluştur"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

// ──────────────────────────────────────────────────
// API Key Modal
// ──────────────────────────────────────────────────

function ApiKeyModal({
    currentMasked,
    onClose,
    onSaved,
}: {
    currentMasked: string;
    onClose: () => void;
    onSaved: (masked: string) => void;
}) {
    const { showToast } = useToast();
    const [key, setKey] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const [showKey, setShowKey] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const trimmed = key.trim();
        if (!trimmed) return;
        setSubmitting(true);
        try {
            const result = await saveApiKey(trimmed);
            onSaved(result.masked);
        } catch (err) {
            showToast(err instanceof Error ? err.message : "API key kaydedilemedi", "error");
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
            <div className="bg-slate-900 rounded-2xl border border-slate-700 shadow-xl w-full max-w-md" onClick={(e) => e.stopPropagation()}>
                <div className="px-6 py-4 border-b border-slate-700 flex items-center justify-between">
                    <h3 className="font-semibold text-white">Anthropic API Key</h3>
                    <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-white">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>
                <form onSubmit={handleSubmit} className="px-6 py-4 space-y-4">
                    {currentMasked && (
                        <div className="px-3 py-2 rounded-lg bg-slate-800 border border-slate-700">
                            <p className="text-[10px] text-slate-500 mb-1">Mevcut Key</p>
                            <p className="text-xs text-green-400 font-mono">{currentMasked}</p>
                        </div>
                    )}
                    <div>
                        <label className="block text-xs text-slate-400 mb-1">
                            {currentMasked ? "Yeni API Key" : "API Key"}
                        </label>
                        <div className="relative">
                            <input
                                type={showKey ? "text" : "password"}
                                value={key}
                                onChange={(e) => setKey(e.target.value)}
                                className="w-full px-3 py-2.5 pr-10 rounded-lg bg-slate-800 border border-slate-700 text-sm text-white font-mono placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500"
                                placeholder="sk-ant-api03-..."
                                autoComplete="off"
                                required
                            />
                            <button
                                type="button"
                                onClick={() => setShowKey(!showKey)}
                                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-500 hover:text-slate-300"
                            >
                                {showKey ? (
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>
                                ) : (
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                                )}
                            </button>
                        </div>
                        <p className="text-[10px] text-slate-500 mt-1.5">
                            Key .env dosyasina kaydedilir. Agent&apos;lar bu key ile Claude API&apos;yi kullanir.
                        </p>
                    </div>
                    <div className="flex justify-end gap-2 pt-2">
                        <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg text-sm text-slate-400 hover:text-white transition-colors">
                            İptal
                        </button>
                        <button
                            type="submit"
                            disabled={submitting || !key.trim()}
                            className="px-4 py-2 rounded-lg bg-amber-500 text-black text-sm font-semibold hover:bg-amber-400 disabled:opacity-50 transition-colors"
                        >
                            {submitting ? "Kaydediliyor..." : "Kaydet"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

// ──────────────────────────────────────────────────
// Create Agent Modal
// ──────────────────────────────────────────────────

function CreateAgentModal({
    onClose,
    onCreated,
}: {
    onClose: () => void;
    onCreated: () => void;
}) {
    const { showToast } = useToast();
    const [submitting, setSubmitting] = useState(false);
    const [form, setForm] = useState<CreateAgentPayload>({
        name: "",
        icon: "\u{1F916}",
        tier: "WORKER",
        color: "#f97316",
        domain: "",
        desc: "",
        skills: [],
        rules: [],
        workspace_dir: ".",
        triggers: [],
        system_prompt: "",
    });
    const [skillInput, setSkillInput] = useState("");
    const [triggerInput, setTriggerInput] = useState("");

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.name.trim()) return;
        setSubmitting(true);
        try {
            await createAgent({
                ...form,
                system_prompt: form.system_prompt || `Sen ${form.name} agentsin. ${form.desc}. Workspace'indeki dosyalari oku, analiz et ve sonuclari raporla. Turkce yanit ver.`,
            });
            onCreated();
        } catch (err) {
            showToast(err instanceof Error ? err.message : "Agent olusturulamadi", "error");
        } finally {
            setSubmitting(false);
        }
    };

    const addSkill = () => {
        const s = skillInput.trim();
        if (s && !form.skills.includes(s)) {
            setForm({ ...form, skills: [...form.skills, s] });
            setSkillInput("");
        }
    };

    const addTrigger = () => {
        const t = triggerInput.trim();
        if (t && !form.triggers.includes(t)) {
            setForm({ ...form, triggers: [...form.triggers, t] });
            setTriggerInput("");
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
            <div className="bg-slate-900 rounded-2xl border border-slate-700 shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
                <div className="px-6 py-4 border-b border-slate-700 flex items-center justify-between sticky top-0 bg-slate-900 z-10">
                    <h3 className="font-semibold text-white">Yeni Agent Olustur</h3>
                    <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-white">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>
                <form onSubmit={handleSubmit} className="px-6 py-4 space-y-4">
                    <div className="grid grid-cols-[1fr_auto] gap-3">
                        <div>
                            <label className="block text-xs text-slate-400 mb-1">Agent Adi *</label>
                            <input
                                type="text"
                                value={form.name}
                                onChange={(e) => setForm({ ...form, name: e.target.value })}
                                className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500"
                                placeholder="Data Analyst Agent"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-xs text-slate-400 mb-1">Icon</label>
                            <input
                                type="text"
                                value={form.icon}
                                onChange={(e) => setForm({ ...form, icon: e.target.value })}
                                className="w-16 px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-sm text-center focus:outline-none focus:ring-2 focus:ring-orange-500/30"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs text-slate-400 mb-1">Tier</label>
                            <select
                                value={form.tier}
                                onChange={(e) => setForm({ ...form, tier: e.target.value })}
                                className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-sm text-white focus:outline-none focus:ring-2 focus:ring-orange-500/30"
                            >
                                <option value="WORKER">WORKER</option>
                                <option value="DIRECTOR">DIRECTOR</option>
                                <option value="SUPERVISOR">SUPERVISOR</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs text-slate-400 mb-1">Renk</label>
                            <input
                                type="color"
                                value={form.color}
                                onChange={(e) => setForm({ ...form, color: e.target.value })}
                                className="w-full h-[38px] rounded-lg bg-slate-800 border border-slate-700 cursor-pointer"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs text-slate-400 mb-1">Domain / Alan</label>
                        <input
                            type="text"
                            value={form.domain}
                            onChange={(e) => setForm({ ...form, domain: e.target.value })}
                            className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-orange-500/30"
                            placeholder="Data Analysis / Reporting"
                        />
                    </div>

                    <div>
                        <label className="block text-xs text-slate-400 mb-1">Aciklama</label>
                        <textarea
                            value={form.desc}
                            onChange={(e) => setForm({ ...form, desc: e.target.value })}
                            className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-orange-500/30 resize-none"
                            rows={2}
                            placeholder="Bu agent ne yapar?"
                        />
                    </div>

                    <div>
                        <label className="block text-xs text-slate-400 mb-1">Calisma Dizini</label>
                        <input
                            type="text"
                            value={form.workspace_dir}
                            onChange={(e) => setForm({ ...form, workspace_dir: e.target.value })}
                            className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-sm text-white font-mono placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-orange-500/30"
                            placeholder="."
                        />
                    </div>

                    {/* Skills */}
                    <div>
                        <label className="block text-xs text-slate-400 mb-1">Yetenekler</label>
                        <div className="flex gap-2 mb-2">
                            <input
                                type="text"
                                value={skillInput}
                                onChange={(e) => setSkillInput(e.target.value)}
                                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addSkill(); } }}
                                className="flex-1 px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-orange-500/30"
                                placeholder="Yetenek ekle..."
                            />
                            <button type="button" onClick={addSkill} className="px-3 py-1.5 rounded-lg bg-slate-700 text-xs text-white hover:bg-slate-600">+</button>
                        </div>
                        {form.skills.length > 0 && (
                            <div className="flex flex-wrap gap-1">
                                {form.skills.map((s, i) => (
                                    <span key={i} className="px-2 py-0.5 rounded-full bg-slate-800 text-[10px] text-slate-300 border border-slate-700 flex items-center gap-1">
                                        {s}
                                        <button type="button" onClick={() => setForm({ ...form, skills: form.skills.filter((_, j) => j !== i) })} className="text-slate-500 hover:text-red-400">&times;</button>
                                    </span>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Triggers */}
                    <div>
                        <label className="block text-xs text-slate-400 mb-1">Tetikleyiciler (Anahtar Kelimeler)</label>
                        <div className="flex gap-2 mb-2">
                            <input
                                type="text"
                                value={triggerInput}
                                onChange={(e) => setTriggerInput(e.target.value)}
                                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addTrigger(); } }}
                                className="flex-1 px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-orange-500/30"
                                placeholder="Anahtar kelime ekle..."
                            />
                            <button type="button" onClick={addTrigger} className="px-3 py-1.5 rounded-lg bg-slate-700 text-xs text-white hover:bg-slate-600">+</button>
                        </div>
                        {form.triggers.length > 0 && (
                            <div className="flex flex-wrap gap-1">
                                {form.triggers.map((t, i) => (
                                    <span key={i} className="px-2 py-0.5 rounded-full bg-orange-500/20 text-[10px] text-orange-300 border border-orange-500/20 flex items-center gap-1">
                                        {t}
                                        <button type="button" onClick={() => setForm({ ...form, triggers: form.triggers.filter((_, j) => j !== i) })} className="text-orange-400 hover:text-red-400">&times;</button>
                                    </span>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* System Prompt */}
                    <div>
                        <label className="block text-xs text-slate-400 mb-1">System Prompt (opsiyonel)</label>
                        <textarea
                            value={form.system_prompt}
                            onChange={(e) => setForm({ ...form, system_prompt: e.target.value })}
                            className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-orange-500/30 resize-none font-mono"
                            rows={3}
                            placeholder="Bos birakilirsa otomatik olusturulur..."
                        />
                    </div>

                    <div className="flex justify-end gap-2 pt-2">
                        <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg text-sm text-slate-400 hover:text-white transition-colors">
                            Iptal
                        </button>
                        <button
                            type="submit"
                            disabled={submitting || !form.name.trim()}
                            className="px-4 py-2 rounded-lg bg-orange-500 text-white text-sm font-semibold hover:bg-orange-600 disabled:opacity-50 transition-colors"
                        >
                            {submitting ? "Olusturuluyor..." : "Agent Olustur"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

// ──────────────────────────────────────────────────
// Full-Screen API Key Setup
// ──────────────────────────────────────────────────

function ApiKeySetupScreen({ onSaved }: { onSaved: (masked: string) => void }) {
    const { showToast } = useToast();
    const [key, setKey] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const [showKey, setShowKey] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const trimmed = key.trim();
        if (!trimmed) return;
        if (!trimmed.startsWith("sk-ant-")) {
            showToast("Gecersiz format. Key 'sk-ant-' ile baslamali.", "error");
            return;
        }
        setSubmitting(true);
        try {
            const result = await saveApiKey(trimmed);
            onSaved(result.masked);
        } catch (err) {
            showToast(err instanceof Error ? err.message : "API key kaydedilemedi", "error");
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#0a0a1a] flex items-center justify-center p-4">
            <div className="w-full max-w-lg">
                {/* Logo / Header */}
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-purple-600 to-amber-500 mb-4">
                        <svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25a3 3 0 013 3m3 0a6 6 0 01-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1121.75 8.25z" />
                        </svg>
                    </div>
                    <h1 className="text-2xl font-bold text-white mb-2">COWORK.ARMY</h1>
                    <p className="text-sm text-slate-400">
                        AI Agent ordunuzu baslatmak icin Anthropic API Key gerekli.
                    </p>
                </div>

                {/* Card */}
                <div className="bg-slate-900 rounded-2xl border border-slate-700 shadow-2xl overflow-hidden">
                    {/* Steps indicator */}
                    <div className="px-6 py-4 bg-slate-800/50 border-b border-slate-700">
                        <div className="flex items-center gap-3">
                            <div className="flex items-center gap-2">
                                <span className="w-6 h-6 rounded-full bg-amber-500 text-black text-xs font-bold flex items-center justify-center">1</span>
                                <span className="text-xs font-medium text-white">API Key</span>
                            </div>
                            <div className="flex-1 h-px bg-slate-700" />
                            <div className="flex items-center gap-2">
                                <span className="w-6 h-6 rounded-full bg-slate-700 text-slate-400 text-xs font-bold flex items-center justify-center">2</span>
                                <span className="text-xs text-slate-500">Hazir</span>
                            </div>
                        </div>
                    </div>

                    <form onSubmit={handleSubmit} className="px-6 py-6 space-y-5">
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">
                                Anthropic API Key
                            </label>
                            <div className="relative">
                                <input
                                    type={showKey ? "text" : "password"}
                                    value={key}
                                    onChange={(e) => setKey(e.target.value)}
                                    className="w-full px-4 py-3 pr-12 rounded-xl bg-slate-800 border border-slate-600 text-sm text-white font-mono placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500 transition-colors"
                                    placeholder="sk-ant-api03-..."
                                    autoComplete="off"
                                    autoFocus
                                    required
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowKey(!showKey)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-500 hover:text-slate-300 transition-colors"
                                >
                                    {showKey ? (
                                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>
                                    ) : (
                                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                                    )}
                                </button>
                            </div>
                            <p className="text-[11px] text-slate-500 mt-2">
                                console.anthropic.com adresinden API key olusturabilirsiniz.
                            </p>
                        </div>

                        {/* Info box */}
                        <div className="px-4 py-3 rounded-xl bg-purple-500/10 border border-purple-500/20">
                            <div className="flex gap-3">
                                <svg className="w-5 h-5 text-purple-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                <div className="text-xs text-purple-300/80 space-y-1">
                                    <p>Key sunucu tarafinda <strong>.env</strong> dosyasina kaydedilir.</p>
                                    <p>15 AI agent bu key ile Claude API&apos;yi kullanarak gorevleri yerine getirir.</p>
                                </div>
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={submitting || !key.trim()}
                            className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-black text-sm font-bold hover:from-amber-400 hover:to-orange-400 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                        >
                            {submitting ? (
                                <span className="flex items-center justify-center gap-2">
                                    <span className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                                    Kaydediliyor...
                                </span>
                            ) : (
                                "Baslat"
                            )}
                        </button>
                    </form>
                </div>

                {/* Footer */}
                <p className="text-center text-[10px] text-slate-600 mt-6">
                    COWORK.ARMY v5.3 — 15 base + dinamik agent destegi
                </p>
            </div>
        </div>
    );
}
