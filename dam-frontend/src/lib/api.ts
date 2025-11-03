// src/lib/api.ts
// 统一 fetch；强制 JWT（方案1）。登录后把 accessToken 存到 localStorage，所有请求都会带上。
export const BASE_URL =
  (process.env.NEXT_PUBLIC_API_BASE || "http://127.0.0.1:8000").replace(/\/+$/, "");

const ACCESS_TOKEN_KEY = "accessToken";
const REFRESH_TOKEN_KEY = "refreshToken";

export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

export function getAccessToken(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem(ACCESS_TOKEN_KEY);
  } catch {
    return null;
  }
}
export function setAccessToken(token: string | null) {
  if (typeof window === "undefined") return;
  try {
    if (token) localStorage.setItem(ACCESS_TOKEN_KEY, token);
    else localStorage.removeItem(ACCESS_TOKEN_KEY);
  } catch {}
}
export function getRefreshToken(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem(REFRESH_TOKEN_KEY);
  } catch {
    return null;
  }
}
export function setRefreshToken(token: string | null) {
  if (typeof window === "undefined") return;
  try {
    if (token) localStorage.setItem(REFRESH_TOKEN_KEY, token);
    else localStorage.removeItem(REFRESH_TOKEN_KEY);
  } catch {}
}

type ApiOptions = {
  method?: HttpMethod;
  headers?: Record<string, string>;
  body?: any;
  isFormData?: boolean;
  signal?: AbortSignal;
};

/** 内部：真正发请求，不做刷新逻辑 */
async function rawFetch<T = any>(path: string, opts: ApiOptions): Promise<{ ok: boolean; resp: Response; data: T | string | null; isJSON: boolean; }> {
  const url = `${BASE_URL}${path.startsWith("/") ? "" : "/"}${path}`;
  const {
    method = "GET",
    headers = {},
    body,
    isFormData = false,
    signal,
  } = opts;

  const finalHeaders: Record<string, string> = { ...headers };

  // 强制 JWT
  const token = getAccessToken();
  if (token) {
    finalHeaders["Authorization"] = `Bearer ${token}`;
  }

  // Content-Type：仅在非 FormData 且 body 不是 string 时设为 JSON
  const useJSON = !isFormData && body && !(body instanceof FormData) && typeof body !== "string";
  if (useJSON) finalHeaders["Content-Type"] = "application/json";

  const fetchBody =
    body instanceof FormData
      ? body
      : typeof body === "string"
      ? body
      : body
      ? JSON.stringify(body)
      : undefined;

  const resp = await fetch(url, {
    method,
    headers: finalHeaders,
    body: fetchBody,
    credentials: "omit", // JWT 不用 Cookie
    signal,
  });

  const contentType = resp.headers.get("content-type") || "";
  const isJSON = contentType.includes("application/json");

  let data: any = null;
  if (isJSON) {
    try {
      data = await resp.json();
    } catch {
      data = null;
    }
  } else {
    data = await resp.text();
  }

  return { ok: resp.ok, resp, data, isJSON };
}

/** 自动刷新 access token（返回 true 表示已成功刷新） */
async function tryRefreshAccessToken(): Promise<boolean> {
  const refresh = getRefreshToken();
  if (!refresh) return false;
  try {
    const r = await fetch(`${BASE_URL}/api/token/refresh/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh }),
      credentials: "omit",
    });
    if (!r.ok) return false;
    const json = await r.json().catch(() => ({}));
    if (json?.access) {
      setAccessToken(json.access);
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

/** 判断是否是“token 无效”类错误（401/403 + token_not_valid） */
function isTokenInvalid(status: number, errData: any): boolean {
  if (!(status === 401 || status === 403)) return false;
  if (!errData || typeof errData !== "object") return false;
  const code = (errData as any).code || "";
  const detail = (errData as any).detail || "";
  return code === "token_not_valid" || /token not valid/i.test(String(detail));
}

/** 暴露给全局用的 API 调用（带自动刷新 & 重试） */
export async function apiRequest<T = any>(path: string, options: ApiOptions = {}): Promise<T> {
  // 第一次请求
  const first = await rawFetch<T>(path, options);
  if (first.ok) return first.data as T;

  // 如果是 token 无效 -> 尝试刷新后重试一次
  if (isTokenInvalid(first.resp.status, first.data)) {
    const refreshed = await tryRefreshAccessToken();
    if (refreshed) {
      const second = await rawFetch<T>(path, options);
      if (second.ok) return second.data as T;

      // 第二次依然失败，构造并抛出错误
      const err2: any = new Error(
        (second.isJSON && ((second.data as any)?.detail || (second.data as any)?.error)) || second.resp.statusText
      );
      err2.status = second.resp.status;
      err2.data = second.data;
      throw err2;
    } else {
      // 刷新失败，清空本地 token
      setAccessToken(null);
      setRefreshToken(null);
      try {
        localStorage.removeItem("currentUser");
      } catch {}
    }
  }

  // 其他错误 / 或刷新失败
  const err: any = new Error(
    (first.isJSON && ((first.data as any)?.detail || (first.data as any)?.error)) || first.resp.statusText
  );
  err.status = first.resp.status;
  err.data = first.data;
  throw err;
}
