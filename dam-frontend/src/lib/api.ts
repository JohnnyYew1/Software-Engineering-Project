// src/lib/api.ts
// JWT + 自动刷新 + “/api 去重(多重)” + 开发模式打印 + 可选超时

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

const ACCESS_TOKEN_KEY = 'accessToken';
const REFRESH_TOKEN_KEY = 'refreshToken';

// 允许 BASE_URL 为空（同源），或 http://host:8000 或 http://host:8000/api
export const BASE_URL = (process.env.NEXT_PUBLIC_API_BASE || 'http://127.0.0.1:8000').replace(/\/+$/, '');

export function getAccessToken(): string | null {
  if (typeof window === 'undefined') return null;
  try { return localStorage.getItem(ACCESS_TOKEN_KEY); } catch { return null; }
}
export function setAccessToken(token: string | null) {
  if (typeof window === 'undefined') return;
  try { token ? localStorage.setItem(ACCESS_TOKEN_KEY, token) : localStorage.removeItem(ACCESS_TOKEN_KEY); } catch {}
}
export function getRefreshToken(): string | null {
  if (typeof window === 'undefined') return null;
  try { return localStorage.getItem(REFRESH_TOKEN_KEY); } catch { return null; }
}
export function setRefreshToken(token: string | null) {
  if (typeof window === 'undefined') return;
  try { token ? localStorage.setItem(REFRESH_TOKEN_KEY, token) : localStorage.removeItem(REFRESH_TOKEN_KEY); } catch {}
}
export function clearTokens() {
  setAccessToken(null); setRefreshToken(null);
  try { if (typeof window !== 'undefined') localStorage.removeItem('currentUser'); } catch {}
}

