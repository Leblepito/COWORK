"use client";
/**
 * COWORK.ARMY — Login / Register Page
 * Email/password + Social login (Google, Facebook, Telegram)
 */
import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { registerUser, loginUser, socialLogin, telegramVerify, getAuthToken, setAuthToken } from "@/lib/cowork-api";

// OAuth config — reads from env or uses empty (buttons hidden when not configured)
const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "";
const FACEBOOK_APP_ID = process.env.NEXT_PUBLIC_FACEBOOK_APP_ID || "";
const TELEGRAM_BOT_NAME = process.env.NEXT_PUBLIC_TELEGRAM_BOT_NAME || "";

// Backend base for OAuth callbacks
const API_BASE = process.env.NEXT_PUBLIC_COWORK_API_URL || "/cowork-api";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [company, setCompany] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [socialLoading, setSocialLoading] = useState("");

  useEffect(() => {
    if (getAuthToken()) router.replace("/");
  }, [router]);

  // Listen for OAuth popup callback messages
  const handleAuthMessage = useCallback((event: MessageEvent) => {
    if (event.data?.type === "social-auth" && event.data?.token) {
      setAuthToken(event.data.token);
      const plan = event.data.user?.plan || "free";
      router.replace(plan === "free" ? "/onboarding" : "/");
    }
  }, [router]);

  useEffect(() => {
    window.addEventListener("message", handleAuthMessage);
    return () => window.removeEventListener("message", handleAuthMessage);
  }, [handleAuthMessage]);

  // Load Telegram Login Widget script
  useEffect(() => {
    if (!TELEGRAM_BOT_NAME) return;
    const existing = document.getElementById("telegram-login-script");
    if (existing) return;
    const script = document.createElement("script");
    script.id = "telegram-login-script";
    script.src = "https://telegram.org/js/telegram-widget.js?22";
    script.async = true;
    document.body.appendChild(script);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      if (mode === "register") {
        if (!name.trim()) { setError("Isim gerekli"); setLoading(false); return; }
        await registerUser(email, password, name, company);
        router.replace("/onboarding");
        setLoading(false);
        return;
      } else {
        const result = await loginUser(email, password);
        if (result.user.plan === "free") {
          router.replace("/onboarding");
          setLoading(false);
          return;
        }
      }
      router.replace("/");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Bir hata olustu");
    }
    setLoading(false);
  };

  const handleGoogleLogin = () => {
    if (!GOOGLE_CLIENT_ID) { setError("Google OAuth yapilandirilmamis"); return; }
    setSocialLoading("google");
    const redirectUri = `${window.location.origin}${API_BASE}/auth/google/callback`;
    const params = new URLSearchParams({
      client_id: GOOGLE_CLIENT_ID,
      redirect_uri: redirectUri,
      response_type: "code",
      scope: "openid email profile",
      access_type: "offline",
      prompt: "select_account",
    });
    const popup = window.open(
      `https://accounts.google.com/o/oauth2/v2/auth?${params}`,
      "google-login", "width=500,height=600,menubar=no,toolbar=no"
    );
    // Reset loading after popup closes
    const timer = setInterval(() => {
      if (!popup || popup.closed) { clearInterval(timer); setSocialLoading(""); }
    }, 500);
  };

  const handleFacebookLogin = () => {
    if (!FACEBOOK_APP_ID) { setError("Facebook OAuth yapilandirilmamis"); return; }
    setSocialLoading("facebook");
    const redirectUri = `${window.location.origin}${API_BASE}/auth/facebook/callback`;
    const params = new URLSearchParams({
      client_id: FACEBOOK_APP_ID,
      redirect_uri: redirectUri,
      response_type: "code",
      scope: "email,public_profile",
    });
    const popup = window.open(
      `https://www.facebook.com/v19.0/dialog/oauth?${params}`,
      "facebook-login", "width=500,height=600,menubar=no,toolbar=no"
    );
    const timer = setInterval(() => {
      if (!popup || popup.closed) { clearInterval(timer); setSocialLoading(""); }
    }, 500);
  };

  const handleTelegramLogin = () => {
    if (!TELEGRAM_BOT_NAME) { setError("Telegram bot yapilandirilmamis"); return; }
    setSocialLoading("telegram");
    // Telegram widget callback
    (window as Record<string, unknown>).onTelegramAuth = async (user: Record<string, unknown>) => {
      try {
        const result = await telegramVerify(user);
        const plan = (result.user as Record<string, unknown>)?.plan || "free";
        router.replace(plan === "free" ? "/onboarding" : "/");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Telegram giris hatasi");
      }
      setSocialLoading("");
    };
    // Open Telegram login
    const popup = window.open(
      `https://oauth.telegram.org/auth?bot_id=${TELEGRAM_BOT_NAME}&origin=${encodeURIComponent(window.location.origin)}&request_access=write&return_to=${encodeURIComponent(window.location.href)}`,
      "telegram-login", "width=500,height=600,menubar=no,toolbar=no"
    );
    const timer = setInterval(() => {
      if (!popup || popup.closed) { clearInterval(timer); setSocialLoading(""); }
    }, 500);
  };

  const hasSocialLogin = GOOGLE_CLIENT_ID || FACEBOOK_APP_ID || TELEGRAM_BOT_NAME;

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

          {/* Social Login Buttons */}
          <div className="space-y-2.5 mb-5">
            {/* Google */}
            <button
              onClick={handleGoogleLogin}
              disabled={!!socialLoading}
              className="w-full flex items-center gap-3 py-3 px-4 rounded-lg bg-[#060710] border border-[#1e293b] hover:border-[#4285f4]/50 hover:bg-[#4285f4]/5 transition-all disabled:opacity-50 group"
            >
              <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              <span className="text-[12px] font-semibold text-gray-300 group-hover:text-white tracking-wide">
                {socialLoading === "google" ? "Bekleniyor..." : "Google ile devam et"}
              </span>
            </button>

            {/* Facebook */}
            <button
              onClick={handleFacebookLogin}
              disabled={!!socialLoading}
              className="w-full flex items-center gap-3 py-3 px-4 rounded-lg bg-[#060710] border border-[#1e293b] hover:border-[#1877f2]/50 hover:bg-[#1877f2]/5 transition-all disabled:opacity-50 group"
            >
              <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24" fill="#1877F2">
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
              </svg>
              <span className="text-[12px] font-semibold text-gray-300 group-hover:text-white tracking-wide">
                {socialLoading === "facebook" ? "Bekleniyor..." : "Facebook ile devam et"}
              </span>
            </button>

            {/* Telegram */}
            <button
              onClick={handleTelegramLogin}
              disabled={!!socialLoading}
              className="w-full flex items-center gap-3 py-3 px-4 rounded-lg bg-[#060710] border border-[#1e293b] hover:border-[#0088cc]/50 hover:bg-[#0088cc]/5 transition-all disabled:opacity-50 group"
            >
              <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24" fill="#0088CC">
                <path d="M11.944 0A12 12 0 000 12a12 12 0 0012 12 12 12 0 0012-12A12 12 0 0012 0a12 12 0 00-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 01.171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
              </svg>
              <span className="text-[12px] font-semibold text-gray-300 group-hover:text-white tracking-wide">
                {socialLoading === "telegram" ? "Bekleniyor..." : "Telegram ile devam et"}
              </span>
            </button>
          </div>

          {/* Divider */}
          <div className="flex items-center gap-3 mb-5">
            <div className="flex-1 h-px bg-[#1a1f30]" />
            <span className="text-[9px] text-gray-600 tracking-[2px]">VEYA</span>
            <div className="flex-1 h-px bg-[#1a1f30]" />
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
