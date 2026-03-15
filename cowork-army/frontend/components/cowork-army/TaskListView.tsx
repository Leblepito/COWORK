"use client"
import { useState, useEffect, memo } from "react"
import type { CoworkAgent, CoworkTask } from "../../lib/cowork-api"
import { getFilteredTasks } from "../../lib/cowork-api"
import TaskTimeline from "./TaskTimeline"

function TaskListViewInner({ agents, onClose }: { agents: CoworkAgent[]; onClose: () => void }) {
  const [tasks, setTasks] = useState<CoworkTask[]>([])
  const [filterAgent, setFilterAgent] = useState("")
  const [filterStatus, setFilterStatus] = useState("")
  const [expanded, setExpanded] = useState<string | null>(null)

  useEffect(() => {
    getFilteredTasks({ agent: filterAgent || undefined, status: filterStatus || undefined })
      .then(setTasks).catch(() => {})
  }, [filterAgent, filterStatus])

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-[#0f1219] border border-[#1e293b] rounded-xl p-6 w-full max-w-2xl max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-amber-400">Tasks</h2>
          <button className="text-slate-400 hover:text-white" onClick={onClose}>&#x2715;</button>
        </div>
        <div className="flex gap-2 mb-4">
          <select className="bg-[#1e293b] rounded px-3 py-1.5 text-xs" value={filterAgent} onChange={e => setFilterAgent(e.target.value)}>
            <option value="">All agents</option>
            {agents.map(a => <option key={a.id} value={a.id}>{a.icon} {a.name}</option>)}
          </select>
          <select className="bg-[#1e293b] rounded px-3 py-1.5 text-xs" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
            <option value="">All statuses</option>
            {["pending", "working", "done", "error"].map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div className="space-y-2">
          {tasks.map(t => (
            <div key={t.id} className="bg-[#1e293b]/50 rounded-lg p-3 cursor-pointer hover:bg-[#1e293b]"
              onClick={() => setExpanded(expanded === t.id ? null : t.id)}>
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-200">{t.title}</span>
                <span className={`text-[10px] px-2 py-0.5 rounded ${t.status === "done" ? "bg-cyan-500/20 text-cyan-400" : t.status === "error" ? "bg-red-500/20 text-red-400" : "bg-slate-500/20 text-slate-400"}`}>{t.status}</span>
              </div>
              {t.assigned_to && <span className="text-[10px] text-slate-500">{"\u2192"} {t.assigned_to}</span>}
              {expanded === t.id && <TaskTimeline taskId={t.id} />}
            </div>
          ))}
          {tasks.length === 0 && <p className="text-xs text-slate-500 text-center py-4">No tasks found</p>}
        </div>
      </div>
    </div>
  )
}
export default memo(TaskListViewInner)
