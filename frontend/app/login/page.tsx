"use client";
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

  useEffect(() => { if (getAuthToken()) router.replace("/"); }, [router]);

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
