"use client"
import { useState, useEffect, memo } from "react"
import type { CoworkAgent, AgentStatus } from "../../lib/cowork-api"
import { getAgentOutput, getUsageByAgent, getFilteredTasks } from "../../lib/cowork-api"
import { useInterval } from "../../hooks/useInterval"

function AgentDetailSidebarInner({ agent, status, onClose }: { agent: CoworkAgent; status: AgentStatus | null; onClose: () => void }) {
  const [output, setOutput] = useState<string[]>([])
  const [costs, setCosts] = useState<Record<string, unknown>[]>([])
  const [tasks, setTasks] = useState<Record<string, unknown>[]>([])

  useEffect(() => {
    getAgentOutput(agent.id).then(o => {
      if (o && typeof o === "object" && "lines" in o) {
        setOutput(Array.isArray((o as Record<string, unknown>).lines) ? (o as Record<string, unknown>).lines as string[] : [])
      } else {
        setOutput(Array.isArray(o) ? o as string[] : [])
      }
    }).catch(() => {})
    getUsageByAgent(agent.id).then(setCosts).catch(() => {})
    getFilteredTasks({ agent: agent.id }).then(t => setTasks(t as unknown as Record<string, unknown>[])).catch(() => {})
  }, [agent.id])

  useInterval(() => {
    getAgentOutput(agent.id).then(o => {
      if (o && typeof o === "object" && "lines" in o) {
        setOutput(Array.isArray((o as Record<string, unknown>).lines) ? (o as Record<string, unknown>).lines as string[] : [])
      } else {
        setOutput(Array.isArray(o) ? o as string[] : [])
      }
    }).catch(() => {})
  }, 3000)

  const totalCost = costs.reduce((sum, c) => sum + (Number(c.cost_usd) || 0), 0)

  return (
    <div className="w-80 bg-[#0a0e17] border-l border-[#1e293b] flex flex-col flex-shrink-0 overflow-hidden">
      <div className="p-3 border-b border-[#1e293b] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-lg">{agent.icon}</span>
          <div>
            <p className="text-sm font-bold text-slate-200">{agent.name}</p>
            <p className="text-[10px] text-slate-500">{agent.tier} {"\u2022"} {agent.domain}</p>
          </div>
        </div>
        <button onClick={onClose} className="text-slate-500 hover:text-white text-lg">&#x2715;</button>
      </div>
      <div className="px-3 py-2 border-b border-[#1e293b] flex items-center gap-2">
        <span className={`w-2 h-2 rounded-full ${status?.status === "working" ? "bg-green-400 animate-pulse" : status?.status === "error" ? "bg-red-400" : "bg-slate-500"}`} />
        <span className="text-xs text-slate-300">{status?.status || "idle"}</span>
        <span className="text-[10px] text-slate-500 ml-auto">${totalCost.toFixed(4)} spent</span>
      </div>
      <div className="flex-1 overflow-y-auto">
        <div className="p-3">
          <h4 className="text-[10px] font-bold text-slate-400 uppercase mb-2">Terminal Output</h4>
          <div className="bg-[#060710] rounded p-2 font-mono text-[10px] text-slate-300 max-h-48 overflow-y-auto">
            {output.length > 0 ? output.slice(-20).map((line, i) => (
              <div key={i} className="whitespace-pre-wrap break-all">{line}</div>
            )) : <span className="text-slate-600">No output yet</span>}
          </div>
        </div>
        <div className="p-3 pt-0">
          <h4 className="text-[10px] font-bold text-slate-400 uppercase mb-2">Tasks ({tasks.length})</h4>
          {tasks.slice(0, 5).map((t, i) => (
            <div key={i} className="text-[10px] text-slate-400 mb-1 truncate">
              <span className={`inline-block w-1.5 h-1.5 rounded-full mr-1 ${String(t.status) === "done" ? "bg-cyan-400" : String(t.status) === "error" ? "bg-red-400" : "bg-slate-500"}`} />
              {String(t.title)}
            </div>
          ))}
          {tasks.length === 0 && <span className="text-[10px] text-slate-600">No tasks</span>}
        </div>
        <div className="p-3 pt-0">
          <h4 className="text-[10px] font-bold text-slate-400 uppercase mb-2">Recent Costs</h4>
          {costs.slice(0, 5).map((c, i) => (
            <div key={i} className="flex justify-between text-[10px] text-slate-400 mb-0.5">
              <span>{String(c.model || "").split("-").slice(0, 2).join("-")}</span>
              <span>${Number(c.cost_usd || 0).toFixed(4)}</span>
            </div>
          ))}
          {costs.length === 0 && <span className="text-[10px] text-slate-600">$0.00</span>}
        </div>
      </div>
    </div>
  )
}
export default memo(AgentDetailSidebarInner)
