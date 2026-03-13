"use client";
/**
 * COWORK.ARMY — /world
 * Silicon Valley tarzı canlı agent şehri
 * 5 departman, gerçek zamanlı Canvas haritası, mesaj akışı, agent durumları
 */
import Link from "next/link";
import { useWorldSocket } from "@/lib/useWorldSocket";
import CityCanvas from "@/components/world/CityCanvas";
import LiveFeed from "@/components/world/LiveFeed";
import EconomyPanel from "@/components/world/EconomyPanel";
import AgentMascot from "@/components/world/AgentMascot";

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

export default function WorldPage() {
  const { events, worldModels, schedulerStats, connectionStatus } =
    useWorldSocket();

  const activeAgents = worldModels.filter((m) => m.current_task).length;

  return (
    <div
      className="h-screen w-screen flex flex-col overflow-hidden"
      style={{ background: "#060710", color: "#e2e8f0" }}
    >
      {/* Üst başlık */}
      <header
        className="flex items-center justify-between px-4 py-2 border-b shrink-0"
        style={{ borderColor: "#1a1f35", background: "#0c0d18" }}
      >
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="text-[11px] font-mono text-gray-500 hover:text-gray-300 transition-colors"
          >
            ← Ana Sayfa
          </Link>
          <span className="text-gray-700">|</span>
          <span className="text-[13px] font-mono font-bold text-yellow-400">
            COWORK.ARMY
          </span>
          <span className="text-[11px] font-mono text-gray-500">
            /world
          </span>
        </div>

        <div className="flex items-center gap-4">
          {/* İstatistikler */}
          <div className="flex items-center gap-3 text-[10px] font-mono text-gray-500">
            <span>
              <span className="text-green-400 font-bold">{activeAgents}</span>
              {" "}aktif agent
            </span>
            <span>
              <span className="text-yellow-400 font-bold">
                {schedulerStats.queue_size}
              </span>
              {" "}kuyruk
            </span>
            <span>
              <span className="text-blue-400 font-bold">{events.length}</span>
              {" "}event
            </span>
          </div>

          {/* Bağlantı durumu */}
          <div className="flex items-center gap-1.5">
            <span
              className={`w-2 h-2 rounded-full ${STATUS_DOT[connectionStatus] || "bg-gray-500"}`}
            />
            <span className="text-[10px] font-mono text-gray-500">
              {STATUS_LABEL[connectionStatus] || connectionStatus}
            </span>
          </div>
        </div>
      </header>

      {/* Ana içerik — 3 sütun */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sol panel: Agent durumları */}
        <aside
          className="w-56 shrink-0 border-r flex flex-col overflow-hidden"
          style={{ borderColor: "#1a1f35", background: "#0c0d18" }}
        >
          <AgentMascot worldModels={worldModels} />
        </aside>

        {/* Orta: Canvas şehir haritası */}
        <main className="flex-1 relative overflow-hidden">
          <CityCanvas events={events} worldModels={worldModels} />

          {/* Boş durum overlay */}
          {worldModels.length === 0 && connectionStatus !== "connecting" && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div
                className="text-center px-6 py-4 rounded-xl border"
                style={{
                  background: "#0c0d18cc",
                  borderColor: "#1a1f35",
                }}
              >
                <p className="text-[13px] font-mono text-gray-400">
                  Backend bağlantısı bekleniyor...
                </p>
                <p className="text-[11px] font-mono text-gray-600 mt-1">
                  ws://localhost:8888/ws/events
                </p>
              </div>
            </div>
          )}

          {connectionStatus === "connecting" && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div
                className="text-center px-6 py-4 rounded-xl border"
                style={{
                  background: "#0c0d18cc",
                  borderColor: "#1a1f35",
                }}
              >
                <div className="flex items-center gap-2 justify-center">
                  <span className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse" />
                  <p className="text-[13px] font-mono text-yellow-400">
                    Bağlanıyor...
                  </p>
                </div>
              </div>
            </div>
          )}
        </main>

        {/* Sağ panel: Canlı akış + Ekonomi */}
        <aside
          className="w-64 shrink-0 border-l flex flex-col overflow-hidden"
          style={{ borderColor: "#1a1f35", background: "#0c0d18" }}
        >
          {/* Üst: Canlı akış */}
          <div className="flex-1 min-h-0 border-b" style={{ borderColor: "#1a1f35" }}>
            <LiveFeed events={events} />
          </div>
          {/* Alt: Ekonomi paneli */}
          <div className="h-72 overflow-hidden">
            <EconomyPanel
              worldModels={worldModels}
              schedulerStats={schedulerStats}
            />
          </div>
        </aside>
      </div>
    </div>
  );
}
