"use client"
import { useState, useEffect, memo } from "react"
import { getUsageSummary, type UsageSummary } from "../../lib/cowork-api"

function CostDashboardInner() {
  const [summary, setSummary] = useState<UsageSummary | null>(null)
  const [period, setPeriod] = useState("day")

  useEffect(() => {
    getUsageSummary(period).then(setSummary).catch(() => {})
  }, [period])

  if (!summary) return <div className="text-xs text-slate-500 animate-pulse p-4">Loading costs...</div>

  return (
    <div className="bg-[#0f1219] border border-[#1e293b] rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-bold text-amber-400">LLM Costs</h3>
        <div className="flex gap-1">
          {["day", "week", "month"].map(p => (
            <button key={p} onClick={() => setPeriod(p)}
              className={`px-2 py-0.5 rounded text-[10px] ${period === p ? "bg-amber-500 text-black" : "bg-[#1e293b] text-slate-400"}`}>
              {p}
            </button>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <p className="text-[10px] text-slate-500 uppercase">Total Cost</p>
          <p className="text-lg font-bold text-green-400">${summary.total_cost_usd.toFixed(4)}</p>
        </div>
        <div>
          <p className="text-[10px] text-slate-500 uppercase">API Calls</p>
          <p className="text-lg font-bold text-cyan-400">{summary.call_count}</p>
        </div>
        <div>
          <p className="text-[10px] text-slate-500 uppercase">Input Tokens</p>
          <p className="text-sm font-mono text-slate-300">{summary.total_input_tokens.toLocaleString()}</p>
        </div>
        <div>
          <p className="text-[10px] text-slate-500 uppercase">Output Tokens</p>
          <p className="text-sm font-mono text-slate-300">{summary.total_output_tokens.toLocaleString()}</p>
        </div>
      </div>
    </div>
  )
}

const CostDashboard = memo(CostDashboardInner)
export default CostDashboard
