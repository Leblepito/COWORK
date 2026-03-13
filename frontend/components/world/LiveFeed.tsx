"use client";
/**
 * COWORK.ARMY — LiveFeed
 * Gerçek zamanlı agent mesajları ve dış tetikleyici akışı
 */
import { useEffect, useRef } from "react";
import type { WorldEvent } from "@/lib/world-types";
import { DEPT_CONFIG, getAgentDepartment } from "@/lib/world-types";

interface Props {
  events: WorldEvent[];
}

const PRIORITY_COLOR: Record<string, string> = {
  CRITICAL: "#ff3366",
  HIGH: "#fbbf24",
  MEDIUM: "#00aaff",
  LOW: "#64748b",
};

const SEVERITY_COLOR: Record<string, string> = {
  CRITICAL: "#ff3366",
  HIGH: "#fbbf24",
  MEDIUM: "#00aaff",
  LOW: "#64748b",
};

function formatTime(ts: string): string {
  try {
    return new Date(ts).toLocaleTimeString("tr-TR", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  } catch {
    return "--:--:--";
  }
}

function EventRow({ event }: { event: WorldEvent }) {
  if (event.type === "agent_message") {
    const fromDept = getAgentDepartment(event.from_agent);
    const toDept = getAgentDepartment(event.to_agent);
    const color = fromDept ? DEPT_CONFIG[fromDept].color : "#64748b";
    const priorityColor = PRIORITY_COLOR[event.priority] || "#64748b";

    return (
      <div
        className="flex items-start gap-2 px-3 py-2 border-b border-white/5 hover:bg-white/[0.02] transition-colors"
        style={{ borderLeft: `2px solid ${color}` }}
      >
        <span className="text-[10px] text-gray-500 mt-0.5 shrink-0 font-mono">
          {formatTime(event.timestamp)}
        </span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[10px] font-mono" style={{ color }}>
              {event.from_agent}
            </span>
            <span className="text-gray-600 text-[9px]">→</span>
            <span className="text-[10px] font-mono text-gray-400">
              {event.to_agent}
            </span>
            <span
              className="text-[9px] px-1 py-0.5 rounded font-mono"
              style={{
                color: priorityColor,
                background: priorityColor + "18",
                border: `1px solid ${priorityColor}33`,
              }}
            >
              {event.priority}
            </span>
            <span className="text-[9px] text-gray-600 font-mono">
              {event.message_type}
            </span>
          </div>
          {event.payload_summary && (
            <p className="text-[10px] text-gray-400 mt-0.5 truncate">
              {event.payload_summary}
            </p>
          )}
        </div>
      </div>
    );
  }

  if (event.type === "external_trigger") {
    const color = SEVERITY_COLOR[event.severity] || "#64748b";
    return (
      <div
        className="flex items-start gap-2 px-3 py-2 border-b border-white/5 hover:bg-white/[0.02] transition-colors"
        style={{ borderLeft: `2px solid ${color}` }}
      >
        <span className="text-[10px] text-gray-500 mt-0.5 shrink-0 font-mono">
          {formatTime(event.timestamp)}
        </span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[10px] font-mono text-yellow-400">
              ⚡ {event.source}
            </span>
            <span
              className="text-[9px] px-1 py-0.5 rounded font-mono"
              style={{
                color,
                background: color + "18",
                border: `1px solid ${color}33`,
              }}
            >
              {event.severity}
            </span>
          </div>
          <p className="text-[10px] text-gray-300 mt-0.5 truncate">
            {event.summary}
          </p>
          {event.target_departments.length > 0 && (
            <div className="flex gap-1 mt-0.5 flex-wrap">
              {event.target_departments.map((dept) => {
                const cfg = DEPT_CONFIG[dept as keyof typeof DEPT_CONFIG];
                return cfg ? (
                  <span
                    key={dept}
                    className="text-[8px] px-1 rounded"
                    style={{ color: cfg.color, background: cfg.bgColor }}
                  >
                    {cfg.icon} {cfg.label}
                  </span>
                ) : null;
              })}
            </div>
          )}
        </div>
      </div>
    );
  }

  if (event.type === "cascade_complete" || event.type === "cascade_event") {
    return (
      <div
        className="flex items-start gap-2 px-3 py-2 border-b border-white/5 hover:bg-white/[0.02] transition-colors"
        style={{ borderLeft: "2px solid #aa00ff" }}
      >
        <span className="text-[10px] text-gray-500 mt-0.5 shrink-0 font-mono">
          --:--:--
        </span>
        <div className="flex-1 min-w-0">
          <span className="text-[10px] font-mono text-purple-400">
            🔗 Cascade {event.type === "cascade_complete" ? "tamamlandı" : "adımı"}
          </span>
          {event.summary && (
            <p className="text-[10px] text-gray-400 mt-0.5 truncate">
              {event.summary}
            </p>
          )}
        </div>
      </div>
    );
  }

  return null;
}

export default function LiveFeed({ events }: Props) {
  const listRef = useRef<HTMLDivElement>(null);

  // Yeni event geldiğinde otomatik scroll
  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = 0;
    }
  }, [events.length]);

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-3 py-2 border-b border-white/10">
        <span className="text-[11px] font-mono text-gray-400 uppercase tracking-wider">
          Canlı Akış
        </span>
        <div className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
          <span className="text-[10px] font-mono text-gray-500">
            {events.length} event
          </span>
        </div>
      </div>
      <div
        ref={listRef}
        className="flex-1 overflow-y-auto"
        style={{ scrollbarWidth: "thin" }}
      >
        {events.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-[11px] text-gray-600 font-mono">
              Agent aktivitesi bekleniyor...
            </p>
          </div>
        ) : (
          events.slice(0, 50).map((event, i) => (
            <EventRow key={`${event.type}-${i}`} event={event} />
          ))
        )}
      </div>
    </div>
  );
}
