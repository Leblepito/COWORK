"use client"
import { useState, useEffect, memo } from "react"
import type { ApiKeyStatus } from "@/lib/cowork-api"
import { getApiKeyStatus, saveApiKey, setLlmProvider } from "@/lib/cowork-api"

interface Props {
  onClose: () => void
}

function SettingsModal({ onClose }: Props) {
  const [keyStatus, setKeyStatus] = useState<ApiKeyStatus | null>(null)
  const [activeProvider, setActiveProvider] = useState("anthropic")
  const [anthropicKey, setAnthropicKey] = useState("")
  const [geminiKey, setGeminiKey] = useState("")
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState("")

  useEffect(() => {
    getApiKeyStatus().then(s => {
      setKeyStatus(s)
      setActiveProvider(s.active_provider || "anthropic")
    }).catch(() => {})
  }, [])

  const handleProviderChange = async (p: string) => {
    setActiveProvider(p)
    try {
      await setLlmProvider(p)
      setMsg(`Provider: ${p}`)
      const s = await getApiKeyStatus()
      setKeyStatus(s)
    } catch { setMsg("Provider degistirilemedi") }
  }

  const handleSaveKey = async (provider: string, key: string) => {
    if (!key) return
    setSaving(true)
    try {
      await saveApiKey(key, provider)
      setMsg(`${provider} key kaydedildi`)
      const s = await getApiKeyStatus()
      setKeyStatus(s)
      if (provider === "anthropic") setAnthropicKey("")
      else setGeminiKey("")
    } catch { setMsg("Key kaydedilemedi") }
    setSaving(false)
  }

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center" onClick={onClose}>
      <div className="bg-[#0f1019] border border-[#fbbf2440] rounded-xl p-6 w-[420px]" onClick={e => e.stopPropagation()}>
        <h2 className="text-sm font-bold text-amber-400 mb-4">Settings</h2>

        {/* Provider Toggle */}
        <div className="text-[8px] text-gray-500 mb-1 tracking-wider">LLM PROVIDER</div>
        <div className="flex gap-2 mb-4">
          {(["anthropic", "gemini"] as const).map(p => (
            <button key={p} onClick={() => handleProviderChange(p)}
              className={`flex-1 text-[10px] py-2 rounded font-bold border transition-all ${
                activeProvider === p
                  ? "bg-amber-500/10 text-amber-400 border-amber-500/30"
                  : "bg-gray-500/5 text-gray-500 border-gray-500/20 hover:bg-gray-500/10"
              }`}>
              {p === "anthropic" ? "Claude (Anthropic)" : "Gemini (Google)"}
            </button>
          ))}
        </div>

        {/* Anthropic Key */}
        <div className="text-[8px] text-gray-500 mb-1 tracking-wider">
          ANTHROPIC API KEY
          {keyStatus?.anthropic?.set && <span className="text-green-400 ml-2">({keyStatus.anthropic.preview})</span>}
        </div>
        <div className="flex gap-2 mb-3">
          <input value={anthropicKey} onChange={e => setAnthropicKey(e.target.value)}
            type="password" placeholder="sk-ant-..."
            className="flex-1 bg-[#0a0b12] border border-[#1e293b] text-white font-mono text-[10px] p-2 rounded" />
          <button onClick={() => handleSaveKey("anthropic", anthropicKey)} disabled={saving || !anthropicKey}
            className="text-[9px] px-3 py-1 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/30 font-bold disabled:opacity-30">
            Kaydet
          </button>
        </div>

        {/* Gemini Key */}
        <div className="text-[8px] text-gray-500 mb-1 tracking-wider">
          GOOGLE API KEY
          {keyStatus?.gemini?.set && <span className="text-green-400 ml-2">({keyStatus.gemini.preview})</span>}
        </div>
        <div className="flex gap-2 mb-3">
          <input value={geminiKey} onChange={e => setGeminiKey(e.target.value)}
            type="password" placeholder="AIza..."
            className="flex-1 bg-[#0a0b12] border border-[#1e293b] text-white font-mono text-[10px] p-2 rounded" />
          <button onClick={() => handleSaveKey("gemini", geminiKey)} disabled={saving || !geminiKey}
            className="text-[9px] px-3 py-1 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/30 font-bold disabled:opacity-30">
            Kaydet
          </button>
        </div>

        {msg && <div className="text-[9px] text-amber-400 mb-3">{msg}</div>}

        <button onClick={onClose} className="px-4 py-2 rounded bg-gray-500/10 text-gray-400 border border-gray-500/30 text-[10px] font-bold">
          Kapat
        </button>
      </div>
    </div>
  )
}

export default memo(SettingsModal)
