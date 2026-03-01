"use client";

import type { CoworkAgent, AgentStatus } from "@/lib/types";
import { spawnAgent, killAgent } from "@/lib/cowork-api";

interface AgentPanelProps {
  agent: CoworkAgent;
  status?: AgentStatus;
  onClose: () => void;
}

export default function AgentPanel({ agent, status, onClose }: AgentPanelProps) {
  return (
    <div className="absolute top-2 left-2 w-[260px] bg-[#0b0c14]/95 border border-[#1a1f30] rounded-lg p-3 backdrop-blur z-10">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-2xl">{agent.icon}</span>
        <div>
          <div className="text-sm font-extrabold" style={{ color: agent.color }}>{agent.name}</div>
          <div className="text-[7px] text-gray-500">{agent.tier} — {agent.domain}</div>
        </div>
        <button onClick={onClose} className="ml-auto text-gray-500 hover:text-white text-xs">✕</button>
      </div>
      <p className="text-[9px] text-gray-400 mb-2">{agent.desc}</p>
      <div className="flex gap-1.5 mb-2">
        <button onClick={() => spawnAgent(agent.id)}
          className="text-[8px] px-2 py-1 rounded bg-green-500/10 text-green-400 border border-green-500/30 font-bold">
          ▶ Baslat
        </button>
        <button onClick={() => killAgent(agent.id)}
          className="text-[8px] px-2 py-1 rounded bg-red-500/10 text-red-400 border border-red-500/30 font-bold">
          ⏹ Durdur
        </button>
      </div>
      <div className="text-[7px] text-gray-500 mb-1 tracking-wider">SKILLS</div>
      <div className="flex flex-wrap gap-1 mb-2">
        {agent.skills?.map(s => (
          <span key={s} className="text-[7px] px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-300">{s}</span>
        ))}
      </div>
      {status?.lines && status.lines.length > 0 && (
        <div className="bg-[#09090f] rounded p-2 max-h-[120px] overflow-y-auto mt-2">
          {status.lines.slice(-10).map((l, i) => (
            <div key={i} className="text-[8px] text-gray-400 whitespace-pre-wrap">{l}</div>
          ))}
        </div>
      )}
    </div>
  );
}
