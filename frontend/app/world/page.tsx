"use client";
/**
 * COWORK.ARMY — /world
 * Silicon Valley tarzı canlı agent şehri (mobile responsive)
 */
import { useState } from "react";
import Link from "next/link";
import { useWorldSocket } from "@/lib/useWorldSocket";
import dynamic from "next/dynamic";
const World3DScene = dynamic(() => import("@/components/world/World3DScene"), { ssr: false });
import LiveFeed from "@/components/world/LiveFeed";
import EconomyPanel from "@/components/world/EconomyPanel";
import AgentMascot from "@/components/world/AgentMascot";
import { useAuth } from "@/lib/auth-context";

const STATUS_DOT: Record<string, string> = {
  connected: "bg-green-400",
  connecting: "bg-yellow-400 animate-pulse",
  disconnected: "bg-red-400",
  error: "bg-red-600 animate-pulse",
};

const STATUS_LABEL: Record<string, string> = {
  connected: "Canlı",
  connecting: "Bağlanıyor...",
  disconnected: "Bağlantı Kesildi",
  error: "Hata",
};

type MobileTab = "agents" | "3d" | "feed";

export default function WorldPage() {
  const { events, worldModels, schedulerStats, connectionStatus } = useWorldSocket();
  const { user, logout } = useAuth();
  const [mobileTab, setMobileTab] = useState<MobileTab>("3d");
  const activeAgents = worldModels.filter((m) => m.current_task).length;

  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden" style={{ background: "#060710", color: "#e2e8f0" }}>
      {/* Header */}
      <header className="flex items-center justify-between px-3 md:px-4 py-2 border-b shrink-0" style={{ borderColor: "#1a1f35", background: "#0c0d18" }}>
        <div className="flex items-center gap-2 md:gap-3">
          <Link href="/" className="text-[10px] md:text-[11px] font-mono text-gray-500 hover:text-gray-300 transition-colors">← Ana Sayfa</Link>
          <span className="text-gray-700 hidden sm:inline">|</span>
          <span className="text-[12px] md:text-[13px] font-mono font-bold text-yellow-400">COWORK.ARMY</span>
          <span className="text-[10px] md:text-[11px] font-mono text-gray-500 hidden sm:inline">/world</span>
        </div>

        <div className="flex items-center gap-2 md:gap-4">
          <div className="hidden sm:flex items-center gap-3 text-[10px] font-mono text-gray-500">
            <span><span className="text-green-400 font-bold">{activeAgents}</span> aktif</span>
            <span><span className="text-yellow-400 font-bold">{schedulerStats.queue_size}</span> kuyruk</span>
            <span><span className="text-blue-400 font-bold">{events.length}</span> event</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className={`w-2 h-2 rounded-full ${STATUS_DOT[connectionStatus] || "bg-gray-500"}`} />
            <span className="text-[9px] md:text-[10px] font-mono text-gray-500">{STATUS_LABEL[connectionStatus] || connectionStatus}</span>
          </div>
          {user && (
            <button onClick={logout} className="text-[8px] px-2 py-1 rounded bg-red-500/10 text-red-400 border border-red-500/20 font-bold font-mono hidden md:block">Cikis</button>
          )}
        </div>
      </header>

      {/* Main — 3 columns on desktop, tab-based on mobile */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Left: Agent sidebar — desktop only */}
        <aside className="hidden md:flex w-56 shrink-0 border-r flex-col overflow-hidden" style={{ borderColor: "#1a1f35", background: "#0c0d18" }}>
          <AgentMascot worldModels={worldModels} />
        </aside>

        {/* Center: 3D scene */}
        <main className={`flex-1 relative overflow-hidden ${mobileTab !== "3d" ? "hidden md:block" : ""}`}>
          <World3DScene events={events} worldModels={worldModels} />
          {worldModels.length === 0 && connectionStatus !== "connecting" && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="text-center px-6 py-4 rounded-xl border" style={{ background: "#0c0d18cc", borderColor: "#1a1f35" }}>
                <p className="text-[12px] md:text-[13px] font-mono text-gray-400">Backend bağlantısı bekleniyor...</p>
                <p className="text-[10px] md:text-[11px] font-mono text-gray-600 mt-1">ws://localhost:8888/ws/events</p>
              </div>
            </div>
          )}
          {connectionStatus === "connecting" && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="text-center px-6 py-4 rounded-xl border" style={{ background: "#0c0d18cc", borderColor: "#1a1f35" }}>
                <div className="flex items-center gap-2 justify-center">
                  <span className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse" />
                  <p className="text-[12px] md:text-[13px] font-mono text-yellow-400">Bağlanıyor...</p>
                </div>
              </div>
            </div>
          )}
        </main>

        {/* Right: LiveFeed + Economy — desktop only */}
        <aside className="hidden md:flex w-64 shrink-0 border-l flex-col overflow-hidden" style={{ borderColor: "#1a1f35", background: "#0c0d18" }}>
          <div className="flex-1 min-h-0 border-b" style={{ borderColor: "#1a1f35" }}>
            <LiveFeed events={events} />
          </div>
          <div className="h-72 overflow-hidden">
            <EconomyPanel worldModels={worldModels} schedulerStats={schedulerStats} />
          </div>
        </aside>

        {/* Mobile: Agents tab */}
        {mobileTab === "agents" && (
          <div className="md:hidden absolute inset-0 z-20 flex flex-col overflow-hidden" style={{ background: "#0c0d18" }}>
            <AgentMascot worldModels={worldModels} />
          </div>
        )}

        {/* Mobile: Feed tab */}
        {mobileTab === "feed" && (
          <div className="md:hidden absolute inset-0 z-20 flex flex-col overflow-hidden" style={{ background: "#0c0d18" }}>
            <div className="flex-1 min-h-0 border-b" style={{ borderColor: "#1a1f35" }}>
              <LiveFeed events={events} />
            </div>
            <div className="h-64 overflow-hidden shrink-0">
              <EconomyPanel worldModels={worldModels} schedulerStats={schedulerStats} />
            </div>
          </div>
        )}
      </div>

      {/* Mobile bottom nav */}
      <nav className="md:hidden flex items-center justify-around border-t shrink-0" style={{ borderColor: "#1a1f35", background: "#0c0d18", paddingBottom: "env(safe-area-inset-bottom, 0px)" }}>
        {([
          { id: "agents" as MobileTab, icon: "🤖", label: "Agents", badge: `${activeAgents}/${worldModels.length}` },
          { id: "3d" as MobileTab, icon: "🏢", label: "3D Sehir" },
          { id: "feed" as MobileTab, icon: "📡", label: "Canli Akis", badge: `${events.length}` },
        ]).map(tab => (
          <button key={tab.id} onClick={() => setMobileTab(tab.id)}
            className={`flex-1 flex flex-col items-center py-2.5 gap-0.5 transition-all ${
              mobileTab === tab.id ? "text-yellow-400" : "text-gray-500"
            }`}>
            <span className="text-lg">{tab.icon}</span>
            <span className="text-[7px] font-bold tracking-wider font-mono">{tab.label}</span>
            {tab.badge && (
              <span className={`text-[6px] px-1.5 py-0.5 rounded-full font-mono ${
                mobileTab === tab.id ? "bg-yellow-500/20 text-yellow-400" : "bg-gray-500/10 text-gray-500"
              }`}>{tab.badge}</span>
            )}
          </button>
        ))}
      </nav>
    </div>
  );
}
