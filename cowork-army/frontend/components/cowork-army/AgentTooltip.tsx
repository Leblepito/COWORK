"use client"
import { memo } from "react"
import { Html } from "@react-three/drei"

interface AgentTooltipProps {
  name: string
  status: string
  task?: string
  position: [number, number, number]
  visible: boolean
}

function AgentTooltipInner({ name, status, task, position, visible }: AgentTooltipProps) {
  if (!visible) return null
  return (
    <Html position={[position[0], position[1] + 2.5, position[2]]} center>
      <div className="bg-[#0f1219]/95 border border-[#334155] rounded-lg px-3 py-2 pointer-events-none whitespace-nowrap"
        style={{ transform: "translateY(-100%)" }}>
        <p className="text-xs font-bold text-amber-400">{name}</p>
        <p className="text-[10px] text-slate-400">{status}</p>
        {task && <p className="text-[10px] text-slate-500 max-w-[200px] truncate">{task}</p>}
      </div>
    </Html>
  )
}

const AgentTooltip = memo(AgentTooltipInner)
export default AgentTooltip
