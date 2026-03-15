"use client"
import { useState, memo } from "react"
import { createAgent } from "@/lib/cowork-api"

interface Props {
  onClose: () => void
  onCreated: () => void
}

function AgentModal({ onClose, onCreated }: Props) {
  const [agentId, setAgentId] = useState("")
  const [name, setName] = useState("")
  const [icon, setIcon] = useState("")
  const [domain, setDomain] = useState("")
  const [desc, setDesc] = useState("")
  const [skills, setSkills] = useState("")
  const [systemPrompt, setSystemPrompt] = useState("")

  const submit = async () => {
    if (!agentId || !name) return
    await createAgent({
      id: agentId, name, icon: icon || "\u{1F916}", tier: "WORKER", color: "#818cf8",
      domain, desc, skills: skills.split(",").map(s => s.trim()).filter(Boolean),
      rules: [], triggers: [], workspace_dir: agentId, system_prompt: systemPrompt,
    })
    onCreated()
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center" onClick={onClose}>
      <div className="bg-[#0f1019] border border-[#fbbf2440] rounded-xl p-6 w-[420px]" onClick={e => e.stopPropagation()}>
        <h2 className="text-sm font-bold text-amber-400 mb-4">+ Yeni Agent</h2>
        <div className="flex gap-2 mb-2">
          <input value={agentId} onChange={e => setAgentId(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
            placeholder="agent-id (orn: seo-expert)"
            className="flex-1 bg-[#0a0b12] border border-[#1e293b] text-white font-mono text-[10px] p-2 rounded" />
          <input value={icon} onChange={e => setIcon(e.target.value)} placeholder="Icon"
            className="w-14 bg-[#0a0b12] border border-[#1e293b] text-white text-center text-sm p-2 rounded" />
        </div>
        <input value={name} onChange={e => setName(e.target.value)} placeholder="Agent adi"
          className="w-full bg-[#0a0b12] border border-[#1e293b] text-white font-mono text-[10px] p-2 rounded mb-2" />
        <input value={domain} onChange={e => setDomain(e.target.value)} placeholder="Domain (orn: SEO & Content)"
          className="w-full bg-[#0a0b12] border border-[#1e293b] text-white font-mono text-[10px] p-2 rounded mb-2" />
        <textarea value={desc} onChange={e => setDesc(e.target.value)} placeholder="Aciklama"
          className="w-full bg-[#0a0b12] border border-[#1e293b] text-white font-mono text-[10px] p-2 rounded mb-2 h-16 resize-none" />
        <input value={skills} onChange={e => setSkills(e.target.value)} placeholder="Yetenekler (virgul ile ayirin)"
          className="w-full bg-[#0a0b12] border border-[#1e293b] text-white font-mono text-[10px] p-2 rounded mb-2" />
        <textarea value={systemPrompt} onChange={e => setSystemPrompt(e.target.value)} placeholder="System prompt (opsiyonel)"
          className="w-full bg-[#0a0b12] border border-[#1e293b] text-white font-mono text-[10px] p-2 rounded mb-3 h-16 resize-none" />
        <div className="flex gap-2">
          <button onClick={submit} disabled={!agentId || !name}
            className="px-4 py-2 rounded bg-amber-500/10 text-amber-400 border border-amber-500/30 text-[10px] font-bold disabled:opacity-30">
            + Olustur
          </button>
          <button onClick={onClose} className="px-4 py-2 rounded bg-gray-500/10 text-gray-400 border border-gray-500/30 text-[10px] font-bold">
            Iptal
          </button>
        </div>
      </div>
    </div>
  )
}

export default memo(AgentModal)
