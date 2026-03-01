"use client";

import { useState } from "react";
import type { CoworkAgent, Department } from "@/lib/types";
import { createCoworkTask } from "@/lib/cowork-api";

interface TaskModalProps {
  agents: CoworkAgent[];
  departments: Department[];
  onClose: () => void;
}

export default function TaskModal({ agents, departments, onClose }: TaskModalProps) {
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [agent, setAgent] = useState("");
  const [deptId, setDeptId] = useState("");
  const [priority, setPriority] = useState("normal");

  const submit = async () => {
    if (!title) return;
    await createCoworkTask(title, desc, agent, priority, deptId || undefined);
    onClose();
  };

  const filteredAgents = deptId ? agents.filter(a => a.department_id === deptId) : agents;

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center" onClick={onClose}>
      <div className="bg-[#0f1019] border border-[#fbbf2440] rounded-xl p-6 w-[440px]" onClick={e => e.stopPropagation()}>
        <h2 className="text-sm font-bold text-amber-400 mb-4">📋 Gorev Olustur</h2>
        <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Gorev basligi"
          className="w-full bg-[#0a0b12] border border-[#1e293b] text-white font-mono text-[10px] p-2 rounded mb-2" />
        <textarea value={desc} onChange={e => setDesc(e.target.value)} placeholder="Aciklama (opsiyonel)"
          className="w-full bg-[#0a0b12] border border-[#1e293b] text-white font-mono text-[10px] p-2 rounded mb-2 h-20 resize-none" />
        <div className="flex gap-2 mb-3">
          <select value={deptId} onChange={e => { setDeptId(e.target.value); setAgent(""); }}
            className="flex-1 bg-[#0a0b12] border border-[#1e293b] text-white font-mono text-[10px] p-2 rounded">
            <option value="">Tum Departmanlar</option>
            {departments.map(d => <option key={d.id} value={d.id}>{d.icon} {d.name}</option>)}
          </select>
          <select value={agent} onChange={e => setAgent(e.target.value)}
            className="flex-1 bg-[#0a0b12] border border-[#1e293b] text-white font-mono text-[10px] p-2 rounded">
            <option value="">📦 Auto (Cargo)</option>
            {filteredAgents.map(a => <option key={a.id} value={a.id}>{a.icon} {a.name}</option>)}
          </select>
          <select value={priority} onChange={e => setPriority(e.target.value)}
            className="w-24 bg-[#0a0b12] border border-[#1e293b] text-white font-mono text-[10px] p-2 rounded">
            <option>normal</option><option>high</option><option>urgent</option>
          </select>
        </div>
        <div className="flex gap-2">
          <button onClick={submit}
            className="px-4 py-2 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/30 text-[10px] font-bold">
            📋 Olustur
          </button>
          <button onClick={onClose}
            className="px-4 py-2 rounded bg-gray-500/10 text-gray-400 border border-gray-500/30 text-[10px] font-bold">
            Iptal
          </button>
        </div>
      </div>
    </div>
  );
}
