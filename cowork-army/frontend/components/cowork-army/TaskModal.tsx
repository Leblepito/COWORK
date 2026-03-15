"use client"
import { useState, memo } from "react"
import type { CoworkAgent } from "@/lib/cowork-api"
import { createCoworkTask } from "@/lib/cowork-api"

interface Props {
  agents: CoworkAgent[]
  onClose: () => void
  onCreated: () => void
}

function TaskModal({ agents, onClose, onCreated }: Props) {
  const [title, setTitle] = useState("")
  const [desc, setDesc] = useState("")
  const [agent, setAgent] = useState("")
  const [priority, setPriority] = useState("normal")

  const submit = async () => {
    if (!title) return
    await createCoworkTask(title, desc, agent, priority)
    onCreated()
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center" onClick={onClose}>
      <div className="bg-[#0f1019] border border-[#fbbf2440] rounded-xl p-6 w-[420px]" onClick={e => e.stopPropagation()}>
        <h2 className="text-sm font-bold text-amber-400 mb-4">📋 Görev Oluştur</h2>
        <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Görev başlığı"
          className="w-full bg-[#0a0b12] border border-[#1e293b] text-white font-mono text-[10px] p-2 rounded mb-2" />
        <textarea value={desc} onChange={e => setDesc(e.target.value)} placeholder="Açıklama (opsiyonel)"
          className="w-full bg-[#0a0b12] border border-[#1e293b] text-white font-mono text-[10px] p-2 rounded mb-2 h-20 resize-none" />
        <div className="flex gap-2 mb-3">
          <select value={agent} onChange={e => setAgent(e.target.value)}
            className="flex-1 bg-[#0a0b12] border border-[#1e293b] text-white font-mono text-[10px] p-2 rounded">
            <option value="">🎯 Otomatik (Commander)</option>
            {agents.map(a => <option key={a.id} value={a.id}>{a.icon} {a.name}</option>)}
          </select>
          <select value={priority} onChange={e => setPriority(e.target.value)}
            className="w-24 bg-[#0a0b12] border border-[#1e293b] text-white font-mono text-[10px] p-2 rounded">
            <option>normal</option><option>high</option><option>urgent</option>
          </select>
        </div>
        <div className="flex gap-2">
          <button onClick={submit} className="px-4 py-2 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/30 text-[10px] font-bold">
            📋 Oluştur
          </button>
          <button onClick={onClose} className="px-4 py-2 rounded bg-gray-500/10 text-gray-400 border border-gray-500/30 text-[10px] font-bold">
            İptal
          </button>
        </div>
      </div>
    </div>
  )
}

export default memo(TaskModal)