function isAbsoluteUrl(path: string) { return /^https?:\/\//i.test(path); }

/**
 * 更健壮的 URL 拼接：
 * - 支持绝对 URL（直接返回）
 * - BASE_URL 可包含或不包含 /api
 * - path 可包含或不包含 /api
 * - 自动“去重所有重复的 /api”（例如 /api/api/assets -> /api/assets）
 */
export function joinUrl(path: string) {
  if (isAbsoluteUrl(path)) return path;

  const p = path.startsWith('/') ? path : `/${path}`;
  if (!BASE_URL) {
    return normalizeApiPath(p);
  }

  const base = BASE_URL; // e.g. http://127.0.0.1:8000 或 http://127.0.0.1:8000/api
  const baseHasApi = /\/api$/i.test(base);
  const pathHasApi = /^\/api(\/|$)/i.test(p);

  let joined = '';
  if (baseHasApi && pathHasApi) {
    // 去掉 path 上的一个 '/api' 再拼接
    joined = `${base}${p.replace(/^\/api(\/|$)/i, '/')}`;
  } else {
    joined = `${base}${p}`;
  }
  return normalizeApiPath(joined);
}

/** 把 url 中的多重 "/api" 去重为一个（只处理路径部分，不动协议域名） */
function normalizeApiPath(url: string) {
  try {
    const u = new URL(url, 'http://_dummy.host'); // 基于虚拟 host 解析
    // 示例：/api/api/assets// => /api/assets/
    const normPath = u.pathname
      .replace(/\/{2,}/g, '/')         // 连续斜杠 -> 单斜杠
      .replace(/(?:\/api)+\//i, '/api/') // 多重 /api -> 一个 /api
      .replace(/\/$/, '/') || '/';     // 确保目录风格正常
    u.pathname = normPath;
    return url.startsWith('http') ? u.href.replace('http://_dummy.host', '') : `${u.pathname}${u.search}${u.hash}`;
  } catch {
    // 回退：尽量做去重
    return url
      .replace(/\/{2,}/g, '/')
      .replace(/(?:\/api)+\//i, '/api/');
  }
}

type ApiOptions = {
  method?: HttpMethod;
  headers?: Record<string, string>;
  body?: any;             // 自动 JSON.stringify（除非 FormData/字符串/URLSearchParams/Blob）
  signal?: AbortSignal;
  isFormData?: boolean;   // 兼容旧调用点
  timeoutMs?: number;     // 可选：请求超时时间
};

// 仅开发模式打印
function devLog(...args: any[]) {
  if (typeof process !== 'undefined' && process.env.NODE_ENV !== 'production') {
    // eslint-disable-next-line no-console
    console.log('[apiRequest]', ...args);
  }
}

// -------- 低层 fetch：不做刷新逻辑 --------
async function rawFetch<T = any>(
  path: string,
  opts: ApiOptions
): Promise<{ ok: boolean; resp: Response; data: T | string | undefined; isJSON: boolean }> {
  const url = joinUrl(path);
  const { method = 'GET', headers = {}, body, signal, timeoutMs } = opts;

  const finalHeaders: Record<string, string> = { ...headers };
  const token = getAccessToken();
  if (token) finalHeaders['Authorization'] = `Bearer ${token}`;

  // 判断 body 类型
  const isForm = typeof FormData !== 'undefined' && body instanceof FormData;
  const isUrlParams = typeof URLSearchParams !== 'undefined' && body instanceof URLSearchParams;
  const isBlob = typeof Blob !== 'undefined' && body instanceof Blob;
  const useJSON = !isForm && !isUrlParams && !isBlob && body != null && typeof body !== 'string';

  if (useJSON) {
    if (!finalHeaders['Content-Type']) finalHeaders['Content-Type'] = 'application/json';
    if (!finalHeaders['Accept']) finalHeaders['Accept'] = 'application/json';
  }

  const fetchBody =
    isForm ? (body as FormData)
    : isUrlParams ? (body as URLSearchParams)
    : isBlob ? (body as Blob)
    : typeof body === 'string' ? body
    : body != null ? JSON.stringify(body)
    : undefined;

  // 可选超时
  const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
  const timeoutId = (controller && timeoutMs && timeoutMs > 0)
    ? setTimeout(() => controller.abort(), timeoutMs)
    : null;

  const finalSignal = controller
    ? (signal
        ? (mergeAbortSignals(signal, controller.signal))
        : controller.signal)
    : signal;

  devLog(method, url);

  let resp: Response;
  try {
    resp = await fetch(url, {
      method, headers: finalHeaders, body: fetchBody, credentials: 'omit', signal: finalSignal,
    });
  } catch (e: any) {
    if (timeoutId) clearTimeout(timeoutId as any);
    const err: any = new Error(e?.message || 'Network error');
    err.status = -1;
    err.data = null;
    devLog('NETWORK ERROR', e?.message);
    throw err;
  }
  if (timeoutId) clearTimeout(timeoutId as any);

  if (resp.status === 204) {
    return { ok: resp.ok, resp, data: undefined, isJSON: false };
  }

  const contentType = resp.headers.get('content-type') || '';
  const isJSON = contentType.toLowerCase().includes('application/json');

  if (isJSON) {
    try {
      const json = (await resp.json()) as T;
      return { ok: resp.ok, resp, data: json, isJSON: true };
    } catch {
      const txt = await resp.text();
      return { ok: resp.ok, resp, data: (txt as unknown) as T, isJSON: false };
    }
  } else {
    const txt = await resp.text();
    return { ok: resp.ok, resp, data: (txt as unknown) as T, isJSON: false };
  }
}

function mergeAbortSignals(a: AbortSignal, b: AbortSignal): AbortSignal {
  const ctl = new AbortController();
  const onAbort = () => ctl.abort();
  a.addEventListener('abort', onAbort);
  b.addEventListener('abort', onAbort);
  return ctl.signal;
}

// -------- 刷新 access token --------
async function tryRefreshAccessToken(): Promise<boolean> {
  const refresh = getRefreshToken();
  if (!refresh) return false;
  try {
    const r = await fetch(joinUrl('/api/token/refresh/'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ refresh }),
      credentials: 'omit',
    });
    if (!r.ok) return false;
    const json = await r.json().catch(() => ({}));
    if (json?.access) { setAccessToken(json.access); return true; }
    return false;
  } catch {
    return false;
  }
}

function isTokenInvalid(status: number, payload: any): boolean {
  if (!(status === 401 || status === 403)) return false;
  if (!payload || typeof payload !== 'object') return false;
  const code = (payload as any).code || '';
  const detail = (payload as any).detail || '';
  return code === 'token_not_valid' || /token not valid/i.test(String(detail));
}

// -------- 对外 API：带自动刷新一次 --------
export async function apiRequest<T = any>(path: string, options: ApiOptions = {}): Promise<T> {
  const first = await rawFetch<T>(path, options);
  if (first.ok) return first.data as T;

  if (isTokenInvalid(first.resp.status, first.data)) {
    const refreshed = await tryRefreshAccessToken();
    if (refreshed) {
      const second = await rawFetch<T>(path, options);
      if (second.ok) return second.data as T;

      devLog('HTTP ERROR', second.resp.status, preview(second.data));
      const err2: any = new Error(
        (second.isJSON && ((second.data as any)?.detail || (second.data as any)?.error)) ||
        second.resp.statusText || `HTTP ${second.resp.status}`
      );
      err2.status = second.resp.status; err2.data = second.data; throw err2;
    } else {
      clearTokens();
    }
  }

  devLog('HTTP ERROR', first.resp.status, preview(first.data));
  const err: any = new Error(
    (first.isJSON && ((first.data as any)?.detail || (first.data as any)?.error)) ||
    first.resp.statusText || `HTTP ${first.resp.status}`
  );
  err.status = first.resp.status; err.data = first.data; throw err;
}

function preview(x: any) {
  try {
    const s = typeof x === 'string' ? x : JSON.stringify(x);
    return s.length > 200 ? s.slice(0, 200) + '…' : s;
  } catch { return String(x); }
}
