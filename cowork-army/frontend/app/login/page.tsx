"use client";
/**
 * COWORK.ARMY — Login / Register Page
 * Users can sign in or create an account to manage their own agent army.
 */
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { registerUser, loginUser, getAuthToken } from "@/lib/cowork-api";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [company, setCompany] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (getAuthToken()) router.replace("/");
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      if (mode === "register") {
        if (!name.trim()) { setError("Isim gerekli"); setLoading(false); return; }
        await registerUser(email, password, name, company);
      } else {
        await loginUser(email, password);
      }
      router.replace("/");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Bir hata olustu");
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: "radial-gradient(ellipse at center, #0d0e1a 0%, #060710 70%)" }}>
      {/* Background particles */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        {Array.from({ length: 30 }).map((_, i) => (
          <div key={i} className="absolute rounded-full opacity-20"
            style={{
              width: `${2 + Math.random() * 4}px`,
              height: `${2 + Math.random() * 4}px`,
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              background: ["#fbbf24", "#a855f7", "#22d3ee", "#ec4899", "#22c55e"][i % 5],
              animation: `pulse-dot ${2 + Math.random() * 3}s infinite ${Math.random() * 2}s`,
            }}
          />
        ))}
      </div>

      <div className="w-full max-w-[440px] relative">
        {/* Logo & Branding */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-3xl mx-auto mb-4 shadow-lg shadow-amber-500/20">
            👑
          </div>
          <h1 className="text-2xl font-extrabold tracking-[4px]">
            COWORK<span className="text-amber-400">.ARMY</span>
          </h1>
          <p className="text-[10px] text-gray-500 tracking-[3px] mt-1">AI AGENT ARMY COMMAND CENTER</p>
        </div>

        {/* Card */}
        <div className="bg-[#0b0c14]/90 border border-[#1a1f30] rounded-2xl p-8 backdrop-blur-xl shadow-2xl">
          {/* Mode Toggle */}
          <div className="flex rounded-lg bg-[#060710] border border-[#1a1f30] p-1 mb-6">
            <button
              onClick={() => { setMode("login"); setError(""); }}
              className={`flex-1 text-[11px] py-2.5 rounded-md font-bold tracking-wider transition-all ${
                mode === "login"
                  ? "bg-gradient-to-r from-amber-500/20 to-orange-500/20 text-amber-400 border border-amber-500/30"
                  : "text-gray-500 hover:text-gray-400 border border-transparent"
              }`}>
              GIRIS YAP
            </button>
            <button
              onClick={() => { setMode("register"); setError(""); }}
              className={`flex-1 text-[11px] py-2.5 rounded-md font-bold tracking-wider transition-all ${
                mode === "register"
                  ? "bg-gradient-to-r from-amber-500/20 to-orange-500/20 text-amber-400 border border-amber-500/30"
                  : "text-gray-500 hover:text-gray-400 border border-transparent"
              }`}>
              KAYIT OL
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === "register" && (
              <>
                <div>
                  <label className="text-[8px] text-gray-500 tracking-[2px] block mb-1.5">ISIM</label>
                  <input
                    value={name} onChange={e => setName(e.target.value)}
                    placeholder="Adiniz Soyadiniz"
                    className="w-full bg-[#060710] border border-[#1e293b] text-white font-mono text-[12px] p-3 rounded-lg focus:border-amber-500/50 focus:outline-none transition-colors"
                    required
                  />
                </div>
                <div>
                  <label className="text-[8px] text-gray-500 tracking-[2px] block mb-1.5">SIRKET (OPSIYONEL)</label>
                  <input
                    value={company} onChange={e => setCompany(e.target.value)}
                    placeholder="Sirket adi"
                    className="w-full bg-[#060710] border border-[#1e293b] text-white font-mono text-[12px] p-3 rounded-lg focus:border-amber-500/50 focus:outline-none transition-colors"
                  />
                </div>
              </>
            )}

            <div>
              <label className="text-[8px] text-gray-500 tracking-[2px] block mb-1.5">EMAIL</label>
              <input
                type="email" value={email} onChange={e => setEmail(e.target.value)}
                placeholder="ornek@email.com"
                className="w-full bg-[#060710] border border-[#1e293b] text-white font-mono text-[12px] p-3 rounded-lg focus:border-amber-500/50 focus:outline-none transition-colors"
                required
              />
            </div>

            <div>
              <label className="text-[8px] text-gray-500 tracking-[2px] block mb-1.5">SIFRE</label>
              <input
                type="password" value={password} onChange={e => setPassword(e.target.value)}
                placeholder={mode === "register" ? "En az 6 karakter" : "Sifreniz"}
                className="w-full bg-[#060710] border border-[#1e293b] text-white font-mono text-[12px] p-3 rounded-lg focus:border-amber-500/50 focus:outline-none transition-colors"
                required minLength={mode === "register" ? 6 : 1}
              />
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-[11px] text-red-400">
                {error}
              </div>
            )}

            <button
              type="submit" disabled={loading}
              className="w-full py-3.5 rounded-lg bg-gradient-to-r from-amber-500 to-orange-500 text-black font-extrabold text-[12px] tracking-[2px] hover:from-amber-400 hover:to-orange-400 transition-all disabled:opacity-50 shadow-lg shadow-amber-500/20">
              {loading ? "..." : mode === "login" ? "GIRIS YAP" : "HESAP OLUSTUR"}
            </button>
          </form>

          {mode === "register" && (
            <div className="mt-6 pt-4 border-t border-[#1a1f30]">
              <div className="text-[9px] text-gray-500 text-center mb-3">Hesabinizla neler yapabilirsiniz?</div>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { icon: "🤖", text: "Kendi agent ordunuzu kurun" },
                  { icon: "🎯", text: "Gorevleri otomatik dagitim" },
                  { icon: "📊", text: "Performans takibi" },
                  { icon: "⚡", text: "Coklu LLM destegi" },
                ].map((f, i) => (
                  <div key={i} className="flex items-center gap-2 text-[9px] text-gray-400 bg-[#060710]/50 rounded-lg p-2">
                    <span className="text-sm">{f.icon}</span>
                    <span>{f.text}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="text-center mt-6 text-[8px] text-gray-600 tracking-wider">
          COWORK.ARMY v9 — AI Agent Army Platform
        </div>
      </div>
    </div>
  );
}
