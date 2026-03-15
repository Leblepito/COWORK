"use client";
import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";
import { useRouter, usePathname } from "next/navigation";
import { getCurrentUser, getAuthToken, logoutUser, type CoworkUser } from "./cowork-api";

interface AuthContextType {
  user: CoworkUser | null;
  loading: boolean;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null, loading: true, logout: () => {}, refreshUser: async () => {},
});

export function useAuth() { return useContext(AuthContext); }

const PUBLIC_PATHS = ["/login", "/onboarding"];

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<CoworkUser | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  const refreshUser = useCallback(async () => {
    const token = getAuthToken();
    if (!token) { setUser(null); setLoading(false); return; }
    try {
      const u = await getCurrentUser();
      setUser(u);
    } catch {
      logoutUser();
      setUser(null);
    }
    setLoading(false);
  }, []);

  useEffect(() => { refreshUser(); }, [refreshUser]);

  useEffect(() => {
    if (loading) return;
    if (!user && !PUBLIC_PATHS.includes(pathname)) {
      router.replace("/login");
      return;
    }
    if (user && user.plan === "free" && pathname === "/") {
      router.replace("/onboarding");
    }
  }, [loading, user, pathname, router]);

  const logout = useCallback(() => {
    logoutUser(); setUser(null); router.replace("/login");
  }, [router]);

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-[#060710]">
        <div className="text-center">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-2xl mx-auto mb-3 animate-pulse">👑</div>
          <div className="text-[10px] text-gray-500 tracking-[3px] font-mono">COWORK.ARMY</div>
        </div>
      </div>
    );
  }

  if (!user && !PUBLIC_PATHS.includes(pathname)) return null;

  return (
    <AuthContext.Provider value={{ user, loading, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}
