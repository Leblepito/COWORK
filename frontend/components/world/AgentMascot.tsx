"use client";
/**
 * COWORK.ARMY — AgentMascot
 * Aktif agent'ların mini kart listesi — uzmanlık, enerji, mevcut görev
 */
import type { AgentWorldModel } from "@/lib/world-types";
import { DEPT_CONFIG, getAgentDepartment } from "@/lib/world-types";

interface Props {
  worldModels: AgentWorldModel[];
}

function EnergyBar({ value }: { value: number }) {
  const pct = Math.round(value * 100);
  const color =
    pct > 70 ? "#00ff88" : pct > 40 ? "#fbbf24" : "#ff3366";
  return (
    <div className="flex items-center gap-1.5">
      <div className="flex-1 h-1 bg-white/5 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${pct}%`, background: color }}
        />
      </div>
      <span className="text-[8px] font-mono" style={{ color }}>
        {pct}%
      </span>
    </div>
  );
}

function AgentCard({ model }: { model: AgentWorldModel }) {
  const dept = getAgentDepartment(model.agent_id);
  const cfg = dept ? DEPT_CONFIG[dept] : null;
  const color = cfg?.color ?? "#64748b";
  const icon = cfg?.icon ?? "🤖";
  const isActive = !!model.current_task;

  return (
    <div
      className="rounded-lg p-2.5 border transition-all duration-300"
      style={{
        borderColor: isActive ? color + "55" : color + "22",
        background: isActive ? color + "0d" : "#0c0d1888",
      }}
    >
      <div className="flex items-start gap-2">
        <div
          className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 text-sm"
          style={{ background: color + "22" }}
        >
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span
              className="text-[10px] font-mono font-bold truncate"
              style={{ color }}
            >
              {model.agent_id}
            </span>
            {isActive && (
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 shrink-0 animate-pulse" />
            )}
          </div>
          <EnergyBar value={model.energy_level} />
        </div>
        <div className="text-right shrink-0">
          <span className="text-[9px] font-mono text-gray-500 block">uzm.</span>
          <span
            className="text-[11px] font-mono font-bold"
            style={{ color }}
          >
            {Math.round(model.expertise_score * 100)}
          </span>
        </div>
      </div>

      {isActive && model.current_task && (
        <div className="mt-1.5 flex items-start gap-1">
          <span className="text-[8px] text-green-400 mt-0.5 shrink-0">▶</span>
          <span className="text-[9px] text-gray-400 line-clamp-1">
            {model.current_task}
          </span>
        </div>
      )}
    </div>
  );
}

export default function AgentMascot({ worldModels }: Props) {
  // Önce aktif olanları, sonra uzmanlık skoruna göre sırala
  const sorted = [...worldModels].sort((a, b) => {
    if (!!a.current_task !== !!b.current_task) {
      return a.current_task ? -1 : 1;
    }
    return b.expertise_score - a.expertise_score;
  });

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-3 py-2 border-b border-white/10">
        <span className="text-[11px] font-mono text-gray-400 uppercase tracking-wider">
          Agent Durumu
        </span>
        <span className="text-[10px] font-mono text-gray-500">
          {worldModels.filter((m) => m.current_task).length} / {worldModels.length} aktif
        </span>
      </div>
      <div
        className="flex-1 overflow-y-auto p-2 space-y-1.5"
        style={{ scrollbarWidth: "thin" }}
      >
        {sorted.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-[11px] text-gray-600 font-mono">
              Agent verisi bekleniyor...
            </p>
          </div>
        ) : (
          sorted.map((model) => (
            <AgentCard key={model.agent_id} model={model} />
          ))
        )}
      </div>
    </div>
  );
}
