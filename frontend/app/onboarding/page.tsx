"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { getAuthToken } from "@/lib/cowork-api";

const BASE = "/cowork-api";

interface Template { id: string; name: string; icon: string; desc: string; agent_count: number; }

const SECTOR_COLORS: Record<string, { color: string; gradient: string }> = {
  ecommerce:  { color: "#f59e0b", gradient: "from-amber-500/20 to-orange-500/20" },
  marketing:  { color: "#ec4899", gradient: "from-pink-500/20 to-rose-500/20" },
  software:   { color: "#8b5cf6", gradient: "from-violet-500/20 to-purple-500/20" },
  trading:    { color: "#22c55e", gradient: "from-green-500/20 to-emerald-500/20" },
  healthcare: { color: "#06b6d4", gradient: "from-cyan-500/20 to-teal-500/20" },
  restaurant: { color: "#f97316", gradient: "from-orange-500/20 to-red-500/20" },
  realestate: { color: "#3b82f6", gradient: "from-blue-500/20 to-indigo-500/20" },
  education:  { color: "#a855f7", gradient: "from-purple-500/20 to-fuchsia-500/20" },
};

export default function OnboardingPage() {
  const router = useRouter();
  const { user, refreshUser } = useAuth();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [companyName, setCompanyName] = useState("");
  const [step, setStep] = useState<"sector" | "confirm" | "creating">("sector");
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!getAuthToken()) { router.replace("/login"); return; }
    fetch(`${BASE}/templates`).then(r => r.json()).then(setTemplates).catch(() => setError("Sablonlar yuklenemedi"));
  }, [router]);

  const handleSetup = async () => {
    if (!selected) return;
    setStep("creating"); setProgress(10);
    try {
      const fd = new FormData();
      fd.append("template_id", selected);
      fd.append("company_name", companyName);
      const interval = setInterval(() => setProgress(p => Math.min(p + Math.random() * 15, 90)), 500);
      const token = getAuthToken();
      const headers: Record<string, string> = {};
      if (token) headers["Authorization"] = `Bearer ${token}`;
      const res = await fetch(`${BASE}/onboarding/setup`, { method: "POST", body: fd, headers });
      clearInterval(interval);
      if (!res.ok) { const d = await res.json().catch(() => ({ detail: "Kurulum hatasi" })); throw new Error(d.detail); }
      setProgress(100);
      await refreshUser();
      setTimeout(() => router.replace("/"), 1500);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Bir hata olustu");
      setStep("confirm");
    }
  };

  const sel = templates.find(t => t.id === selected);
  const sc = selected ? SECTOR_COLORS[selected] || { color: "#fbbf24", gradient: "from-amber-500/20 to-orange-500/20" } : null;

  return (
    <div className="min-h-screen py-6 px-4" style={{ background: "radial-gradient(ellipse at center, #0d0e1a 0%, #060710 70%)" }}>
      <div className="max-w-[800px] mx-auto">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-xl mx-auto mb-2 shadow-lg shadow-amber-500/20">👑</div>
          <h1 className="text-lg font-extrabold tracking-[4px] font-mono">COWORK<span className="text-amber-400">.ARMY</span></h1>
          <p className="text-[9px] text-gray-500 tracking-[3px] mt-1 font-mono">{user ? `Hosgeldin, ${user.name}!` : "AGENT ORDUNU KUR"}</p>
        </div>

        {/* Steps */}
        <div className="flex items-center justify-center gap-1.5 mb-6">
          {["Sektor Sec", "Onayla", "Kurulum"].map((label, i) => {
            const idx = step === "sector" ? 0 : step === "confirm" ? 1 : 2;
            return (
              <div key={label} className="flex items-center gap-1.5">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-bold border font-mono ${
                  i <= idx ? "bg-amber-500/20 text-amber-400 border-amber-500/30" : "bg-gray-500/10 text-gray-600 border-gray-500/20"
                }`}>{i < idx ? "✓" : i + 1}</div>
                <span className={`text-[8px] tracking-wider font-mono hidden sm:inline ${i <= idx ? "text-amber-400" : "text-gray-600"}`}>{label}</span>
                {i < 2 && <div className={`w-6 sm:w-10 h-px ${i < idx ? "bg-amber-500/30" : "bg-gray-500/20"}`} />}
              </div>
            );
          })}
        </div>

        {/* STEP 1 */}
        {step === "sector" && (
          <div>
            <h2 className="text-sm font-bold text-center text-gray-300 mb-1 font-mono">Sektorunuzu Secin</h2>
            <p className="text-[10px] text-gray-500 text-center mb-5 font-mono">Isletmenize ozel agent ordusu olusturulacak</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5 mb-5">
              {templates.map(t => {
                const c = SECTOR_COLORS[t.id] || { color: "#fbbf24", gradient: "from-amber-500/20 to-orange-500/20" };
                const isSel = selected === t.id;
                return (
                  <button key={t.id} onClick={() => setSelected(t.id)}
                    className={`relative p-3 md:p-4 rounded-xl border transition-all text-left ${
                      isSel ? `bg-gradient-to-br ${c.gradient} scale-[1.02] shadow-lg` : "bg-[#0b0c14]/80 border-[#1a1f35] hover:bg-[#0f1019]"
                    }`} style={isSel ? { borderColor: `${c.color}66` } : {}}>
                    <div className="text-2xl md:text-3xl mb-1.5">{t.icon}</div>
                    <div className="text-[10px] md:text-[11px] font-bold font-mono" style={{ color: isSel ? c.color : "#e2e8f0" }}>{t.name}</div>
                    <div className="text-[7px] md:text-[8px] text-gray-500 mt-1 line-clamp-2 font-mono">{t.desc}</div>
                    <div className="text-[7px] mt-1.5 px-1.5 py-0.5 rounded bg-white/5 inline-block font-mono" style={{ color: c.color }}>
                      {t.agent_count} + 1 CEO
                    </div>
                    {isSel && <div className="absolute top-2 right-2 w-5 h-5 rounded-full flex items-center justify-center text-[10px]" style={{ background: `${c.color}33`, color: c.color }}>✓</div>}
                  </button>
                );
              })}
            </div>
            <div className="flex justify-center">
              <button onClick={() => selected && setStep("confirm")} disabled={!selected}
                className="px-8 py-3 rounded-lg bg-gradient-to-r from-amber-500 to-orange-500 text-black font-extrabold text-[11px] tracking-[2px] disabled:opacity-30 shadow-lg shadow-amber-500/20 font-mono">DEVAM ET →</button>
            </div>
          </div>
        )}

        {/* STEP 2 */}
        {step === "confirm" && sel && sc && (
          <div className="max-w-[460px] mx-auto">
            <div className={`bg-gradient-to-br ${sc.gradient} border rounded-xl p-5 mb-5`} style={{ borderColor: `${sc.color}33` }}>
              <div className="flex items-center gap-3 mb-3">
                <span className="text-3xl">{sel.icon}</span>
                <div>
                  <div className="text-sm font-bold font-mono" style={{ color: sc.color }}>{sel.name}</div>
                  <div className="text-[9px] text-gray-400 font-mono">{sel.desc}</div>
                </div>
              </div>
              <div className="bg-[#060710]/50 rounded-lg p-3 mb-3">
                <div className="text-[8px] text-gray-500 tracking-[2px] mb-1.5 font-mono">OLUSTURULACAK AGENTLAR</div>
                <div className="text-[10px] text-gray-300 font-mono">
                  <span className="font-bold" style={{ color: sc.color }}>{sel.agent_count}</span> uzman agent + <span className="font-bold text-amber-400">1 CEO Agent</span>
                </div>
              </div>
              <div>
                <label className="text-[8px] text-gray-500 tracking-[2px] block mb-1.5 font-mono">SIRKET / PROJE ADI</label>
                <input value={companyName} onChange={e => setCompanyName(e.target.value)} placeholder="Opsiyonel"
                  className="w-full bg-[#060710] border border-[#1e293b] text-white font-mono text-[12px] p-3 rounded-lg focus:border-amber-500/50 focus:outline-none" />
              </div>
            </div>
            {error && <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-[11px] text-red-400 mb-4 font-mono">{error}</div>}
            <div className="flex gap-3 justify-center">
              <button onClick={() => { setStep("sector"); setError(""); }} className="px-6 py-3 rounded-lg bg-gray-500/10 text-gray-400 border border-gray-500/30 text-[10px] font-bold font-mono">← Geri</button>
              <button onClick={handleSetup} className="px-8 py-3 rounded-lg bg-gradient-to-r from-amber-500 to-orange-500 text-black font-extrabold text-[11px] tracking-[2px] shadow-lg shadow-amber-500/20 font-mono">ORDUYU KUR</button>
            </div>
          </div>
        )}

        {/* STEP 3 */}
        {step === "creating" && (
          <div className="max-w-[400px] mx-auto text-center">
            <div className="text-4xl mb-3 animate-bounce">⚔️</div>
            <h2 className="text-sm font-bold text-amber-400 mb-2 font-mono">Agent Ordunuz Kuruluyor...</h2>
            <p className="text-[10px] text-gray-500 mb-5 font-mono">
              {progress < 100 ? "Agentlar olusturuluyor..." : "Tamamlandi! Yonlendiriliyorsunuz..."}
            </p>
            <div className="w-full h-2 bg-[#0b0c14] rounded-full border border-[#1a1f35] overflow-hidden mb-3">
              <div className="h-full bg-gradient-to-r from-amber-500 to-orange-500 rounded-full transition-all duration-500" style={{ width: `${progress}%` }} />
            </div>
            <div className="text-[10px] text-gray-500 font-mono">{Math.round(progress)}%</div>
            {progress >= 100 && <div className="mt-3 text-[11px] text-green-400 font-bold animate-pulse font-mono">✅ {sel?.agent_count ? sel.agent_count + 1 : ""} agent hazir!</div>}
          </div>
        )}
      </div>
    </div>
  );
}
