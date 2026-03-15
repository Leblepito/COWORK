"use client"
import { useState, useEffect, memo } from "react"
import { getTaskHistory, type TaskHistoryEntry } from "../../lib/cowork-api"

const STATUS_COLORS: Record<string, string> = {
  pending: "#64748b", working: "#22c55e", coding: "#3b82f6",
  thinking: "#8b5cf6", error: "#ef4444", done: "#06b6d4",
}

function TaskTimelineInner({ taskId }: { taskId: string }) {
  const [history, setHistory] = useState<TaskHistoryEntry[]>([])
  useEffect(() => { getTaskHistory(taskId).then(setHistory).catch(() => {}) }, [taskId])
  if (!history.length) return <div className="text-[10px] text-slate-500">No history</div>
  return (
    <div className="flex items-center gap-1 py-2 overflow-x-auto">
      {history.map((h, i) => (
        <div key={i} className="flex items-center gap-1">
          <div className="flex flex-col items-center">
            <div className="w-3 h-3 rounded-full" style={{ background: STATUS_COLORS[h.new_status] || "#64748b" }} />
            <span className="text-[8px] text-slate-500 mt-0.5">{h.new_status}</span>
            <span className="text-[7px] text-slate-600">{new Date(h.changed_at).toLocaleTimeString()}</span>
          </div>
          {i < history.length - 1 && <div className="w-6 h-0.5 bg-[#334155]" />}
        </div>
      ))}
    </div>
  )
}
export default memo(TaskTimelineInner)
