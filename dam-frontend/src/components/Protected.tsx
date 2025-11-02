// src/components/Protected.tsx
"use client";
import React from "react";
import { useAuth } from "@/contexts/AuthContext";

export default function Protected({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return null; // 你的项目里自己有加载样式就用页面里的
  if (!user) return null;
  return <>{children}</>;
}
