// src/contexts/AuthContext.tsx
"use client";
import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { authService } from "@/services/auth";
import type { CurrentUser, LoginMode } from "@/services/auth";

interface AuthContextValue {
  user: CurrentUser | null;
  loading: boolean;
  login: (username: string, password: string, mode?: LoginMode) => Promise<{ ok: boolean; error?: string }>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const u = authService.getCurrentUser();
        if (mounted) setUser(u || null);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  // ✅ 不再支持 session；忽略第三参或仅允许 "jwt"
  const login = async (username: string, password: string) => {
    try {
      setLoading(true);
      const res = await authService.login({ username, password });
      if (!res.success) return { ok: false, error: res.error || "Login failed" };
      setUser(authService.getCurrentUser());
      return { ok: true };
    } catch (e: any) {
      return { ok: false, error: e?.message || "Login failed" };
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    setLoading(true);
    try {
      await authService.logout();
    } finally {
      setUser(null);
      setLoading(false);
    }
  };

  const refreshUser = async () => {
    setLoading(true);
    try {
      const u = authService.getCurrentUser();
      setUser(u || null);
    } finally {
      setLoading(false);
    }
  };

  const value = useMemo<AuthContextValue>(
    () => ({ user, loading, login, logout, refreshUser }),
    [user, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
