"use client";
/**
 * COWORK.ARMY — Silicon Valley HQ Dashboard
 * Canlı agent ordusu izleme merkezi
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
  createCoworkTask, spawnAgent,
} from "@/lib/cowork-api";
import { useAuth } from "@/lib/auth-context";

type MobileMainTab = "dashboard" | "activity";

// ─── CEO API ─────────────────────────────────────────────────────────────────

async function getCeoStatus(): Promise<{ agent_id: string; current_task: string | null; is_active: boolean; tick_count: number; last_run?: string }> {
  const base = process.env.NEXT_PUBLIC_COWORK_API_URL || "";
  const res = await fetch(`${base}/cowork-api/agents/ceo/status`, { cache: "no-store" }).catch(() => null);
  if (!res || !res.ok) return { agent_id: "ceo", current_task: null, is_active: false, tick_count: 0 };
  return res.json();
}

async function triggerCeo(): Promise<void> {
  const base = process.env.NEXT_PUBLIC_COWORK_API_URL || "";
  await fetch(`${base}/cowork-api/agents/ceo/trigger`, { method: "POST" }).catch(() => null);
}

// ─── Sabitler ─────────────────────────────────────────────────────────────────

const DEPT_META: Record<string, { color: string; icon: string; gradient: string; bgColor: string }> = {
  trade:    { color: "#00ff88", icon: "📈", gradient: "from-emerald-500/10 to-green-600/5", bgColor: "#00ff8812" },
  medical:  { color: "#00ccff", icon: "🏥", gradient: "from-cyan-500/10 to-blue-600/5", bgColor: "#00ccff12" },
  hotel:    { color: "#ffaa00", icon: "🏨", gradient: "from-amber-500/10 to-orange-600/5", bgColor: "#ffaa0012" },
  software: { color: "#cc44ff", icon: "💻", gradient: "from-purple-500/10 to-violet-600/5", bgColor: "#cc44ff12" },
  bots:     { color: "#ff4466", icon: "🤖", gradient: "from-rose-500/10 to-red-600/5", bgColor: "#ff446612" },
};

const STATUS_LABELS: Record<string, string> = {
  working: "Çalışıyor",
  thinking: "Düşünüyor",
  coding: "Kodluyor",
  searching: "Arıyor",
  running: "Çalışıyor",
  idle: "Bekliyor",
  error: "Hata",
  done: "Tamamlandı",
};

const ACTIVE_STATUSES = ["working", "thinking", "coding", "searching", "running"];

// ─── Aktivite öğesi tipi ──────────────────────────────────────────────────────

interface ActivityItem {
  id: string;
  time: string;
  icon: string;
  text: string;
  color: string;
  dept?: string;
}

// ─── Ana Bileşen ──────────────────────────────────────────────────────────────

export default function Home() {
  const { user, logout } = useAuth();
  const [departments, setDepartments] = useState<Department[]>([]);
  const [agents, setAgents] = useState<CoworkAgent[]>([]);
  const [statuses, setStatuses] = useState<Record<string, AgentStatus>>({});
  const [events, setEvents] = useState<AutonomousEvent[]>([]);
  const [autoStatus, setAutoStatus] = useState<AutonomousStatus | null>(null);
  const [info, setInfo] = useState<ServerInfo | null>(null);
  const [connected, setConnected] = useState<boolean | null>(null);
  const [connError, setConnError] = useState<string>("");
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [showCargoModal, setShowCargoModal] = useState(false);
  const [ceoStatus, setCeoStatus] = useState<{ agent_id: string; current_task: string | null; is_active: boolean; tick_count: number; last_run?: string } | null>(null);
  const [ceoTriggering, setCeoTriggering] = useState(false);
  const [activityFeed, setActivityFeed] = useState<ActivityItem[]>([]);
  const [totalTasks, setTotalTasks] = useState(0);
  const [completedTasks, setCompletedTasks] = useState(0);
  const prevEventsRef = useRef<AutonomousEvent[]>([]);
  const [mobileTab, setMobileTab] = useState<MobileMainTab>("dashboard");

  const fetchAll = useCallback(async () => {
    try {
      const [dep, ag, st, ev, au, inf] = await Promise.all([
        getDepartments(), getCoworkAgents(), getAgentStatuses(),
        getAutonomousEvents(50), getAutonomousStatus(), getServerInfo(),
      ]);
      setDepartments(dep); setAgents(ag); setStatuses(st);
      setEvents(ev); setAutoStatus(au); setInfo(inf);
      setConnected(true);
      setConnError("");

      // Aktivite feed'i güncelle
      if (ev.length > prevEventsRef.current.length) {
        const newEvs = ev.slice(0, ev.length - prevEventsRef.current.length);
        const items: ActivityItem[] = newEvs.map(e => ({
          id: `${e.timestamp}-${Math.random()}`,
          time: e.timestamp?.split("T")[1]?.split(".")[0] || "",
          icon: e.type === "task_created" ? "📋" : e.type === "warning" ? "⚠️" : e.type === "inbox_check" ? "📥" : "⚡",
          text: e.message || e.type,
          color: e.type === "task_created" ? "#22c55e" : e.type === "warning" ? "#ef4444" : e.type === "inbox_check" ? "#fbbf24" : "#818cf8",
          dept: e.department_id ?? undefined,
        }));
        setActivityFeed(prev => [...items, ...prev].slice(0, 30));
      }
      prevEventsRef.current = ev;

      // Görev sayaçları
      const created = ev.filter(e => e.type === "task_created").length;
      const done = ev.filter(e => e.message?.toLowerCase().includes("tamamland") || e.message?.toLowerCase().includes("completed")).length;
      setTotalTasks(created);
      setCompletedTasks(done);
    } catch (err) {
      setConnected(false);
      setConnError(err instanceof Error ? err.message : String(err));
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  useEffect(() => {
    getCeoStatus().then(setCeoStatus);
    const iv = setInterval(() => getCeoStatus().then(setCeoStatus), 3000);
    return () => clearInterval(iv);
  }, []);

  useEffect(() => {
    const iv = setInterval(fetchAll, 2000);
    return () => clearInterval(iv);
  }, [fetchAll]);

  const liveCount = Object.values(statuses).filter(s => ACTIVE_STATUSES.includes(s.status)).length;
  const agentsByDept = (deptId: string) => agents.filter(a => a.department_id === deptId);
  const liveInDept = (deptId: string) =>
    agentsByDept(deptId).filter(a => ACTIVE_STATUSES.includes(statuses[a.id]?.status || "")).length;

  // Loading
  if (connected === null) {
    return (
      <div className="h-screen flex items-center justify-center" style={{ background: "#040710" }}>
        <div className="text-center">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl mx-auto mb-4 animate-pulse" style={{ background: "#ffd70015", border: "1px solid #ffd70030" }}>
            👑
          </div>
          <div className="text-sm font-bold tracking-widest mb-1" style={{ color: "#ffd700" }}>COWORK.ARMY</div>
          <div className="text-xs" style={{ color: "#334" }}>Silicon Valley HQ bağlanıyor...</div>
        </div>
      </div>
    );
  }

  // Error
  if (connected === false && departments.length === 0) {
    return (
      <div className="h-screen flex items-center justify-center" style={{ background: "#040710" }}>
        <div className="text-center max-w-md mx-auto px-6">
          <div className="text-4xl mb-4">⚡</div>
          <h1 className="text-lg font-bold text-white mb-2">Backend Bağlantısı Kurulamadı</h1>
          <p className="text-sm text-gray-400 mb-4">{connError}</p>
          <button onClick={fetchAll} className="px-6 py-2.5 rounded-lg text-sm font-semibold" style={{ background: "#ffd70015", border: "1px solid #ffd70030", color: "#ffd700" }}>
            Tekrar Dene
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col overflow-hidden" style={{ background: "#040710", fontFamily: "monospace" }}>

      {/* ═══ HEADER ═══ */}
      <header className="flex items-center justify-between px-3 md:px-5 py-2 shrink-0 z-10" style={{
        background: "rgba(4,7,16,0.95)",
        borderBottom: "1px solid #0e1a2e",
        backdropFilter: "blur(16px)",
      }}>
        {/* Logo */}
        <div className="flex items-center gap-2 md:gap-3">
          <div className="w-8 h-8 md:w-[38px] md:h-[38px] rounded-[10px] flex items-center justify-center text-sm md:text-lg" style={{
            background: "linear-gradient(135deg, #ffd700, #ff8800)",
            boxShadow: "0 0 16px #ffd70040",
          }}>👑</div>
          <div>
            <div className="text-[11px] md:text-[13px] font-black tracking-[3px] text-white">
              COWORK<span style={{ color: "#ffd700" }}>.ARMY</span>
            </div>
            <div className="text-[8px] md:text-[9px] tracking-wider hidden sm:block" style={{ color: "#334" }}>
              SILICON VALLEY HQ · v{info?.version ?? "7.0"}
            </div>
          </div>
        </div>

        {/* Canlı sayaçlar */}
        <div className="flex items-center gap-3 md:gap-6">
          {/* Stats - hide on mobile */}
          <div className="hidden lg:flex items-center gap-6">
            <HeaderStat value={agents.length} label="ÇALIŞAN" color="#ffd700" />
            <HeaderStat value={liveCount} label="AKTİF" color="#22c55e" pulse={liveCount > 0} />
            <HeaderStat value={departments.length} label="DEPT" color="#818cf8" />
            <HeaderStat value={totalTasks} label="GÖREV" color="#f472b6" />
            <HeaderStat value={autoStatus?.tick_count ?? 0} label="TICK" color="#00ccff" />
          </div>

          {/* Mobile compact stats */}
          <div className="flex lg:hidden items-center gap-3 text-[9px] font-mono" style={{ color: "#445" }}>
            <span><span className="font-bold" style={{ color: "#22c55e" }}>{liveCount}</span> aktif</span>
            <span><span className="font-bold" style={{ color: "#ffd700" }}>{agents.length}</span> agent</span>
          </div>

          {/* Otonom mod toggle */}
          <button
            onClick={async () => {
              if (autoStatus?.running) await stopAutonomousLoop();
              else await startAutonomousLoop();
              const s = await getAutonomousStatus();
              setAutoStatus(s);
            }}
            className="hidden sm:flex items-center gap-1.5 px-2.5 md:px-3.5 py-1.5 rounded-lg text-[10px] md:text-[11px] font-bold"
            style={{
              border: autoStatus?.running ? "1px solid #22c55e40" : "1px solid #334",
              background: autoStatus?.running ? "#22c55e12" : "#0a1020",
              color: autoStatus?.running ? "#22c55e" : "#445",
              cursor: "pointer", transition: "all 0.2s",
            }}
          >
            <span style={{
              width: 7, height: 7, borderRadius: "50%",
              background: autoStatus?.running ? "#22c55e" : "#334",
              animation: autoStatus?.running ? "pulse 1.5s infinite" : "none",
            }} />
            <span className="hidden md:inline">{autoStatus?.running ? "OTONOM AÇIK" : "OTONOM KAPALI"}</span>
            <span className="md:hidden">{autoStatus?.running ? "ON" : "OFF"}</span>
          </button>

          {/* World link */}
          <Link href="/world" className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold no-underline" style={{
            border: "1px solid #00ff8833", background: "#00ff8808", color: "#00ff88",
            transition: "all 0.2s",
          }}>
            🌍 3D World
          </Link>

          {/* Connection dot */}
          <div className="flex items-center gap-1">
            <div style={{ width: 7, height: 7, borderRadius: "50%", background: connected ? "#22c55e" : "#ef4444" }} />
            <span className="text-[8px] md:text-[9px] hidden sm:inline" style={{ color: connected ? "#22c55e80" : "#ef444480" }}>
              {connected ? "ONLINE" : "OFFLINE"}
            </span>
          </div>

          {/* Logout */}
          {user && (
            <button onClick={logout} className="text-[8px] px-2 py-1 rounded font-bold font-mono hidden md:block" style={{
              background: "#ef444410", color: "#ef4444", border: "1px solid #ef444420",
            }}>Çıkış</button>
          )}
        </div>
      </header>

      {/* ═══ MAIN ═══ */}
      <div className="flex-1 overflow-hidden flex flex-col md:grid" style={{ gridTemplateColumns: "1fr 320px", gridTemplateRows: "1fr", gap: 0 }}>

        {/* SOL PANEL — Ana içerik */}
        <div className={`overflow-auto p-3 md:p-4 md:pl-5 ${mobileTab !== "dashboard" ? "hidden md:block" : ""}`}>

          {/* CEO + Kontroller */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-4">

            {/* CEO Kartı */}
            <div style={{
              background: ceoStatus?.is_active ? "rgba(255,215,0,0.06)" : "rgba(10,14,26,0.8)",
              border: ceoStatus?.is_active ? "1px solid #ffd70040" : "1px solid #0e1a2e",
              borderRadius: 14, padding: "14px 16px",
              boxShadow: ceoStatus?.is_active ? "0 0 24px #ffd70020" : "none",
              transition: "all 0.4s",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                <div style={{
                  width: 36, height: 36, borderRadius: 10,
                  background: ceoStatus?.is_active ? "#ffd70020" : "#0a1020",
                  display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18,
                  boxShadow: ceoStatus?.is_active ? "0 0 12px #ffd70040" : "none",
                }}>👑</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "#ffd700", letterSpacing: 1 }}>CEO AGENT</div>
                  <div style={{ fontSize: 9, color: "#334", marginTop: 1 }}>Sistem yöneticisi</div>
                </div>
                <div style={{
                  display: "flex", alignItems: "center", gap: 5,
                  padding: "3px 8px", borderRadius: 6,
                  background: ceoStatus?.is_active ? "#22c55e15" : "#0a1020",
                  border: ceoStatus?.is_active ? "1px solid #22c55e30" : "1px solid #1a2030",
                }}>
                  <div style={{
                    width: 6, height: 6, borderRadius: "50%",
                    background: ceoStatus?.is_active ? "#22c55e" : "#334",
                    animation: ceoStatus?.is_active ? "pulse 1.5s infinite" : "none",
                  }} />
                  <span style={{ fontSize: 9, color: ceoStatus?.is_active ? "#22c55e" : "#334", fontWeight: 700 }}>
                    {ceoStatus?.is_active ? "AKTİF" : "PASİF"}
                  </span>
                </div>
              </div>

              {ceoStatus?.current_task && (
                <div style={{
                  fontSize: 10, color: "#ffd70099", background: "#ffd70008",
                  border: "1px solid #ffd70020", borderRadius: 6,
                  padding: "5px 8px", marginBottom: 8,
                  overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                }}>
                  ● {ceoStatus.current_task}
                </div>
              )}

              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10, fontSize: 10 }}>
                <div style={{ textAlign: "center" }}>
                  <div style={{ color: "#ffd700", fontWeight: 700, fontSize: 14 }}>{ceoStatus?.tick_count ?? 0}</div>
                  <div style={{ color: "#334", fontSize: 8 }}>ANALİZ</div>
                </div>
                <div style={{ flex: 1, color: "#334", fontSize: 9, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {ceoStatus?.last_run
                    ? `Son: ${new Date(ceoStatus.last_run).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}`
                    : "Henüz çalışmadı"}
                </div>
              </div>

              <button
                onClick={async () => {
                  setCeoTriggering(true);
                  await triggerCeo();
                  await new Promise(r => setTimeout(r, 800));
                  setCeoStatus(await getCeoStatus());
                  setCeoTriggering(false);
                }}
                disabled={ceoTriggering || !autoStatus?.running}
                style={{
                  width: "100%", padding: "7px 0", borderRadius: 8, fontSize: 10, fontWeight: 700,
                  border: autoStatus?.running ? "1px solid #ffd70030" : "1px solid #1a2030",
                  background: autoStatus?.running ? "#ffd70010" : "#0a1020",
                  color: autoStatus?.running ? "#ffd700" : "#334",
                  cursor: autoStatus?.running && !ceoTriggering ? "pointer" : "not-allowed",
                  transition: "all 0.2s",
                }}
              >
                {ceoTriggering ? "⏳ Analiz ediliyor..." : autoStatus?.running ? "📊 Analizi Tetikle" : "Otonom mod kapalı"}
              </button>
            </div>

            {/* Cargo + Görev */}
            <div style={{
              background: "rgba(10,14,26,0.8)", border: "1px solid #1a1f35",
              borderRadius: 14, padding: "14px 16px",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: "#f472b615", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>📦</div>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "#f472b6", letterSpacing: 1 }}>CARGO AGENT</div>
                  <div style={{ fontSize: 9, color: "#334" }}>Görev dağıtıcı</div>
                </div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                <button onClick={() => setShowCargoModal(true)} style={{
                  padding: "8px 0", borderRadius: 8, fontSize: 10, fontWeight: 700,
                  border: "1px solid #f472b630", background: "#f472b610", color: "#f472b6",
                  cursor: "pointer",
                }}>
                  📤 Dosya Yükle & Analiz Et
                </button>
                <button onClick={() => setShowTaskModal(true)} style={{
                  padding: "8px 0", borderRadius: 8, fontSize: 10, fontWeight: 700,
                  border: "1px solid #818cf830", background: "#818cf810", color: "#818cf8",
                  cursor: "pointer",
                }}>
                  📋 Manuel Görev Oluştur
                </button>
              </div>
            </div>

            {/* Sistem İstatistikleri */}
            <div style={{
              background: "rgba(10,14,26,0.8)", border: "1px solid #1a1f35",
              borderRadius: 14, padding: "14px 16px",
            }}>
              <div style={{ fontSize: 9, color: "#334", letterSpacing: 2, marginBottom: 12, fontWeight: 700 }}>SİSTEM DURUMU</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                <StatCard label="Toplam Çalışan" value={agents.length} color="#ffd700" icon="👥" />
                <StatCard label="Aktif Şu An" value={liveCount} color="#22c55e" icon="⚡" />
                <StatCard label="Oluşturulan Görev" value={totalTasks} color="#f472b6" icon="📋" />
                <StatCard label="Tamamlanan" value={completedTasks} color="#00ccff" icon="✅" />
              </div>
            </div>
          </div>

          {/* Departman Grid */}
          <div style={{ fontSize: 9, color: "#334", letterSpacing: 2, marginBottom: 10, fontWeight: 700 }}>
            DEPARTMANLAR — {Object.keys(DEPT_META).length} BÖLÜM
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 mb-4">
            {Object.entries(DEPT_META).map(([deptId, meta]) => {
              const dept = Array.isArray(departments) ? departments.find(d => d.id === deptId) : undefined;
              const deptAgents = agentsByDept(deptId);
              const live = liveInDept(deptId);
              const isActive = live > 0;

              return (
                <Link key={deptId} href={`/departments/${deptId}`} style={{ textDecoration: "none" }}>
                  <div style={{
                    background: isActive ? meta.bgColor : "rgba(8,12,22,0.8)",
                    border: `1px solid ${isActive ? meta.color + "40" : "#0e1a2e"}`,
                    borderRadius: 12, padding: "12px 14px",
                    cursor: "pointer", transition: "all 0.3s",
                    boxShadow: isActive ? `0 0 20px ${meta.color}15` : "none",
                  }}>
                    {/* Başlık */}
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                      <span style={{ fontSize: 18 }}>{meta.icon}</span>
                      <div style={{
                        fontSize: 14, fontWeight: 900, color: isActive ? meta.color : "#334",
                        textShadow: isActive ? `0 0 8px ${meta.color}` : "none",
                      }}>
                        {live}
                      </div>
                    </div>

                    <div style={{ fontSize: 10, fontWeight: 700, color: meta.color, letterSpacing: 1, marginBottom: 4 }}>
                      {dept?.name || deptId.toUpperCase()}
                    </div>

                    {/* Agent chip'leri */}
                    <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                      {deptAgents.slice(0, 4).map(a => {
                        const st = statuses[a.id]?.status || "idle";
                        const active = ACTIVE_STATUSES.includes(st);
                        return (
                          <div key={a.id} style={{
                            display: "flex", alignItems: "center", gap: 5,
                            fontSize: 9, padding: "3px 6px", borderRadius: 5,
                            background: active ? `${meta.color}10` : "rgba(10,14,26,0.6)",
                            border: `1px solid ${active ? meta.color + "30" : "#0e1a2e"}`,
                            color: active ? meta.color : "#334",
                          }}>
                            <div style={{
                              width: 5, height: 5, borderRadius: "50%",
                              background: active ? meta.color : "#1a2030",
                              flexShrink: 0,
                              animation: active ? "pulse 1.5s infinite" : "none",
                            }} />
                            <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                              {a.icon} {a.name}
                            </span>
                          </div>
                        );
                      })}
                    </div>

                    <div style={{ fontSize: 8, color: "#223", marginTop: 6 }}>
                      {isActive ? `${live}/${deptAgents.length} aktif →` : "bekliyor →"}
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>

          {/* Kanban Görev Panosu */}
          <div style={{ fontSize: 9, color: "#334", letterSpacing: 2, marginBottom: 10, fontWeight: 700 }}>
            GÖREV PANOSU (SON 30 OLAY)
          </div>
          <KanbanBoard events={events} statuses={statuses} agents={agents} />
        </div>

        {/* SAĞ PANEL — Aktivite Akışı */}
        <div className={`flex flex-col overflow-hidden ${mobileTab !== "activity" ? "hidden md:flex" : "flex"}`} style={{
          borderLeft: "1px solid #0e1a2e",
          background: "rgba(4,7,16,0.95)",
        }}>
          {/* Başlık */}
          <div style={{
            padding: "12px 16px", borderBottom: "1px solid #0e1a2e",
            display: "flex", alignItems: "center", justifyContent: "space-between",
          }}>
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, color: "#818cf8", letterSpacing: 2 }}>CANLI AKTİVİTE</div>
              <div style={{ fontSize: 8, color: "#223", marginTop: 1 }}>Gerçek zamanlı event akışı</div>
            </div>
            <div style={{
              display: "flex", alignItems: "center", gap: 5,
              padding: "3px 8px", borderRadius: 6,
              background: "#22c55e10", border: "1px solid #22c55e20",
            }}>
              <div style={{ width: 5, height: 5, borderRadius: "50%", background: "#22c55e", animation: "pulse 1.5s infinite" }} />
              <span style={{ fontSize: 8, color: "#22c55e", fontWeight: 700 }}>CANLI</span>
            </div>
          </div>

          {/* Aktif agent listesi */}
          <div style={{ padding: "10px 14px", borderBottom: "1px solid #0a1020" }}>
            <div style={{ fontSize: 8, color: "#223", letterSpacing: 1, marginBottom: 8, fontWeight: 700 }}>ŞU AN ÇALIŞANLAR</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 4, maxHeight: 140, overflow: "auto" }}>
              {Object.entries(statuses)
                .filter(([, s]) => ACTIVE_STATUSES.includes(s.status))
                .slice(0, 8)
                .map(([agentId, s]) => {
                  const agent = Array.isArray(agents) ? agents.find(a => a.id === agentId) : undefined;
                  const dept = agent?.department_id || "";
                  const meta = DEPT_META[dept];
                  return (
                    <div key={agentId} style={{
                      display: "flex", alignItems: "center", gap: 8,
                      padding: "5px 8px", borderRadius: 7,
                      background: meta ? `${meta.color}08` : "#0a1020",
                      border: `1px solid ${meta ? meta.color + "20" : "#0e1a2e"}`,
                    }}>
                      <div style={{
                        width: 6, height: 6, borderRadius: "50%",
                        background: meta?.color || "#22c55e",
                        animation: "pulse 1.5s infinite", flexShrink: 0,
                      }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 9, color: meta?.color || "#22c55e", fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {agent?.icon} {agent?.name || agentId}
                        </div>
                        <div style={{ fontSize: 8, color: "#334", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {STATUS_LABELS[s.status] || s.status}
                          {s.lines?.[0] && ` — ${s.lines[0].slice(0, 22)}...`}
                        </div>
                      </div>
                    </div>
                  );
                })}
              {liveCount === 0 && (
                <div style={{ fontSize: 9, color: "#223", textAlign: "center", padding: "12px 0" }}>
                  Aktif agent yok
                </div>
              )}
            </div>
          </div>

          {/* Event akışı */}
          <div style={{ flex: 1, overflow: "auto", padding: "10px 14px" }}>
            <div style={{ fontSize: 8, color: "#223", letterSpacing: 1, marginBottom: 8, fontWeight: 700 }}>EVENT AKIŞI</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
              {activityFeed.length === 0 && events.slice(0, 20).map((ev, i) => {
                const meta = ev.department_id ? DEPT_META[ev.department_id] : null;
                return (
                  <div key={i} style={{
                    padding: "6px 8px", borderRadius: 7,
                    borderLeft: `2px solid ${ev.type === "task_created" ? "#22c55e" : ev.type === "warning" ? "#ef4444" : "#818cf8"}`,
                    background: "rgba(10,14,26,0.6)",
                  }}>
                    <div style={{ fontSize: 8, color: "#334", marginBottom: 2 }}>
                      {ev.timestamp?.split("T")[1]?.split(".")[0]}
                      {ev.department_id && <span style={{ color: meta?.color, marginLeft: 4 }}>[{ev.department_id}]</span>}
                    </div>
                    <div style={{ fontSize: 9, color: "#667", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {ev.message}
                    </div>
                  </div>
                );
              })}
              {activityFeed.map(item => (
                <div key={item.id} style={{
                  padding: "6px 8px", borderRadius: 7,
                  borderLeft: `2px solid ${item.color}`,
                  background: "rgba(10,14,26,0.6)",
                  animation: "fadeIn 0.3s ease",
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 2 }}>
                    <span style={{ fontSize: 10 }}>{item.icon}</span>
                    <span style={{ fontSize: 8, color: "#334" }}>{item.time}</span>
                    {item.dept && (
                      <span style={{ fontSize: 7, color: DEPT_META[item.dept]?.color || "#445", padding: "1px 4px", borderRadius: 3, background: `${DEPT_META[item.dept]?.color || "#445"}15` }}>
                        {item.dept}
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: 9, color: "#667", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {item.text}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Mobile bottom nav */}
      <nav className="md:hidden flex items-center justify-around border-t shrink-0" style={{ borderColor: "#0e1a2e", background: "#040710", paddingBottom: "env(safe-area-inset-bottom, 0px)" }}>
        {([
          { id: "dashboard" as MobileMainTab, icon: "📊", label: "Dashboard" },
          { id: "activity" as MobileMainTab, icon: "⚡", label: "Aktivite" },
        ]).map(tab => (
          <button key={tab.id} onClick={() => setMobileTab(tab.id)}
            className={`flex-1 flex flex-col items-center py-2.5 gap-0.5 transition-all ${
              mobileTab === tab.id ? "text-yellow-400" : "text-gray-500"
            }`} style={{ background: "transparent", border: "none", cursor: "pointer" }}>
            <span className="text-lg">{tab.icon}</span>
            <span className="text-[7px] font-bold tracking-wider font-mono">{tab.label}</span>
          </button>
        ))}
        <Link href="/world" className="flex-1 flex flex-col items-center py-2.5 gap-0.5 text-gray-500 no-underline" style={{ background: "transparent" }}>
          <span className="text-lg">🌍</span>
          <span className="text-[7px] font-bold tracking-wider font-mono text-gray-500">3D World</span>
        </Link>
        {user && (
          <button onClick={logout} className="flex-1 flex flex-col items-center py-2.5 gap-0.5 text-gray-500" style={{ background: "transparent", border: "none", cursor: "pointer" }}>
            <span className="text-lg">🚪</span>
            <span className="text-[7px] font-bold tracking-wider font-mono">Çıkış</span>
          </button>
        )}
      </nav>

      {/* MODALS */}
      {showTaskModal && <TaskModal agents={agents} departments={departments} onClose={() => setShowTaskModal(false)} />}
      {showCargoModal && <CargoModal onClose={() => setShowCargoModal(false)} />}

      <style>{`
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(-4px); } to { opacity: 1; transform: translateY(0); } }
        ::-webkit-scrollbar { width: 4px; height: 4px; }
        ::-webkit-scrollbar-track { background: #040710; }
        ::-webkit-scrollbar-thumb { background: #1a2a4a; border-radius: 2px; }
      `}</style>
    </div>
  );
}

// ─── Header İstatistik ────────────────────────────────────────────────────────

function HeaderStat({ value, label, color, pulse }: { value: number | string; label: string; color?: string; pulse?: boolean }) {
  return (
    <div style={{ textAlign: "center" }}>
      <div style={{
        fontSize: 16, fontWeight: 900, color: color || "#fff",
        textShadow: pulse && color ? `0 0 8px ${color}` : "none",
      }}>
        {value}
      </div>
      <div style={{ fontSize: 7, color: "#334", letterSpacing: 1, fontWeight: 700 }}>{label}</div>
    </div>
  );
}

// ─── Stat Kartı ───────────────────────────────────────────────────────────────

function StatCard({ label, value, color, icon }: { label: string; value: number; color: string; icon: string }) {
  return (
    <div style={{
      background: `${color}08`, border: `1px solid ${color}20`,
      borderRadius: 8, padding: "8px 10px", textAlign: "center",
    }}>
      <div style={{ fontSize: 14 }}>{icon}</div>
      <div style={{ fontSize: 16, fontWeight: 900, color, marginTop: 2 }}>{value}</div>
      <div style={{ fontSize: 7, color: "#334", marginTop: 1 }}>{label}</div>
    </div>
  );
}

// ─── Kanban Görev Panosu ──────────────────────────────────────────────────────

function KanbanBoard({ events, statuses, agents }: {
  events: AutonomousEvent[];
  statuses: Record<string, AgentStatus>;
  agents: CoworkAgent[];
}) {
  const taskEvents = events.filter(e => e.type === "task_created").slice(0, 15);
  const activeAgents = Object.entries(statuses).filter(([, s]) => ACTIVE_STATUSES.includes(s.status));
  const doneEvents = events.filter(e =>
    e.message?.toLowerCase().includes("tamamland") || e.message?.toLowerCase().includes("completed")
  ).slice(0, 8);

  const columns = [
    {
      title: "📥 Bekliyor",
      color: "#fbbf24",
      items: taskEvents.slice(0, 5).map(e => ({
        id: e.timestamp,
        text: e.message || e.type,
        dept: e.department_id,
        time: e.timestamp?.split("T")[1]?.split(".")[0],
      })),
    },
    {
      title: "⚡ Çalışıyor",
      color: "#22c55e",
      items: activeAgents.slice(0, 5).map(([id, s]) => {
        const agent = Array.isArray(agents) ? agents.find(a => a.id === id) : undefined;
        return {
          id,
          text: `${agent?.name || id}: ${STATUS_LABELS[s.status] || s.status}`,
          dept: agent?.department_id,
          time: "şu an",
        };
      }),
    },
    {
      title: "✅ Tamamlandı",
      color: "#00ccff",
      items: doneEvents.slice(0, 5).map(e => ({
        id: e.timestamp,
        text: e.message || "Tamamlandı",
        dept: e.department_id,
        time: e.timestamp?.split("T")[1]?.split(".")[0],
      })),
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
      {columns.map(col => (
        <div key={col.title} style={{
          background: "rgba(8,12,22,0.8)",
          border: `1px solid ${col.color}20`,
          borderRadius: 10, overflow: "hidden",
        }}>
          <div style={{
            padding: "8px 12px", borderBottom: `1px solid ${col.color}20`,
            display: "flex", alignItems: "center", justifyContent: "space-between",
          }}>
            <span style={{ fontSize: 10, fontWeight: 700, color: col.color }}>{col.title}</span>
            <span style={{
              fontSize: 9, color: col.color, background: `${col.color}15`,
              padding: "1px 6px", borderRadius: 10,
            }}>{col.items.length}</span>
          </div>
          <div style={{ padding: "8px", display: "flex", flexDirection: "column", gap: 5, minHeight: 80 }}>
            {col.items.length === 0 ? (
              <div style={{ fontSize: 9, color: "#223", textAlign: "center", padding: "16px 0" }}>Boş</div>
            ) : (
              col.items.map(item => {
                const meta = item.dept ? DEPT_META[item.dept] : null;
                return (
                  <div key={item.id} style={{
                    padding: "6px 8px", borderRadius: 6,
                    background: meta ? `${meta.color}08` : "rgba(10,14,26,0.6)",
                    border: `1px solid ${meta ? meta.color + "20" : "#0e1a2e"}`,
                  }}>
                    <div style={{ fontSize: 9, color: "#667", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {item.text}
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 3 }}>
                      {item.dept && (
                        <span style={{ fontSize: 7, color: meta?.color || "#445", padding: "1px 4px", borderRadius: 3, background: `${meta?.color || "#445"}15` }}>
                          {item.dept}
                        </span>
                      )}
                      <span style={{ fontSize: 7, color: "#223" }}>{item.time}</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      ))}
    </div>
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
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.8)", backdropFilter: "blur(8px)",
      zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center",
    }} onClick={onClose}>
      <div className="modal-content" style={{
        background: "#0a0e1a", border: "1px solid #818cf830", borderRadius: 18,
        padding: 24, width: 460, maxWidth: "95vw", boxShadow: "0 0 40px #818cf820",
      }} onClick={e => e.stopPropagation()}>
        <h2 style={{ fontSize: 13, fontWeight: 700, color: "#818cf8", marginBottom: 20, display: "flex", alignItems: "center", gap: 8, fontFamily: "monospace" }}>
          <span style={{ width: 32, height: 32, borderRadius: 8, background: "#818cf810", display: "flex", alignItems: "center", justifyContent: "center" }}>📋</span>
          Görev Oluştur
        </h2>
        <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Görev başlığı"
          style={{ width: "100%", background: "#060810", border: "1px solid #1e293b", color: "#fff", fontSize: 12, padding: "10px 12px", borderRadius: 8, marginBottom: 10, outline: "none", fontFamily: "monospace", boxSizing: "border-box" }} />
        <textarea value={desc} onChange={e => setDesc(e.target.value)} placeholder="Açıklama (opsiyonel)"
          style={{ width: "100%", background: "#060810", border: "1px solid #1e293b", color: "#fff", fontSize: 12, padding: "10px 12px", borderRadius: 8, marginBottom: 10, height: 80, resize: "none", outline: "none", fontFamily: "monospace", boxSizing: "border-box" }} />
        <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
          <select value={deptId} onChange={e => { setDeptId(e.target.value); setAgent(""); }}
            style={{ flex: 1, background: "#060810", border: "1px solid #1e293b", color: "#fff", fontSize: 11, padding: "8px 10px", borderRadius: 8, fontFamily: "monospace" }}>
            <option value="">Tüm Departmanlar</option>
            {departments.map(d => <option key={d.id} value={d.id}>{d.icon} {d.name}</option>)}
          </select>
          <select value={agent} onChange={e => setAgent(e.target.value)}
            style={{ flex: 1, background: "#060810", border: "1px solid #1e293b", color: "#fff", fontSize: 11, padding: "8px 10px", borderRadius: 8, fontFamily: "monospace" }}>
            <option value="">📦 Auto (Cargo)</option>
            {filteredAgents.map(a => <option key={a.id} value={a.id}>{a.icon} {a.name}</option>)}
          </select>
          <select value={priority} onChange={e => setPriority(e.target.value)}
            style={{ width: 100, background: "#060810", border: "1px solid #1e293b", color: "#fff", fontSize: 11, padding: "8px 10px", borderRadius: 8, fontFamily: "monospace" }}>
            <option>normal</option><option>high</option><option>urgent</option>
          </select>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={submit} style={{ padding: "9px 20px", borderRadius: 8, background: "#818cf810", color: "#818cf8", border: "1px solid #818cf825", fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "monospace" }}>
            Oluştur
          </button>
          <button onClick={onClose} style={{ padding: "9px 20px", borderRadius: 8, background: "#0a1020", color: "#445", border: "1px solid #1a2030", fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "monospace" }}>
            İptal
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
      setResult({ success: false, error: "Upload hatası" } as CargoResult);
    }
    setLoading(false);
  };

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.8)", backdropFilter: "blur(8px)",
      zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center",
    }} onClick={onClose}>
      <div className="modal-content" style={{
        background: "#0a0e1a", border: "1px solid #f472b630", borderRadius: 18,
        padding: 24, width: 460, maxWidth: "95vw", boxShadow: "0 0 40px #f472b620",
      }} onClick={e => e.stopPropagation()}>
        <h2 style={{ fontSize: 13, fontWeight: 700, color: "#f472b6", marginBottom: 20, display: "flex", alignItems: "center", gap: 8, fontFamily: "monospace" }}>
          <span style={{ width: 32, height: 32, borderRadius: 8, background: "#f472b610", display: "flex", alignItems: "center", justifyContent: "center" }}>📦</span>
          Cargo — Dosya Yükle
        </h2>

        {!result ? (
          <>
            <div style={{
              border: "2px dashed #f472b620", borderRadius: 12, padding: "28px 0",
              textAlign: "center", cursor: "pointer", marginBottom: 12,
            }} onClick={() => fileRef.current?.click()}>
              <input ref={fileRef} type="file" style={{ display: "none" }} onChange={e => setFile(e.target.files?.[0] || null)} />
              {file ? (
                <div style={{ fontSize: 11, color: "#f472b6", fontFamily: "monospace" }}>{file.name} ({(file.size / 1024).toFixed(1)} KB)</div>
              ) : (
                <div>
                  <div style={{ fontSize: 28, marginBottom: 6 }}>📂</div>
                  <div style={{ fontSize: 11, color: "#334", fontFamily: "monospace" }}>Dosya seçmek için tıklayın</div>
                </div>
              )}
            </div>
            <textarea value={description} onChange={e => setDescription(e.target.value)}
              placeholder="Açıklama veya içerik (opsiyonel)"
              style={{ width: "100%", background: "#060810", border: "1px solid #1e293b", color: "#fff", fontSize: 11, padding: "10px 12px", borderRadius: 8, marginBottom: 12, height: 70, resize: "none", outline: "none", fontFamily: "monospace", boxSizing: "border-box" }} />
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={submit} disabled={loading} style={{ padding: "9px 20px", borderRadius: 8, background: "#f472b610", color: "#f472b6", border: "1px solid #f472b625", fontSize: 11, fontWeight: 700, cursor: loading ? "wait" : "pointer", fontFamily: "monospace" }}>
                {loading ? "Analiz ediliyor..." : "📤 Yükle & Analiz Et"}
              </button>
              <button onClick={onClose} style={{ padding: "9px 20px", borderRadius: 8, background: "#0a1020", color: "#445", border: "1px solid #1a2030", fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "monospace" }}>
                İptal
              </button>
            </div>
          </>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: result.success ? "#22c55e" : "#ef4444" }}>
              {result.success ? "✓ Başarılı!" : "✕ Hata: " + result.error}
            </div>
            {result.success && (
              <div style={{ background: "#060810", borderRadius: 10, padding: 14, display: "flex", flexDirection: "column", gap: 6 }}>
                <InfoRow label="Hedef Departman" value={result.target_department_id} />
                <InfoRow label="Hedef Agent" value={result.target_agent_id} />
                <InfoRow label="Güven" value={`${result.confidence}%`} />
                {result.reasoning && <div style={{ fontSize: 10, color: "#667", marginTop: 4, paddingTop: 8, borderTop: "1px solid #1a2030" }}>{result.reasoning}</div>}
              </div>
            )}
            <button onClick={onClose} style={{ padding: "9px 20px", borderRadius: 8, background: "#0a1020", color: "#445", border: "1px solid #1a2030", fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "monospace", alignSelf: "flex-start" }}>
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
    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, fontFamily: "monospace" }}>
      <span style={{ color: "#445" }}>{label}</span>
      <span style={{ color: "#fff", fontWeight: 700 }}>{value || "—"}</span>
    </div>
  );
}
