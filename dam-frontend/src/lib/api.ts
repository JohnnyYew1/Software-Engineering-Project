// 统一 fetch；支持 “auto / jwt / session” 三种模式：
// - auto（默认）：若本地有 JWT accessToken → 用 jwt，否则用 session
// - jwt：强制使用 Authorization Bearer
// - session：强制使用 Cookie + CSRF
export const BASE_URL =
  (process.env.NEXT_PUBLIC_API_BASE || "http://127.0.0.1:8000").replace(/\/+$/, "");

const ACCESS_TOKEN_KEY = "accessToken"; // JWT access
const REFRESH_TOKEN_KEY = "refreshToken"; // JWT refresh（可选）

function getCookie(name: string) {
  if (typeof document === "undefined") return "";
  const m = document.cookie.match(new RegExp("(^| )" + name + "=([^;]+)"));
  return m ? decodeURIComponent(m[2]) : "";
}

export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
export type AuthMode = "auto" | "jwt" | "session";

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
export function setRefreshToken(token: string | null) {
  if (typeof window === "undefined") return;
  try {
    if (token) localStorage.setItem(REFRESH_TOKEN_KEY, token);
    else localStorage.removeItem(REFRESH_TOKEN_KEY);
  } catch {}
}
export function getRefreshToken(): string | null {
  if (typeof window === "undefined") return null;
  try { return localStorage.getItem(REFRESH_TOKEN_KEY); } catch { return null; }
}

export async function apiRequest<T = any>(
  path: string,
  options: {
    method?: HttpMethod;
    headers?: Record<string, string>;
    body?: any;
    auth?: AuthMode;       // ✅ 默认 auto
    isFormData?: boolean;
    signal?: AbortSignal;
  } = {}
): Promise<T> {
  const url = `${BASE_URL}${path.startsWith("/") ? "" : "/"}${path}`;
  let {
    method = "GET",
    headers = {},
    body,
    auth = "auto",
    isFormData = false,
    signal,
  } = options;

  const finalHeaders: Record<string, string> = { ...headers };

  // ✅ auto 逻辑：有 token 用 jwt，否则走 session
  if (auth === "auto") {
    auth = getAccessToken() ? "jwt" : "session";
  }

  if (auth === "jwt") {
    const token = getAccessToken();
    if (token) finalHeaders["Authorization"] = `Bearer ${token}`;
  }

  const isWrite = method !== "GET";
  if (auth === "session" && isWrite) {
    const csrf = getCookie("csrftoken");
    if (csrf) finalHeaders["X-CSRFToken"] = csrf;
  }

  if (!isFormData && body && !(body instanceof FormData)) {
    finalHeaders["Content-Type"] = "application/json";
  }

  const resp = await fetch(url, {
    method,
    headers: finalHeaders,
    body: body instanceof FormData ? body : body ? JSON.stringify(body) : undefined,
    credentials: auth === "session" ? "include" : "omit",
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
// 在文件最底部追加这一行：
export { apiRequest as apiFetch, BASE_URL, getAccessToken };
