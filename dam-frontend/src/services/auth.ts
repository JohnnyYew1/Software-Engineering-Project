import { apiRequest, setAccessToken, setRefreshToken, getAccessToken } from '@/lib/api';

export type LoginMode = 'jwt' | 'session';
export type Role = 'admin' | 'editor' | 'viewer';
export type LoginCredentials = { username: string; password: string; };

export type CurrentUser = {
  id: string | number;
  username?: string;
  first_name?: string;
  role?: Role;
  is_active?: boolean;
};

export type LoginResult = { success: boolean; error?: string; user?: CurrentUser };

const STORAGE_USER = 'currentUser';
const STORAGE_TOKENS = 'authTokens'; // 可选：保存 {access, refresh}

function readUser(): CurrentUser | null {
  if (typeof window === 'undefined') return null;
  try { return JSON.parse(localStorage.getItem(STORAGE_USER) || 'null'); } catch { return null; }
}
function writeUser(u: CurrentUser | null) {
  if (typeof window === 'undefined') return;
  if (!u) localStorage.removeItem(STORAGE_USER);
  else localStorage.setItem(STORAGE_USER, JSON.stringify(u));
}

async function ensureCsrf() {
  try { await apiRequest('/api/csrf/', { auth: 'session' }); } catch {}
}

export const authService = {
  getCurrentUser(): CurrentUser | null {
    return readUser();
  },

  async fetchCurrentUser(use: 'auto' | 'jwt' | 'session' = 'auto'): Promise<CurrentUser | null> {
    try {
      const me = await apiRequest('/api/me/', { auth: use as any });
      writeUser(me || null);
      return me || null;
    } catch {
      writeUser(null);
      return null;
    }
  },

  async login(cred: LoginCredentials, mode: LoginMode = 'session'): Promise<LoginResult> {
    try {
      if (mode === 'session') {
        // —— Session 登录 —— //
        await ensureCsrf();
        await apiRequest('/api/login/', {
          method: 'POST',
          body: cred,
          auth: 'session',
        });
        const me = await this.fetchCurrentUser('session');
        return { success: true, user: me || undefined };
      } else {
        // —— JWT 登录（SimpleJWT） —— //
        // 1) 获取 token
        const tokens = await apiRequest<{ access: string; refresh: string }>(
          '/api/token/',
          { method: 'POST', body: cred, auth: 'jwt' } // jwt 这里不需要 CSRF
        );
        setAccessToken(tokens.access);
        setRefreshToken(tokens.refresh);
        // 可选：保存整个 tokens
        try { localStorage.setItem(STORAGE_TOKENS, JSON.stringify(tokens)); } catch {}

        // 2) 用 Authorization: Bearer 访问当前用户
        const me = await this.fetchCurrentUser('jwt');
        return { success: true, user: me || undefined };
      }
    } catch (e: any) {
      return { success: false, error: e?.message || 'Login failed' };
    }
  },

  async logout(): Promise<void> {
    try {
      // 对于 Session：通知后端注销
      await ensureCsrf();
      try { await apiRequest('/api/logout/', { method: 'POST', auth: 'session' }); } catch {}
    } finally {
      // 清理本地
      writeUser(null);
      setAccessToken(null);
      setRefreshToken(null);
      try { localStorage.removeItem(STORAGE_TOKENS); } catch {}
    }
  },
};

// 兼容旧命名
export const getCurrentUser = () => authService.getCurrentUser();
export const loginJWT = (username: string, password: string) =>
  authService.login({ username, password }, 'jwt');
export const loginSession = (username: string, password: string) =>
  authService.login({ username, password }, 'session');
export const logout = () => authService.logout();
