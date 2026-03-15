"use client";
/**
 * COWORK.ARMY — Onboarding Wizard
 * New users select their sector and get a custom agent army generated.
 */
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { getAuthToken } from "@/lib/cowork-api";

const BASE = process.env.NEXT_PUBLIC_COWORK_API_URL || "/cowork-api";

interface Template {
  id: string;
  name: string;
  icon: string;
  desc: string;
  agent_count: number;
}

const SECTOR_EXTRAS: Record<string, { color: string; gradient: string }> = {
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
    if (!getAuthToken()) {
      router.replace("/login");
      return;
    }
    fetch(`${BASE}/templates`)
      .then(r => r.json())
      .then(setTemplates)
      .catch(() => setError("Sablonlar yuklenemedi"));
  }, [router]);

  const handleSetup = async () => {
    if (!selected) return;
    setStep("creating");
    setProgress(10);

    try {
      const fd = new FormData();
      fd.append("template_id", selected);
      fd.append("company_name", companyName);

      const interval = setInterval(() => {
        setProgress(p => Math.min(p + Math.random() * 15, 90));
      }, 500);

      const token = getAuthToken();
      const headers: Record<string, string> = {};
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const res = await fetch(`${BASE}/onboarding/setup`, {
        method: "POST",
        body: fd,
        headers,
      });

      clearInterval(interval);

      if (!res.ok) {
        const data = await res.json().catch(() => ({ detail: "Kurulum hatasi" }));
        throw new Error(data.detail);
      }

      const result = await res.json();
      setProgress(100);

      await refreshUser();

      setTimeout(() => router.replace("/"), 1500);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Bir hata olustu");
      setStep("confirm");
    }
  };

  const selectedTemplate = templates.find(t => t.id === selected);
  const extras = selected ? SECTOR_EXTRAS[selected] || { color: "#fbbf24", gradient: "from-amber-500/20 to-orange-500/20" } : null;

  return (
    <div className="min-h-screen py-8 px-4" style={{ background: "radial-gradient(ellipse at center, #0d0e1a 0%, #060710 70%)" }}>
      <div className="max-w-[800px] mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-2xl mx-auto mb-3 shadow-lg shadow-amber-500/20">
            👑
          </div>
          <h1 className="text-xl font-extrabold tracking-[4px]">
            COWORK<span className="text-amber-400">.ARMY</span>
          </h1>
          <p className="text-[10px] text-gray-500 tracking-[3px] mt-1">
            {user ? `Hosgeldin, ${user.name}!` : "AGENT ORDUNU KUR"}
          </p>
        </div>

        {/* Step indicator */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {["Sektor Sec", "Onayla", "Kurulum"].map((label, i) => {
            const stepIdx = step === "sector" ? 0 : step === "confirm" ? 1 : 2;
            return (
              <div key={label} className="flex items-center gap-2">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold border transition-all ${
                  i <= stepIdx
                    ? "bg-amber-500/20 text-amber-400 border-amber-500/30"
                    : "bg-gray-500/10 text-gray-600 border-gray-500/20"
                }`}>
                  {i < stepIdx ? "✓" : i + 1}
                </div>
                <span className={`text-[9px] tracking-wider ${i <= stepIdx ? "text-amber-400" : "text-gray-600"}`}>
                  {label}
                </span>
                {i < 2 && <div className={`w-12 h-px ${i < stepIdx ? "bg-amber-500/30" : "bg-gray-500/20"}`} />}
              </div>
            );
          })}
        </div>

        {/* STEP 1: Sector Selection */}
        {step === "sector" && (
          <div>
            <h2 className="text-sm font-bold text-center text-gray-300 mb-1">Sektorunuzu Secin</h2>
            <p className="text-[10px] text-gray-500 text-center mb-6">
              Isletmenize ozel agent ordusu olusturulacak
            </p>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
              {templates.map(t => {
                const ex = SECTOR_EXTRAS[t.id] || { color: "#fbbf24", gradient: "from-amber-500/20 to-orange-500/20" };
                const isSelected = selected === t.id;
                return (
                  <button
                    key={t.id}
                    onClick={() => setSelected(t.id)}
                    className={`relative p-4 rounded-xl border transition-all text-left ${
                      isSelected
                        ? `bg-gradient-to-br ${ex.gradient} border-[${ex.color}]/40 scale-[1.02] shadow-lg`
                        : "bg-[#0b0c14]/80 border-[#1a1f30] hover:bg-[#0f1019] hover:scale-[1.01]"
                    }`}
                    style={isSelected ? { borderColor: `${ex.color}66` } : {}}
                  >
                    <div className="text-3xl mb-2">{t.icon}</div>
                    <div className="text-[11px] font-bold" style={{ color: isSelected ? ex.color : "#e2e8f0" }}>
                      {t.name}
                    </div>
                    <div className="text-[8px] text-gray-500 mt-1 line-clamp-2">{t.desc}</div>
                    <div className="text-[7px] mt-2 px-1.5 py-0.5 rounded bg-white/5 inline-block"
                      style={{ color: ex.color }}>
                      {t.agent_count} + 1 CEO Agent
                    </div>
                    {isSelected && (
                      <div className="absolute top-2 right-2 w-5 h-5 rounded-full flex items-center justify-center text-[10px]"
                        style={{ background: `${ex.color}33`, color: ex.color }}>
                        ✓
                      </div>
                    )}
                  </button>
                );
              })}
            </div>

            <div className="flex justify-center">
              <button
                onClick={() => selected && setStep("confirm")}
                disabled={!selected}
                className="px-8 py-3 rounded-lg bg-gradient-to-r from-amber-500 to-orange-500 text-black font-extrabold text-[11px] tracking-[2px] hover:from-amber-400 hover:to-orange-400 transition-all disabled:opacity-30 shadow-lg shadow-amber-500/20">
                DEVAM ET →
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: Confirm */}
        {step === "confirm" && selectedTemplate && extras && (
          <div className="max-w-[500px] mx-auto">
            <div className={`bg-gradient-to-br ${extras.gradient} border rounded-xl p-6 mb-6`}
              style={{ borderColor: `${extras.color}33` }}>
              <div className="flex items-center gap-3 mb-4">
                <span className="text-4xl">{selectedTemplate.icon}</span>
                <div>
                  <div className="text-sm font-bold" style={{ color: extras.color }}>{selectedTemplate.name}</div>
                  <div className="text-[9px] text-gray-400">{selectedTemplate.desc}</div>
                </div>
              </div>

              <div className="bg-[#060710]/50 rounded-lg p-3 mb-4">
                <div className="text-[8px] text-gray-500 tracking-[2px] mb-2">OLUSTURULACAK AGENTLAR</div>
                <div className="text-[10px] text-gray-300">
                  <span className="font-bold" style={{ color: extras.color }}>{selectedTemplate.agent_count}</span> uzman agent + <span className="font-bold text-amber-400">1 CEO Agent</span> (yonetici)
                </div>
                <div className="text-[8px] text-gray-500 mt-1">
                  CEO Agent tum agentlarinizi yonetir, gorev dagitir ve koordine eder
                </div>
              </div>

              <div>
                <label className="text-[8px] text-gray-500 tracking-[2px] block mb-1.5">SIRKET / PROJE ADI</label>
                <input
                  value={companyName}
                  onChange={e => setCompanyName(e.target.value)}
                  placeholder="Sirket veya proje adiniz (opsiyonel)"
                  className="w-full bg-[#060710] border border-[#1e293b] text-white font-mono text-[11px] p-3 rounded-lg focus:border-amber-500/50 focus:outline-none"
                />
              </div>
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-[11px] text-red-400 mb-4">
                {error}
              </div>
            )}

            <div className="flex gap-3 justify-center">
              <button onClick={() => { setStep("sector"); setError(""); }}
                className="px-6 py-3 rounded-lg bg-gray-500/10 text-gray-400 border border-gray-500/30 text-[10px] font-bold">
                ← Geri
              </button>
              <button onClick={handleSetup}
                className="px-8 py-3 rounded-lg bg-gradient-to-r from-amber-500 to-orange-500 text-black font-extrabold text-[11px] tracking-[2px] hover:from-amber-400 hover:to-orange-400 transition-all shadow-lg shadow-amber-500/20">
                ORDUYU KUR 🚀
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: Creating */}
        {step === "creating" && (
          <div className="max-w-[400px] mx-auto text-center">
            <div className="text-5xl mb-4 animate-bounce">⚔️</div>
            <h2 className="text-sm font-bold text-amber-400 mb-2">Agent Ordunuz Kuruluyor...</h2>
            <p className="text-[10px] text-gray-500 mb-6">
              {progress < 100
                ? "Agentlar olusturuluyor, workspace'ler hazirlaniyor..."
                : "Tamamlandi! Dashboard'a yonlendiriliyorsunuz..."}
            </p>

            {/* Progress bar */}
            <div className="w-full h-2 bg-[#0b0c14] rounded-full border border-[#1a1f30] overflow-hidden mb-4">
              <div
                className="h-full bg-gradient-to-r from-amber-500 to-orange-500 rounded-full transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
            <div className="text-[10px] text-gray-500">{Math.round(progress)}%</div>

            {progress >= 100 && (
              <div className="mt-4 text-[11px] text-green-400 font-bold animate-pulse">
                ✅ {selectedTemplate?.agent_count ? selectedTemplate.agent_count + 1 : ""} agent hazir!
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
