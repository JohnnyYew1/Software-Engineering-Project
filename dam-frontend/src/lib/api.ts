// src/lib/api.ts
// 统一 fetch；强制 JWT（方案1）。登录后把 accessToken 存到 localStorage，所有请求都会带上。
export const BASE_URL =
  (process.env.NEXT_PUBLIC_API_BASE || "http://127.0.0.1:8000").replace(/\/+$/, "");

const ACCESS_TOKEN_KEY = "accessToken";
const REFRESH_TOKEN_KEY = "refreshToken";

export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

export function getAccessToken(): string | null {
  if (typeof window === "undefined") return null;
  try { return localStorage.getItem(ACCESS_TOKEN_KEY); } catch { return null; }
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
  try { return localStorage.getItem(REFRESH_TOKEN_KEY); } catch { return null; }
}
export function setRefreshToken(token: string | null) {
  if (typeof window === "undefined") return;
  try {
    if (token) localStorage.setItem(REFRESH_TOKEN_KEY, token);
    else localStorage.removeItem(REFRESH_TOKEN_KEY);
  } catch {}
}

export async function apiRequest<T = any>(
  path: string,
  options: {
    method?: HttpMethod;
    headers?: Record<string, string>;
    body?: any;
    isFormData?: boolean;
    signal?: AbortSignal;
  } = {}
): Promise<T> {
  const url = `${BASE_URL}${path.startsWith("/") ? "" : "/"}${path}`;
  const {
    method = "GET",
    headers = {},
    body,
    isFormData = false,
    signal,
  } = options;

  const finalHeaders: Record<string, string> = { ...headers };

  // 强制 JWT
  const token = getAccessToken();
  if (token) {
    finalHeaders["Authorization"] = `Bearer ${token}`;
  }

  // JSON Content-Type
  if (!isFormData && body && !(body instanceof FormData)) {
    finalHeaders["Content-Type"] = "application/json";
  }

  const resp = await fetch(url, {
    method,
    headers: finalHeaders,
    body: body instanceof FormData ? body : body ? JSON.stringify(body) : undefined,
    credentials: "omit", // JWT 不用 Cookie
    signal,
  });

  const contentType = resp.headers.get("content-type") || "";
  const isJSON = contentType.includes("application/json");

  if (!resp.ok) {
    const errData = isJSON ? await resp.json().catch(() => ({})) : await resp.text();
    const err: any = new Error(
      (isJSON && (errData?.detail || errData?.error)) || resp.statusText
    );
    err.status = resp.status;
    err.data = errData;
    throw err;
  }

  if (isJSON) return (await resp.json()) as T;
  return (await resp.text()) as unknown as T;
}
