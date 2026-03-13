"use client";
/**
 * COWORK.ARMY — Agent Komuta Paneli
 *
 * 3D dünyada bir agent'a tıklandığında açılan yan panel:
 * - Agent profili (isim, departman, tier, domain, yetenekler)
 * - Mevcut durum + son çıktı satırları
 * - Göreve başlat (serbest metin)
 * - Durdur
 * - İşbirliği görevi: başka bir agent seç + görev yaz → her ikisi tetiklenir
 */
import { useState, useEffect, useCallback, useRef } from "react";

const API_BASE = process.env.NEXT_PUBLIC_COWORK_API_URL || "";

// ─── Tipler ───────────────────────────────────────────────────────────────────

interface AgentDetail {
  id: string;
  name: string;
  icon: string;
  tier: string;
  department_id: string;
  domain: string;
  desc: string;
  skills: string[];
  rules: string[];
  triggers: string[];
  color: string;
}

interface AgentStatus {
  agent_id: string;
  status: string;
  alive: boolean;
  lines: string[];
  task?: string;
  started_at?: string;
}

interface AllAgent {
  id: string;
  name: string;
  icon: string;
  department_id: string;
  tier: string;
}

// ─── API Helpers ──────────────────────────────────────────────────────────────

async function fetchAgentDetail(agentId: string): Promise<AgentDetail | null> {
  try {
    const r = await fetch(`${API_BASE}/cowork-api/agents/${agentId}`);
    if (!r.ok) return null;
    return r.json();
  } catch { return null; }
}

async function fetchAgentStatus(agentId: string): Promise<AgentStatus | null> {
  try {
    const r = await fetch(`${API_BASE}/cowork-api/statuses`);
    if (!r.ok) return null;
    const all = await r.json();
    return all[agentId] || null;
  } catch { return null; }
}

async function fetchAllAgents(): Promise<AllAgent[]> {
  try {
    const r = await fetch(`${API_BASE}/cowork-api/agents`);
    if (!r.ok) return [];
    return r.json();
  } catch { return []; }
}

async function spawnAgent(agentId: string, task: string): Promise<{ error?: string }> {
  const fd = new FormData();
  fd.append("task", task);
  const r = await fetch(`${API_BASE}/cowork-api/agents/${agentId}/spawn`, { method: "POST", body: fd });
  return r.json();
}

async function killAgent(agentId: string): Promise<void> {
  await fetch(`${API_BASE}/cowork-api/agents/${agentId}/kill`, { method: "POST" });
}

async function collaborateAgents(
  agentId: string,
  partnerId: string,
  taskTitle: string,
  taskDescription: string,
): Promise<{ status?: string; error?: string }> {
  const fd = new FormData();
  fd.append("partner_id", partnerId);
  fd.append("task_title", taskTitle);
  fd.append("task_description", taskDescription);
  const r = await fetch(`${API_BASE}/cowork-api/agents/${agentId}/collaborate`, { method: "POST", body: fd });
  return r.json();
}

// ─── Renk Haritası ────────────────────────────────────────────────────────────

const DEPT_COLORS: Record<string, string> = {
  management: "#ffd700",
  trade:      "#00ff88",
  medical:    "#00ccff",
  hotel:      "#ffaa00",
  software:   "#cc44ff",
  bots:       "#ff4466",
};

const DEPT_LABELS: Record<string, string> = {
  management: "CEO",
  trade:      "Trade",
  medical:    "Medical",
  hotel:      "Hotel",
  software:   "Software",
  bots:       "Bots",
};

const STATUS_COLOR: Record<string, string> = {
  working:  "#22c55e",
  thinking: "#a78bfa",
  coding:   "#38bdf8",
  searching:"#fb923c",
  running:  "#22c55e",
  idle:     "#4b5563",
  done:     "#6b7280",
  error:    "#ef4444",
};

// ─── Ana Panel ────────────────────────────────────────────────────────────────

interface AgentCommandPanelProps {
  agentId: string;
  dept: string;
  onClose: () => void;
}

