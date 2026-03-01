"use client";

import Link from "next/link";
import type { Department, CoworkAgent, AgentStatus } from "@/lib/types";

interface DepartmentCardProps {
  deptId: string;
  department?: Department;
  agents: CoworkAgent[];
  statuses: Record<string, AgentStatus>;
  color: string;
  icon: string;
}

export default function DepartmentCard({ deptId, department, agents, statuses, color, icon }: DepartmentCardProps) {
  const liveCount = agents.filter(a => {
    const s = statuses[a.id]?.status;
    return s && ["working", "thinking", "coding", "searching"].includes(s);
  }).length;

  return (
    <Link href={`/departments/${deptId}`}
      className="group block border rounded-xl p-4 transition-all hover:scale-[1.01]"
      style={{ borderColor: `${color}30`, background: `${color}05` }}>
      <div className="flex items-center gap-2 mb-2">
        <span className="text-xl">{icon}</span>
        <div className="flex-1">
          <div className="text-[11px] font-extrabold tracking-wider" style={{ color }}>
            {department?.name || deptId.toUpperCase()}
          </div>
          <div className="text-[8px] text-gray-500">
            {department?.description || ""}
          </div>
        </div>
        <div className="text-right">
          <div className="text-[10px] font-bold" style={{ color }}>{liveCount}</div>
          <div className="text-[6px] text-gray-500">LIVE</div>
        </div>
      </div>
      {/* Agent chips */}
      <div className="flex flex-wrap gap-1 mb-2">
        {agents.map(a => {
          const st = statuses[a.id]?.status || "idle";
          const isActive = ["working", "thinking", "coding", "searching"].includes(st);
          return (
            <span key={a.id} className="inline-flex items-center gap-1 text-[8px] px-1.5 py-0.5 rounded-full border"
              style={{
                borderColor: isActive ? "#22c55e50" : `${color}25`,
                background: isActive ? "#22c55e10" : `${color}08`,
                color: isActive ? "#22c55e" : "#94a3b8",
              }}>
              <span className={`w-1 h-1 rounded-full ${isActive ? "bg-green-500 pulse-dot" : "bg-gray-600"}`} />
              {a.icon} {a.name}
            </span>
          );
        })}
      </div>
      <div className="text-[7px] text-gray-500 group-hover:text-gray-300 transition-colors flex items-center gap-1">
        3D Sahne → <span style={{ color }}>Goruntule</span>
      </div>
    </Link>
  );
}
