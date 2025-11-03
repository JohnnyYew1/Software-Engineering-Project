// src/services/auth.ts
import { apiRequest, BASE_URL, setAccessToken, setRefreshToken } from "@/lib/api";

export type LoginMode = "jwt";

export type LoginCredentials = {
  username: string;
  password: string;
};

export type CurrentUser = {
  id: string | number;
  username?: string;
  first_name?: string;
  role?: "admin" | "editor" | "viewer";
};

const STORAGE_USER = "currentUser";

/** 小写归一化角色，防止后端返回大小写不同导致前端判断错 */
function normalizeRole(raw: unknown): "admin" | "editor" | "viewer" | undefined {
  const r = typeof raw === "string" ? raw.trim().toLowerCase() : "";
  return (["admin", "editor", "viewer"] as const).includes(r as any) ? (r as any) : undefined;
}

function readUser(): CurrentUser | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_USER);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CurrentUser;
    // 读出来时也做一次归一化兜底
    const fixed: CurrentUser = { ...parsed, role: normalizeRole(parsed?.role) };
    return fixed;
  } catch {
    return null;
  }
}
function writeUser(u: CurrentUser | null) {
  if (typeof window === "undefined") return;
  if (!u) {
    localStorage.removeItem(STORAGE_USER);
  } else {
    // 写入前再归一化一次
    const fixed: CurrentUser = { ...u, role: normalizeRole(u.role) };
    localStorage.setItem(STORAGE_USER, JSON.stringify(fixed));
  }
}

export const authService = {
  getCurrentUser(): CurrentUser | null {
    return readUser();
  },

  // 方案1：JWT 登录
  async login(
    cred: LoginCredentials,
  ): Promise<{ success: boolean; error?: string; user?: CurrentUser }> {
    try {
      // 1) 拿 token
      const tokenRes = await fetch(`${BASE_URL}/api/token/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(cred),
      });
      if (!tokenRes.ok) {
        const data = await tokenRes.json().catch(() => ({}));
        return { success: false, error: data?.detail || "Invalid credentials" };
      }
      const tokens = await tokenRes.json(); // { access, refresh }
      setAccessToken(tokens?.access || null);
      setRefreshToken(tokens?.refresh || null);

      // 2) 读取当前用户
      const me = await apiRequest<CurrentUser>("/api/me/");
      // ✅ 修正“id 重复定义被覆盖”的 TS 警告：先展开，再兜底 id
      // ✅ 同时把 role 统一成小写再存
      const ensured: CurrentUser = {
        ...me,
        id: (me as any)?.id ?? "0",
        role: normalizeRole((me as any)?.role),
      };
      writeUser(ensured);

      return { success: true, user: ensured };
    } catch (e: any) {
      return { success: false, error: e?.message || "Login failed" };
    }
  },

  async logout(): Promise<void> {
    writeUser(null);
    setAccessToken(null);
    setRefreshToken(null);
  },
};

// 兼容旧命名
export const getCurrentUser = () => authService.getCurrentUser();
export const loginJWT = async (username: string, password: string) =>
  authService.login({ username, password });
// ❌ 不再支持 session；若有地方误用，直白报错
export const loginSession = async (_u: string, _p: string) => {
  return { success: false, error: "Session flow not implemented. Use JWT login." };
};
export const logout = () => authService.logout();
