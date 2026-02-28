"use client";

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import { useRouter } from "next/navigation";
import React from "react";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";
const TOKEN_KEY = "cowork_admin_token";

export interface AuthUser {
  id: number;
  email: string;
  full_name: string | null;
  role: string;
  is_active: boolean;
}

interface AuthCtx {
  user: AuthUser | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const Ctx = createContext<AuthCtx>({
  user: null,
  token: null,
  loading: true,
  login: async () => {},
  logout: () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    setUser(null);
    setToken(null);
    router.push("/auth/login");
  }, [router]);

  /* validate stored token on mount */
  useEffect(() => {
    const stored = localStorage.getItem(TOKEN_KEY);
    if (!stored) {
      setLoading(false);
      return;
    }
    (async () => {
      try {
        const res = await fetch(`${API}/auth/me`, {
          headers: { Authorization: `Bearer ${stored}` },
        });
        if (!res.ok) throw new Error();
        const data = await res.json();
        if (!["admin", "super_admin"].includes(data.role)) throw new Error("Not admin");
        setUser(data);
        setToken(stored);
      } catch {
        localStorage.removeItem(TOKEN_KEY);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const res = await fetch(`${API}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || "Invalid credentials");
    }
    const data = await res.json();
    const t = data.access_token as string;

    /* verify admin role */
    const meRes = await fetch(`${API}/auth/me`, {
      headers: { Authorization: `Bearer ${t}` },
    });
    if (!meRes.ok) throw new Error("Failed to fetch profile");
    const me = await meRes.json();
    if (!["admin", "super_admin"].includes(me.role)) throw new Error("Admin access required");

    localStorage.setItem(TOKEN_KEY, t);
    setUser(me);
    setToken(t);
  }, []);

  return React.createElement(Ctx.Provider, { value: { user, token, loading, login, logout } }, children);
}

export const useAuth = () => useContext(Ctx);