type Tab = "profile" | "task" | "collab";

export default function AgentCommandPanel({ agentId, dept, onClose }: AgentCommandPanelProps) {
  const color = DEPT_COLORS[dept] || "#00ccff";
  const [tab, setTab] = useState<Tab>("profile");
  const [detail, setDetail] = useState<AgentDetail | null>(null);
  const [status, setStatus] = useState<AgentStatus | null>(null);
  const [allAgents, setAllAgents] = useState<AllAgent[]>([]);
  const [loading, setLoading] = useState(true);

  // Görev formu
  const [taskText, setTaskText] = useState("");
  const [taskSending, setTaskSending] = useState(false);
  const [taskResult, setTaskResult] = useState<string>("");

  // İşbirliği formu
  const [collabPartner, setCollabPartner] = useState("");
  const [collabTitle, setCollabTitle] = useState("");
  const [collabDesc, setCollabDesc] = useState("");
  const [collabSending, setCollabSending] = useState(false);
  const [collabResult, setCollabResult] = useState<string>("");

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const refreshStatus = useCallback(async () => {
    const s = await fetchAgentStatus(agentId);
    if (s) setStatus(s);
  }, [agentId]);

  useEffect(() => {
    setLoading(true);
    setDetail(null);
    setStatus(null);
    setTaskResult("");
    setCollabResult("");
    setTab("profile");

    Promise.all([
      fetchAgentDetail(agentId),
      fetchAgentStatus(agentId),
      fetchAllAgents(),
    ]).then(([d, s, ag]) => {
      setDetail(d);
      if (s) setStatus(s);
      setAllAgents(ag.filter(a => a.id !== agentId));
      setLoading(false);
    });

    pollRef.current = setInterval(refreshStatus, 2000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [agentId, refreshStatus]);

  const handleSpawn = async () => {
    if (!taskText.trim()) return;
    setTaskSending(true);
    setTaskResult("");
    const r = await spawnAgent(agentId, taskText.trim());
    setTaskResult(r.error ? `Hata: ${r.error}` : "✓ Agent başlatıldı");
    setTaskSending(false);
    await refreshStatus();
  };

  const handleKill = async () => {
    await killAgent(agentId);
    setTaskResult("✓ Agent durduruldu");
    await refreshStatus();
  };

  const handleCollab = async () => {
    if (!collabPartner || !collabTitle.trim()) return;
    setCollabSending(true);
    setCollabResult("");
    const r = await collaborateAgents(agentId, collabPartner, collabTitle.trim(), collabDesc.trim());
    setCollabResult(r.error ? `Hata: ${r.error}` : `✓ İşbirliği başlatıldı`);
    setCollabSending(false);
    await refreshStatus();
  };

  const isActive = status?.alive || ["working","thinking","coding","searching","running"].includes(status?.status || "");
  const statusColor = STATUS_COLOR[status?.status || "idle"] || "#4b5563";

  return (
    <div
      style={{
        position: "absolute",
        top: 0,
        right: 0,
        width: 340,
        height: "100%",
        background: "rgba(5,8,20,0.97)",
        borderLeft: `1.5px solid ${color}33`,
        display: "flex",
        flexDirection: "column",
        fontFamily: "monospace",
        zIndex: 50,
        boxShadow: `-8px 0 32px ${color}18`,
        backdropFilter: "blur(16px)",
        overflow: "hidden",
      }}
    >
      {/* ── Başlık ── */}
      <div style={{
        padding: "14px 16px 10px",
        borderBottom: `1px solid ${color}22`,
        background: `linear-gradient(135deg, ${color}10, transparent)`,
        flexShrink: 0,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10,
            background: `${color}18`, border: `1px solid ${color}44`,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 18,
          }}>
            {detail?.icon || "🤖"}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ color, fontSize: 13, fontWeight: "bold", letterSpacing: 1 }}>
              {detail?.name || agentId.replace(/_/g, " ").toUpperCase()}
            </div>
            <div style={{ color: "#555", fontSize: 10, marginTop: 2 }}>
              {DEPT_LABELS[dept] || dept.toUpperCase()} · {detail?.tier || "WORKER"}
            </div>
          </div>
          {/* Durum */}
          <div style={{
            display: "flex", alignItems: "center", gap: 6,
            padding: "3px 10px", borderRadius: 6,
            background: `${statusColor}15`, border: `1px solid ${statusColor}30`,
          }}>
            <div style={{
              width: 7, height: 7, borderRadius: "50%",
              background: statusColor,
              boxShadow: isActive ? `0 0 6px ${statusColor}` : "none",
              animation: isActive ? "pulse 1.5s infinite" : "none",
            }} />
            <span style={{ color: statusColor, fontSize: 10 }}>
              {status?.status || "idle"}
            </span>
          </div>
          {/* Kapat */}
          <button onClick={onClose} style={{
            background: "rgba(255,255,255,0.06)", border: "1px solid #222",
            borderRadius: 6, color: "#666", padding: "4px 10px",
            cursor: "pointer", fontSize: 12, marginLeft: 4,
          }}
          onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.14)")}
          onMouseLeave={e => (e.currentTarget.style.background = "rgba(255,255,255,0.06)")}
          >✕</button>
        </div>
      </div>

      {/* ── Tab Bar ── */}
      <div style={{
        display: "flex", borderBottom: `1px solid ${color}18`,
        flexShrink: 0,
      }}>
        {([
          { key: "profile", label: "Profil", icon: "👤" },
          { key: "task",    label: "Görev",  icon: "📋" },
          { key: "collab",  label: "İşbirliği", icon: "🤝" },
        ] as { key: Tab; label: string; icon: string }[]).map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} style={{
            flex: 1, padding: "8px 4px", fontSize: 11,
            background: tab === t.key ? `${color}12` : "transparent",
            border: "none", borderBottom: tab === t.key ? `2px solid ${color}` : "2px solid transparent",
            color: tab === t.key ? color : "#444",
            cursor: "pointer", transition: "all 0.15s",
          }}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* ── İçerik ── */}
      <div style={{ flex: 1, overflowY: "auto", padding: "14px 16px" }}>
        {loading ? (
          <div style={{ textAlign: "center", color: "#333", paddingTop: 40, fontSize: 12 }}>
            Yükleniyor...
          </div>
        ) : tab === "profile" ? (
          <ProfileTab detail={detail} status={status} color={color} />
        ) : tab === "task" ? (
          <TaskTab
            color={color}
            isActive={isActive}
            taskText={taskText}
            setTaskText={setTaskText}
            taskSending={taskSending}
            taskResult={taskResult}
            onSpawn={handleSpawn}
            onKill={handleKill}
            status={status}
          />
        ) : (
          <CollabTab
            color={color}
            allAgents={allAgents}
            collabPartner={collabPartner}
            setCollabPartner={setCollabPartner}
            collabTitle={collabTitle}
            setCollabTitle={setCollabTitle}
            collabDesc={collabDesc}
            setCollabDesc={setCollabDesc}
            collabSending={collabSending}
            collabResult={collabResult}
            onCollab={handleCollab}
          />
        )}
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #1a2a4a; border-radius: 2px; }
      `}</style>
    </div>
  );
}

// ─── Profil Sekmesi ───────────────────────────────────────────────────────────

function ProfileTab({ detail, status, color }: {
  detail: AgentDetail | null;
  status: AgentStatus | null;
  color: string;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {/* Domain */}
      {detail?.domain && (
        <div>
          <SectionLabel>DOMAIN</SectionLabel>
          <div style={{ color: "#aaa", fontSize: 11, lineHeight: 1.5, marginTop: 4 }}>
            {detail.domain}
          </div>
        </div>
      )}

      {/* Açıklama */}
      {detail?.desc && (
        <div>
          <SectionLabel>AÇIKLAMA</SectionLabel>
          <div style={{ color: "#888", fontSize: 11, lineHeight: 1.6, marginTop: 4 }}>
            {detail.desc}
          </div>
        </div>
      )}

      {/* Yetenekler */}
      {detail?.skills && detail.skills.length > 0 && (
        <div>
          <SectionLabel>YETENEKLERİ</SectionLabel>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginTop: 6 }}>
            {detail.skills.map(s => (
              <span key={s} style={{
                fontSize: 10, padding: "2px 8px", borderRadius: 4,
                background: `${color}12`, border: `1px solid ${color}30`,
                color, letterSpacing: 0.5,
              }}>
                {s.replace(/_/g, " ")}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Tetikleyiciler */}
      {detail?.triggers && detail.triggers.length > 0 && (
        <div>
          <SectionLabel>TETİKLEYİCİLER</SectionLabel>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginTop: 6 }}>
            {detail.triggers.map(t => (
              <span key={t} style={{
                fontSize: 10, padding: "2px 8px", borderRadius: 4,
                background: "rgba(255,255,255,0.04)", border: "1px solid #1a2a4a",
                color: "#556",
              }}>
                #{t}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Kurallar */}
      {detail?.rules && detail.rules.length > 0 && (
        <div>
          <SectionLabel>KURALLAR</SectionLabel>
          <div style={{ display: "flex", flexDirection: "column", gap: 4, marginTop: 6 }}>
            {detail.rules.map((r, i) => (
              <div key={i} style={{
                fontSize: 10, color: "#556", lineHeight: 1.5,
                paddingLeft: 10, borderLeft: "2px solid #1a2a4a",
              }}>
                {r}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Son çıktı */}
      {status?.lines && status.lines.length > 0 && (
        <div>
          <SectionLabel>SON ÇIKTI</SectionLabel>
          <div style={{
            marginTop: 6, background: "#060a14", border: "1px solid #0e1428",
            borderRadius: 6, padding: "8px 10px", maxHeight: 120, overflowY: "auto",
          }}>
            {status.lines.slice(-8).map((l, i) => (
              <div key={i} style={{ fontSize: 10, color: "#445566", lineHeight: 1.6, fontFamily: "monospace" }}>
                {l}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Görev Sekmesi ────────────────────────────────────────────────────────────

function TaskTab({ color, isActive, taskText, setTaskText, taskSending, taskResult, onSpawn, onKill, status }: {
  color: string;
  isActive: boolean;
  taskText: string;
  setTaskText: (v: string) => void;
  taskSending: boolean;
  taskResult: string;
  onSpawn: () => void;
  onKill: () => void;
  status: AgentStatus | null;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {/* Mevcut görev */}
      {status?.task && (
        <div>
          <SectionLabel>MEVCUT GÖREV</SectionLabel>
          <div style={{
            marginTop: 6, fontSize: 11, color: "#aaa", lineHeight: 1.5,
            background: `${color}08`, border: `1px solid ${color}20`,
            borderRadius: 6, padding: "8px 10px",
          }}>
            {status.task}
          </div>
        </div>
      )}

      {/* Yeni görev */}
      <div>
        <SectionLabel>YENİ GÖREV VER</SectionLabel>
        <textarea
          value={taskText}
          onChange={e => setTaskText(e.target.value)}
          placeholder="Görevi açıkla... (örn: BTC/USDT için Elliott Wave analizi yap ve sinyal üret)"
          style={{
            width: "100%", marginTop: 6, minHeight: 90,
            background: "#060a14", border: `1px solid ${color}25`,
            borderRadius: 6, padding: "8px 10px",
            color: "#ccc", fontSize: 11, fontFamily: "monospace",
            resize: "vertical", outline: "none", boxSizing: "border-box",
            lineHeight: 1.6,
          }}
          onFocus={e => (e.target.style.borderColor = `${color}55`)}
          onBlur={e => (e.target.style.borderColor = `${color}25`)}
        />
      </div>

      {/* Butonlar */}
      <div style={{ display: "flex", gap: 8 }}>
        <button
          onClick={onSpawn}
          disabled={taskSending || !taskText.trim()}
          style={{
            flex: 1, padding: "9px 0", borderRadius: 8, fontSize: 12,
            fontFamily: "monospace", fontWeight: "bold", cursor: "pointer",
            background: taskSending || !taskText.trim() ? `${color}08` : `${color}18`,
            border: `1px solid ${taskSending || !taskText.trim() ? color + "20" : color + "50"}`,
            color: taskSending || !taskText.trim() ? `${color}44` : color,
            transition: "all 0.15s",
          }}
        >
          {taskSending ? "⏳ Başlatılıyor..." : "▶ Göreve Başlat"}
        </button>
        {isActive && (
          <button
            onClick={onKill}
            style={{
              padding: "9px 14px", borderRadius: 8, fontSize: 12,
              fontFamily: "monospace", cursor: "pointer",
              background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.3)",
              color: "#ef4444", transition: "all 0.15s",
            }}
            onMouseEnter={e => (e.currentTarget.style.background = "rgba(239,68,68,0.18)")}
            onMouseLeave={e => (e.currentTarget.style.background = "rgba(239,68,68,0.08)")}
          >
            ■ Durdur
          </button>
        )}
      </div>

      {taskResult && (
        <div style={{
          fontSize: 11, padding: "8px 12px", borderRadius: 6,
          background: taskResult.startsWith("Hata") ? "rgba(239,68,68,0.08)" : "rgba(34,197,94,0.08)",
          border: `1px solid ${taskResult.startsWith("Hata") ? "rgba(239,68,68,0.3)" : "rgba(34,197,94,0.3)"}`,
          color: taskResult.startsWith("Hata") ? "#ef4444" : "#22c55e",
        }}>
          {taskResult}
        </div>
      )}

      {/* Canlı çıktı */}
      {isActive && status?.lines && status.lines.length > 0 && (
        <div>
          <SectionLabel>CANLI ÇIKTI</SectionLabel>
          <div style={{
            marginTop: 6, background: "#060a14", border: "1px solid #0e1428",
            borderRadius: 6, padding: "8px 10px", maxHeight: 150, overflowY: "auto",
          }}>
            {status.lines.slice(-12).map((l, i) => (
              <div key={i} style={{ fontSize: 10, color: "#334455", lineHeight: 1.7, fontFamily: "monospace" }}>
                <span style={{ color: "#1a2a4a", marginRight: 6 }}>{i + 1}.</span>{l}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── İşbirliği Sekmesi ────────────────────────────────────────────────────────

function CollabTab({ color, allAgents, collabPartner, setCollabPartner, collabTitle, setCollabTitle, collabDesc, setCollabDesc, collabSending, collabResult, onCollab }: {
  color: string;
  allAgents: AllAgent[];
  collabPartner: string;
  setCollabPartner: (v: string) => void;
  collabTitle: string;
  setCollabTitle: (v: string) => void;
  collabDesc: string;
  setCollabDesc: (v: string) => void;
  collabSending: boolean;
  collabResult: string;
  onCollab: () => void;
}) {
  const selectedPartner = allAgents.find(a => a.id === collabPartner);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ fontSize: 11, color: "#445", lineHeight: 1.6 }}>
        Bu agent'a başka bir agent ile birlikte çalışması için görev ver. Her iki agent da aynı anda tetiklenir.
      </div>

      {/* Partner seç */}
      <div>
        <SectionLabel>PARTNER AGENT</SectionLabel>
        <div style={{ display: "flex", flexDirection: "column", gap: 5, marginTop: 6, maxHeight: 180, overflowY: "auto" }}>
          {allAgents.map(a => {
            const aColor = DEPT_COLORS[a.department_id] || "#555";
            const isSelected = collabPartner === a.id;
            return (
              <button key={a.id} onClick={() => setCollabPartner(a.id)} style={{
                display: "flex", alignItems: "center", gap: 8,
                padding: "7px 10px", borderRadius: 7, cursor: "pointer",
                background: isSelected ? `${aColor}15` : "rgba(255,255,255,0.02)",
                border: `1px solid ${isSelected ? aColor + "50" : "#0e1428"}`,
                textAlign: "left", transition: "all 0.12s",
              }}
              onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = "rgba(255,255,255,0.05)"; }}
              onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = "rgba(255,255,255,0.02)"; }}
              >
                <span style={{ fontSize: 14 }}>{a.icon}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 11, color: isSelected ? aColor : "#778", fontWeight: isSelected ? "bold" : "normal" }}>
                    {a.name}
                  </div>
                  <div style={{ fontSize: 9, color: "#334", marginTop: 1 }}>
                    {DEPT_LABELS[a.department_id] || a.department_id} · {a.tier}
                  </div>
                </div>
                {isSelected && <span style={{ color: aColor, fontSize: 12 }}>✓</span>}
              </button>
            );
          })}
        </div>
      </div>

      {/* Görev başlığı */}
      <div>
        <SectionLabel>GÖREV BAŞLIĞI</SectionLabel>
        <input
          value={collabTitle}
          onChange={e => setCollabTitle(e.target.value)}
          placeholder={selectedPartner ? `${selectedPartner.name} ile birlikte...` : "Görev başlığı..."}
          style={{
            width: "100%", marginTop: 6, padding: "8px 10px",
            background: "#060a14", border: `1px solid ${color}25`,
            borderRadius: 6, color: "#ccc", fontSize: 11,
            fontFamily: "monospace", outline: "none", boxSizing: "border-box",
          }}
          onFocus={e => (e.target.style.borderColor = `${color}55`)}
          onBlur={e => (e.target.style.borderColor = `${color}25`)}
        />
      </div>

      {/* Görev açıklaması */}
      <div>
        <SectionLabel>AÇIKLAMA (opsiyonel)</SectionLabel>
        <textarea
          value={collabDesc}
          onChange={e => setCollabDesc(e.target.value)}
          placeholder="Görevin detayları, beklenen çıktılar..."
          style={{
            width: "100%", marginTop: 6, minHeight: 70,
            background: "#060a14", border: `1px solid ${color}20`,
            borderRadius: 6, padding: "8px 10px",
            color: "#aaa", fontSize: 11, fontFamily: "monospace",
            resize: "vertical", outline: "none", boxSizing: "border-box",
            lineHeight: 1.6,
          }}
          onFocus={e => (e.target.style.borderColor = `${color}45`)}
          onBlur={e => (e.target.style.borderColor = `${color}20`)}
        />
      </div>

      {/* Gönder */}
      <button
        onClick={onCollab}
        disabled={collabSending || !collabPartner || !collabTitle.trim()}
        style={{
          padding: "10px 0", borderRadius: 8, fontSize: 12,
          fontFamily: "monospace", fontWeight: "bold", cursor: "pointer",
          background: collabSending || !collabPartner || !collabTitle.trim()
            ? `${color}06` : `${color}18`,
          border: `1px solid ${collabSending || !collabPartner || !collabTitle.trim()
            ? color + "15" : color + "50"}`,
          color: collabSending || !collabPartner || !collabTitle.trim()
            ? `${color}33` : color,
          transition: "all 0.15s",
        }}
      >
        {collabSending
          ? "⏳ İşbirliği başlatılıyor..."
          : selectedPartner
          ? `🤝 ${selectedPartner.name} ile Başlat`
          : "🤝 İşbirliği Başlat"}
      </button>

      {collabResult && (
        <div style={{
          fontSize: 11, padding: "8px 12px", borderRadius: 6,
          background: collabResult.startsWith("Hata") ? "rgba(239,68,68,0.08)" : "rgba(34,197,94,0.08)",
          border: `1px solid ${collabResult.startsWith("Hata") ? "rgba(239,68,68,0.3)" : "rgba(34,197,94,0.3)"}`,
          color: collabResult.startsWith("Hata") ? "#ef4444" : "#22c55e",
        }}>
          {collabResult}
        </div>
      )}
    </div>
  );
}

// ─── Yardımcı ─────────────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      fontSize: 9, color: "#334455", letterSpacing: 1.5,
      fontWeight: "bold", textTransform: "uppercase",
    }}>
      {children}
    </div>
  );
}
