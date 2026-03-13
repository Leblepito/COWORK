"use client";
/**
 * COWORK.ARMY — EconomyPanel
 * Departman bazlı agent istatistikleri: uzmanlık, enerji, güven ağı
 */
import type { AgentWorldModel, Department, SchedulerStats } from "@/lib/world-types";
import { DEPT_CONFIG, getAgentDepartment } from "@/lib/world-types";

interface Props {
  worldModels: AgentWorldModel[];
  schedulerStats: SchedulerStats;
}

function MiniBar({
  value,
  color,
  label,
}: {
  value: number;
  color: string;
  label: string;
}) {
  const pct = Math.round(value * 100);
  return (
    <div className="flex items-center gap-2">
      <span className="text-[9px] font-mono text-gray-500 w-12 shrink-0">{label}</span>
      <div className="flex-1 h-1.5 bg-white/5 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${pct}%`, background: color }}
        />
      </div>
      <span className="text-[9px] font-mono w-7 text-right" style={{ color }}>
        {pct}%
      </span>
    </div>
  );
}

function DeptCard({
  dept,
  models,
}: {
  dept: Department;
  models: AgentWorldModel[];
}) {
  const cfg = DEPT_CONFIG[dept];
  if (models.length === 0) {
    return (
      <div
        className="rounded-lg p-3 border"
        style={{ borderColor: cfg.color + "22", background: cfg.bgColor }}
      >
        <div className="flex items-center gap-2 mb-2">
          <span className="text-sm">{cfg.icon}</span>
          <span className="text-[11px] font-mono" style={{ color: cfg.color }}>
            {cfg.label}
          </span>
        </div>
        <p className="text-[9px] text-gray-600 font-mono">Veri yok</p>
      </div>
    );
  }

  const avgExpertise =
    models.reduce((s, m) => s + m.expertise_score, 0) / models.length;
  const avgEnergy =
    models.reduce((s, m) => s + m.energy_level, 0) / models.length;
  const activeCount = models.filter((m) => m.current_task).length;

  return (
    <div
      className="rounded-lg p-3 border"
      style={{ borderColor: cfg.color + "33", background: cfg.bgColor }}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5">
          <span className="text-sm">{cfg.icon}</span>
          <span className="text-[11px] font-mono font-bold" style={{ color: cfg.color }}>
            {cfg.label}
          </span>
        </div>
        <div className="flex items-center gap-1">
          {activeCount > 0 && (
            <span
              className="text-[8px] px-1.5 py-0.5 rounded-full font-mono"
              style={{ background: "#00ff8822", color: "#00ff88", border: "1px solid #00ff8844" }}
            >
              {activeCount} aktif
            </span>
          )}
          <span className="text-[9px] font-mono text-gray-500">
            {models.length} agent
          </span>
        </div>
      </div>

      <div className="space-y-1.5">
        <MiniBar value={avgExpertise} color={cfg.color} label="Uzman." />
        <MiniBar value={avgEnergy} color="#00ff88" label="Enerji" />
      </div>

      {/* Aktif görevler */}
      {models
        .filter((m) => m.current_task)
        .slice(0, 2)
        .map((m) => (
          <div
            key={m.agent_id}
            className="mt-2 flex items-start gap-1.5"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-green-400 mt-1 shrink-0 animate-pulse" />
            <div className="min-w-0">
              <span className="text-[9px] font-mono text-gray-400 block truncate">
                {m.agent_id}
              </span>
              <span className="text-[9px] text-gray-500 block truncate">
                {m.current_task}
              </span>
            </div>
          </div>
        ))}
    </div>
  );
}

export default function EconomyPanel({ worldModels, schedulerStats }: Props) {
  const depts: Department[] = ["trade", "medical", "hotel", "software", "bots"];

  return (
    <div className="flex flex-col h-full overflow-y-auto" style={{ scrollbarWidth: "thin" }}>
      {/* Scheduler Stats */}
      <div className="px-3 py-2 border-b border-white/10">
        <span className="text-[11px] font-mono text-gray-400 uppercase tracking-wider">
          Zamanlayıcı
        </span>
        <div className="flex gap-4 mt-1.5">
          <div>
            <span className="text-[9px] text-gray-500 font-mono block">Kuyruk</span>
            <span className="text-[14px] font-mono font-bold text-yellow-400">
              {schedulerStats.queue_size ?? 0}
            </span>
          </div>
          <div>
            <span className="text-[9px] text-gray-500 font-mono block">Aktif</span>
            <span className="text-[14px] font-mono font-bold text-green-400">
              {schedulerStats.active_tasks ?? 0}
            </span>
          </div>
          <div className="flex-1">
            <span className="text-[9px] text-gray-500 font-mono block">Çalışan</span>
            <div className="flex flex-wrap gap-1 mt-0.5">
              {(schedulerStats.active_agents ?? []).slice(0, 4).map((a) => (
                <span
                  key={a}
                  className="text-[8px] font-mono px-1 rounded bg-white/5 text-gray-400"
                >
                  {a}
                </span>
              ))}
              {(schedulerStats.active_agents ?? []).length > 4 && (
                <span className="text-[8px] font-mono text-gray-600">
                  +{(schedulerStats.active_agents ?? []).length - 4}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Departman kartları */}
      <div className="p-2 space-y-2">
        {depts.map((dept) => {
          const models = worldModels.filter(
            (m) => getAgentDepartment(m.agent_id) === dept
          );
          return <DeptCard key={dept} dept={dept} models={models} />;
        })}
      </div>
    </div>
  );
}
