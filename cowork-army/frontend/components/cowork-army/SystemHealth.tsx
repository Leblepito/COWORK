"use client"
import { memo } from "react"
import type { AgentStatus } from "../../lib/cowork-api"

interface SystemHealthProps {
  statuses: Record<string, AgentStatus>
}

function SystemHealthInner({ statuses }: SystemHealthProps) {
  const agents = Object.values(statuses)
  const active = agents.filter(a => ["working", "coding", "thinking", "searching"].includes(a.status)).length
  const idle = agents.filter(a => a.status === "idle" || !a.status).length
  const errors = agents.filter(a => a.status === "error").length
  const total = agents.length

  return (
    <div className="bg-[#0f1219] border border-[#1e293b] rounded-lg p-4">
      <h3 className="text-sm font-bold text-amber-400 mb-3">System Health</h3>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <p className="text-[10px] text-slate-500 uppercase">Active</p>
          <p className="text-lg font-bold text-green-400">{active}</p>
        </div>
        <div>
          <p className="text-[10px] text-slate-500 uppercase">Idle</p>
          <p className="text-lg font-bold text-slate-400">{idle}</p>
        </div>
        <div>
          <p className="text-[10px] text-slate-500 uppercase">Errors</p>
          <p className="text-lg font-bold text-red-400">{errors}</p>
        </div>
        <div>
          <p className="text-[10px] text-slate-500 uppercase">Total</p>
          <p className="text-lg font-bold text-cyan-400">{total}</p>
        </div>
      </div>
    </div>
  )
}

const SystemHealth = memo(SystemHealthInner)
export default SystemHealth
