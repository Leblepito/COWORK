"use client";
/**
 * EventPanel — Right panel: event feed + autonomous loop controls + server info
 */
import { memo, useMemo } from "react";
import type { AutonomousEvent, AutonomousStatus, ServerInfo } from "@/lib/cowork-api";
import { startAutonomousLoop, stopAutonomousLoop, getAutonomousStatus } from "@/lib/cowork-api";

interface Props {
  events: AutonomousEvent[];
  autoStatus: AutonomousStatus | null;
  info: ServerInfo | null;
  onRefresh: () => void;
  onOpenSettings: () => void;
  loading?: boolean;
}

function EventPanel({ events, autoStatus, info, onRefresh, onOpenSettings, loading }: Props) {
  const recentEvents = useMemo(() => events.slice(0, 30), [events]);

  const handleAutoToggle = async () => {
    if (autoStatus?.running) await stopAutonomousLoop();
    else await startAutonomousLoop();
    onRefresh();
  };

  // Task 11: loading skeleton (after all hooks)
  if (loading) {
    return (
      <aside className="w-[200px] border-l border-[#1a1f30] flex flex-col flex-shrink-0 p-3">
        <div className="h-3 bg-[#1e293b] rounded w-24 mb-4 animate-pulse" />
        <div className="h-8 bg-[#1e293b] rounded mb-3 animate-pulse" />
        {[...Array(6)].map((_, i) => (
          <div key={i} className="p-1.5 rounded border-l-2 border-[#1e293b] bg-white/[0.01] mb-1">
            <div className="h-1.5 bg-[#1e293b] rounded w-1/2 mb-1 animate-pulse" />
            <div className="h-2 bg-[#1e293b] rounded animate-pulse" />
          </div>
        ))}
      </aside>
    );
  }

  return (
    <aside className="w-[200px] border-l border-[#1a1f30] flex flex-col flex-shrink-0">
      <div className="px-3 py-2 text-[7px] text-gray-500 tracking-[2px] border-b border-[#1a1f3030] flex justify-between items-center">
        <span>EVENT FEED</span>
        <button
          onClick={handleAutoToggle}
          className={`text-[6px] px-2 py-0.5 rounded font-bold border ${
            autoStatus?.running
              ? "bg-green-500/10 text-green-400 border-green-500/30"
              : "bg-gray-500/10 text-gray-400 border-gray-500/30"
          }`}
        >
          {autoStatus?.running ? "▶ AUTO" : "⏸ AUTO"}
        </button>
      </div>
      {/* Server info */}
      <div className="px-3 py-2 border-b border-[#1a1f3030] space-y-1">
        <div className="flex justify-between items-center">
          <div className="text-[7px] text-gray-500">SERVER</div>
          <button
            onClick={onOpenSettings}
            className="text-[6px] px-2 py-0.5 rounded bg-gray-500/10 text-gray-400 border border-gray-500/30 hover:bg-gray-500/20 font-bold"
          >
            Settings
          </button>
        </div>
        <div className="text-[8px]">{info?.name} v{info?.version}</div>
        <div className="text-[8px] text-gray-400">Agents: {info?.agents} | Ticks: {autoStatus?.tick_count}</div>
      </div>
      {/* Events */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {recentEvents.length === 0 && (
          <div className="text-center text-[8px] text-gray-600 py-8">Henüz event yok</div>
        )}
        {recentEvents.map((ev, i) => (
          <div
            key={i}
            className={`text-[8px] p-1.5 rounded border-l-2 bg-white/[0.01] ${
              ev.type === "task_created" ? "border-l-green-500" :
              ev.type === "warning" ? "border-l-red-500" :
              ev.type === "inbox_check" ? "border-l-amber-500" : "border-l-indigo-500"
            }`}
          >
            <div className="text-[6px] text-gray-500">{ev.timestamp?.split("T")[1]?.split(".")[0]} • {ev.agent_id}</div>
            <div className="text-gray-400 truncate">{ev.message}</div>
          </div>
        ))}
      </div>
    </aside>
  );
}

export default memo(EventPanel);
