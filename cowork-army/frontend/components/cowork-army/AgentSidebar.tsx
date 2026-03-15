"use client";
/**
 * AgentSidebar — Left panel: department-grouped agent list
 */
import { memo, useMemo } from "react";
import type { CoworkAgent, AgentStatus } from "@/lib/cowork-api";
import { spawnAgent, killAgent, deleteAgent } from "@/lib/cowork-api";
import { AGENT_DEPARTMENT, DEPT_COLORS } from "@/components/cowork-army/scene-constants";

interface Props {
  agents: CoworkAgent[];
  statuses: Record<string, AgentStatus>;
  selected: string | null;
  onSelect: (id: string | null) => void;
  onNewAgent: () => void;
  onRefresh: () => void;
  loading?: boolean;
}

const DEPT_LABELS: Record<string, string> = {
  cargo: "📦 CARGO",
  trade: "📊 TRADE",
  medical: "🏥 MEDICAL",
  hotel: "🏨 HOTEL",
  software: "💻 SOFTWARE",
};

const DEPTS = ["cargo", "trade", "medical", "hotel", "software"] as const;

function AgentSidebar({ agents, statuses, selected, onSelect, onNewAgent, onRefresh, loading }: Props) {
  // Hooks must all run before any conditional return
  const agentsByDept = useMemo(() => {
    const map: Record<string, CoworkAgent[]> = {};
    for (const dept of DEPTS) {
      map[dept] = agents.filter(a => AGENT_DEPARTMENT[a.id] === dept);
    }
    return map;
  }, [agents]);

  const dynamicAgents = useMemo(
    () => agents.filter(a => !AGENT_DEPARTMENT[a.id]),
    [agents]
  );

  // Task 11: loading skeleton (after all hooks)
  if (loading) {
    return (
      <aside className="w-[200px] border-r border-[#1a1f30] flex flex-col flex-shrink-0 p-3">
        <div className="h-3 bg-[#1e293b] rounded w-20 mb-4 animate-pulse" />
        {[...Array(8)].map((_, i) => (
          <div key={i} className="flex items-center gap-2 px-2 py-1.5 mb-1">
            <div className="w-5 h-5 rounded bg-[#1e293b] animate-pulse flex-shrink-0" />
            <div className="flex-1 space-y-1">
              <div className="h-2.5 bg-[#1e293b] rounded animate-pulse" />
              <div className="h-1.5 bg-[#1e293b] rounded w-2/3 animate-pulse" />
            </div>
            <div className="w-1.5 h-1.5 rounded-full bg-[#1e293b] animate-pulse flex-shrink-0" />
          </div>
        ))}
      </aside>
    );
  }

  return (
    <aside className="w-[200px] border-r border-[#1a1f30] flex flex-col flex-shrink-0">
      <div className="px-3 py-2 text-[7px] text-gray-500 tracking-[2px] border-b border-[#1a1f3030] flex justify-between items-center">
        <span>AGENTS ({agents.length})</span>
        <div className="flex gap-1">
          <button
            onClick={onNewAgent}
            className="text-[6px] px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/30 hover:bg-amber-500/20 font-bold"
          >
            + Yeni
          </button>
          <button
            onClick={() => agents.forEach(a => spawnAgent(a.id))}
            className="text-[6px] px-2 py-0.5 rounded bg-green-500/10 text-green-400 border border-green-500/30 hover:bg-green-500/20 font-bold"
          >
            ▶ ALL
          </button>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-1 space-y-0.5">
        {/* Department-grouped agents */}
        {DEPTS.map(dept => {
          const deptAgents = agentsByDept[dept];
          if (deptAgents.length === 0) return null;
          return (
            <div key={dept}>
              <div
                className="px-2 py-1 text-[6px] tracking-[2px] font-bold"
                style={{ color: DEPT_COLORS[dept] }}
              >
                {DEPT_LABELS[dept]}
              </div>
              {deptAgents.map(a => {
                const st = statuses[a.id]?.status || "idle";
                const isActive = ["working", "thinking", "coding", "searching", "delivering"].includes(st);
                return (
                  <button
                    key={a.id}
                    onClick={() => onSelect(a.id)}
                    className={`w-full flex items-center gap-2 px-2 py-1.5 rounded text-left transition-all text-[9px]
                      ${selected === a.id ? "bg-indigo-500/10 border border-indigo-500/20" : "border border-transparent hover:bg-white/[0.02]"}
                      ${isActive ? "border-l-2 !border-l-green-500" : ""}`}
                  >
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
        {dynamicAgents.length > 0 && (
          <div>
            <div className="px-2 py-1 text-[6px] tracking-[2px] font-bold text-gray-500">
              DYNAMIC
            </div>
            {dynamicAgents.map(a => {
              const st = statuses[a.id]?.status || "idle";
              const isActive = ["working", "thinking", "coding", "searching"].includes(st);
              return (
                <button
                  key={a.id}
                  onClick={() => onSelect(a.id)}
                  className={`w-full flex items-center gap-2 px-2 py-1.5 rounded text-left transition-all text-[9px]
                    ${selected === a.id ? "bg-indigo-500/10 border border-indigo-500/20" : "border border-transparent hover:bg-white/[0.02]"}
                    ${isActive ? "border-l-2 !border-l-green-500" : ""}`}
                >
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
  );
}

export default memo(AgentSidebar);
