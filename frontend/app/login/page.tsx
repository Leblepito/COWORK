"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { registerUser, loginUser, socialLogin, getAuthToken } from "@/lib/cowork-api";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [company, setCompany] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => { if (getAuthToken()) router.replace("/"); }, [router]);

  const handleSocialLogin = async (provider: "google" | "telegram" | "facebook") => {
    setError(""); setLoading(true);
    try {
      // For production: integrate real OAuth flows.
      // Demo mode: generate a placeholder social ID for testing.
      const providerId = `${provider}_${Date.now()}`;
      const demoEmail = `demo_${provider}@cowork.army`;
      const demoName = provider === "google" ? "Google User" : provider === "telegram" ? "Telegram User" : "Facebook User";
      const result = await socialLogin(provider, providerId, demoEmail, demoName);
      router.replace(result.user.plan === "free" ? "/onboarding" : "/");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Sosyal giris hatasi");
    }
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(""); setLoading(true);
    try {
      if (mode === "register") {
        if (!name.trim()) { setError("Isim gerekli"); setLoading(false); return; }
        await registerUser(email, password, name, company);
        router.replace("/onboarding");
      } else {
        const result = await loginUser(email, password);
        router.replace(result.user.plan === "free" ? "/onboarding" : "/");
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Bir hata olustu");
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-8" style={{ background: "radial-gradient(ellipse at center, #0d0e1a 0%, #060710 70%)" }}>
      <div className="w-full max-w-[420px] relative">
        {/* Logo */}
        <div className="text-center mb-6 md:mb-8">
          <div className="w-14 h-14 md:w-16 md:h-16 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-2xl md:text-3xl mx-auto mb-3 shadow-lg shadow-amber-500/20">👑</div>
          <h1 className="text-xl md:text-2xl font-extrabold tracking-[4px] font-mono">COWORK<span className="text-amber-400">.ARMY</span></h1>
          <p className="text-[9px] md:text-[10px] text-gray-500 tracking-[3px] mt-1 font-mono">AI AGENT ARMY COMMAND CENTER</p>
        </div>

        {/* Card */}
        <div className="bg-[#0b0c14]/90 border border-[#1a1f35] rounded-2xl p-6 md:p-8 backdrop-blur-xl shadow-2xl">
          {/* Mode Toggle */}
          <div className="flex rounded-lg bg-[#060710] border border-[#1a1f35] p-1 mb-6">
            {(["login", "register"] as const).map(m => (
              <button key={m} onClick={() => { setMode(m); setError(""); }}
                className={`flex-1 text-[11px] py-2.5 rounded-md font-bold tracking-wider transition-all font-mono ${
                  mode === m ? "bg-gradient-to-r from-amber-500/20 to-orange-500/20 text-amber-400 border border-amber-500/30" : "text-gray-500 border border-transparent"
                }`}>
                {m === "login" ? "GIRIS YAP" : "KAYIT OL"}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="space-y-3.5">
            {mode === "register" && (
              <>
                <Field label="ISIM" value={name} onChange={setName} placeholder="Adiniz Soyadiniz" required />
                <Field label="SIRKET (OPSIYONEL)" value={company} onChange={setCompany} placeholder="Sirket adi" />
              </>
            )}
            <Field label="EMAIL" type="email" value={email} onChange={setEmail} placeholder="ornek@email.com" required />
            <Field label="SIFRE" type="password" value={password} onChange={setPassword}
              placeholder={mode === "register" ? "En az 6 karakter" : "Sifreniz"} required minLength={mode === "register" ? 6 : 1} />

            {error && <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-[11px] text-red-400 font-mono">{error}</div>}

            <button type="submit" disabled={loading}
              className="w-full py-3.5 rounded-lg bg-gradient-to-r from-amber-500 to-orange-500 text-black font-extrabold text-[12px] tracking-[2px] hover:from-amber-400 hover:to-orange-400 transition-all disabled:opacity-50 shadow-lg shadow-amber-500/20 font-mono">
              {loading ? "..." : mode === "login" ? "GIRIS YAP" : "HESAP OLUSTUR"}
            </button>
          </form>

          {/* Social Login Buttons */}
          <div className="mt-5 pt-4 border-t border-[#1a1f35]">
            <div className="text-[9px] text-gray-500 text-center mb-3 font-mono tracking-wider">VEYA SOSYAL HESAPLA DEVAM ET</div>
            <div className="flex flex-col gap-2">
              <button onClick={() => handleSocialLogin("google")}
                className="w-full flex items-center justify-center gap-2.5 py-3 rounded-lg bg-[#060710] border border-[#1e293b] hover:border-red-500/40 hover:bg-red-500/5 transition-all group">
                <svg className="w-4 h-4" viewBox="0 0 24 24"><path fill="#EA4335" d="M5.27 9.76A7.08 7.08 0 0 1 12 5.48c1.68 0 3.19.6 4.38 1.57l3.27-3.27A11.97 11.97 0 0 0 12 .5 12 12 0 0 0 1.24 6.65l4.03 3.11Z"/><path fill="#34A853" d="M16.04 18.01A7.4 7.4 0 0 1 12 19.26 7.08 7.08 0 0 1 5.27 14l-4.03 3.11A12 12 0 0 0 12 23.5c3.07 0 5.86-1.15 7.97-3.02l-3.93-2.47Z"/><path fill="#4A90D9" d="M19.97 20.48A11.82 11.82 0 0 0 23.5 12c0-.77-.08-1.57-.22-2.33H12v4.66h6.47a5.65 5.65 0 0 1-2.43 3.68l3.93 2.47Z"/><path fill="#FBBC05" d="M5.27 14a7.1 7.1 0 0 1 0-4.24L1.24 6.65A12 12 0 0 0 0 12c0 1.93.45 3.76 1.24 5.35l4.03-3.35Z"/></svg>
                <span className="text-[11px] font-bold text-gray-400 group-hover:text-red-400 font-mono tracking-wider">GMAIL</span>
              </button>
              <div className="flex gap-2">
                <button onClick={() => handleSocialLogin("telegram")}
                  className="flex-1 flex items-center justify-center gap-2 py-3 rounded-lg bg-[#060710] border border-[#1e293b] hover:border-blue-500/40 hover:bg-blue-500/5 transition-all group">
                  <svg className="w-4 h-4" viewBox="0 0 24 24"><path fill="#2AABEE" d="M12 0C5.37 0 0 5.37 0 12s5.37 12 12 12 12-5.37 12-12S18.63 0 12 0Zm5.53 8.15-1.83 8.63c-.14.62-.5.77-.99.48l-2.75-2.03-1.33 1.28c-.15.15-.27.27-.55.27l.2-2.8 5.1-4.6c.22-.2-.05-.3-.34-.12L8.66 13.2l-2.7-.84c-.59-.18-.6-.59.12-.87l10.56-4.07c.49-.18.92.12.76.87l.13-.14Z"/></svg>
                  <span className="text-[11px] font-bold text-gray-400 group-hover:text-blue-400 font-mono tracking-wider">TELEGRAM</span>
                </button>
                <button onClick={() => handleSocialLogin("facebook")}
                  className="flex-1 flex items-center justify-center gap-2 py-3 rounded-lg bg-[#060710] border border-[#1e293b] hover:border-blue-600/40 hover:bg-blue-600/5 transition-all group">
                  <svg className="w-4 h-4" viewBox="0 0 24 24"><path fill="#1877F2" d="M24 12c0-6.63-5.37-12-12-12S0 5.37 0 12c0 5.99 4.39 10.95 10.13 11.85V15.47H7.08V12h3.05V9.36c0-3.01 1.79-4.67 4.53-4.67 1.31 0 2.69.23 2.69.23v2.96h-1.52c-1.49 0-1.96.93-1.96 1.88V12h3.33l-.53 3.47h-2.8v8.38C19.61 22.95 24 17.99 24 12Z"/></svg>
                  <span className="text-[11px] font-bold text-gray-400 group-hover:text-blue-500 font-mono tracking-wider">FACEBOOK</span>
                </button>
              </div>
            </div>
          </div>

          {mode === "register" && (
            <div className="mt-5 pt-4 border-t border-[#1a1f35]">
              <div className="text-[9px] text-gray-500 text-center mb-3 font-mono">Hesabinizla neler yapabilirsiniz?</div>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { icon: "🤖", text: "Kendi agent ordunuz" },
                  { icon: "🎯", text: "Otomatik gorev dagitim" },
                  { icon: "📊", text: "Performans takibi" },
                  { icon: "⚡", text: "Coklu LLM destegi" },
                ].map((f, i) => (
                  <div key={i} className="flex items-center gap-2 text-[9px] text-gray-400 bg-[#060710]/50 rounded-lg p-2 font-mono">
                    <span className="text-sm">{f.icon}</span><span>{f.text}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="text-center mt-5 text-[8px] text-gray-600 tracking-wider font-mono">COWORK.ARMY — AI Agent Army Platform</div>
      </div>
    </div>
  );
}

function Field({ label, value, onChange, type = "text", placeholder, required, minLength }: {
  label: string; value: string; onChange: (v: string) => void;
  type?: string; placeholder?: string; required?: boolean; minLength?: number;
}) {
  return (
    <div>
      <label className="text-[8px] text-gray-500 tracking-[2px] block mb-1.5 font-mono">{label}</label>
      <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        required={required} minLength={minLength}
        className="w-full bg-[#060710] border border-[#1e293b] text-white font-mono text-[13px] md:text-[12px] p-3 rounded-lg focus:border-amber-500/50 focus:outline-none transition-colors" />
    </div>
  );
}
