// src/services/assets.ts
// Unified exports & type compatibility. Uses apiRequest (JWT auto-injected).
// Collection endpoints include a trailing slash by default.

import { apiRequest, BASE_URL } from '@/lib/api';

// -------------------- Types --------------------

export type Tag = {
  id: number;
  name: string;
};

export type MiniUser = {
  id: number;
  username: string;
  role?: string;
};

export type AssetItem = {
  id: number;
  name: string;
  brand?: string;
  asset_no?: string | number;
  description?: string;

  // Backend canonical field
  asset_type?: 'image' | 'video' | '3d_model' | 'pdf' | 'document' | string;

  // Legacy/compat alias used by some pages
  type?: string;

  file?: string;
  file_url?: string;

  mime_type?: string;

  tags: Tag[];

  upload_date?: string; // canonical
  created_at?: string;  // legacy compat
  updated_at?: string;

  download_count?: number;
  view_count?: number;
  uploaded_by?: MiniUser;
};

// Alias used elsewhere
export type Asset = AssetItem;

export type AssetVersion = {
  id: number;
  version: number;
  file: string;
  file_url?: string;
  created_at: string;
  uploaded_by?: MiniUser;
  note?: string;
  uploaded_at?: string; // legacy compat
};

export type GetAssetsParams = {
  q?: string;
  search?: string;

  date_from?: string;
  date_to?: string;
  tags?: number[] | string | string[];
  /** 'OR' -> ?tags=1,2,3 ; 'AND' -> ?tags=1&tags=2&tags=3 */
  tags_mode?: 'OR' | 'AND';

  tag_names?: string;
  asset_type?: string;
  uploaded_by?: number;
  ordering?: string;
  page?: number;
  page_size?: number;
};

// -------------------- Helpers --------------------

/**
 * Build query string
 * - Default tags_mode = 'OR' -> ?tags=1,2,3
 * - tags_mode = 'AND'       -> ?tags=1&tags=2&tags=3
 */
function buildQuery(params?: GetAssetsParams): string {
  if (!params) return '';
  const q = new URLSearchParams();

  const keyword = params.q ?? params.search;
  if (keyword) q.set('search', keyword);

  if (params.date_from) q.set('date_from', params.date_from);
  if (params.date_to) q.set('date_to', params.date_to);
  if (params.asset_type) q.set('asset_type', params.asset_type);
  if (params.tag_names) q.set('tag_names', params.tag_names);
  if (params.uploaded_by != null) q.set('uploaded_by', String(params.uploaded_by));
  if (params.ordering) q.set('ordering', params.ordering);
  if (params.page) q.set('page', String(params.page));
  if (params.page_size) q.set('page_size', String(params.page_size));

  // --- tags --- //
  const t = params.tags;
  const mode: 'OR' | 'AND' = (params.tags_mode as any) === 'AND' ? 'AND' : 'OR';

  if (t != null) {
    const arr = Array.isArray(t) ? t : [t];
    const ids = arr
      .flatMap((v) => String(v).split(','))
      .map((v) => v.trim())
      .filter(Boolean);

    if (ids.length) {
      if (mode === 'AND') {
        // ?tags=1&tags=2&tags=3
        ids.forEach((v) => q.append('tags', v));
      } else {
        // Default OR: ?tags=1,2,3
        q.set('tags', ids.join(','));
      }
    }
  }

  const s = q.toString();
  return s ? `?${s}` : '';
}

function mapVersion(v: any): AssetVersion {
  const created = v?.created_at ?? v?.uploaded_at ?? '';
  return {
    id: v.id,
    version: v.version,
    file: v.file,
    file_url: v.file_url,
    created_at: created,
    uploaded_by: v.uploaded_by ?? null,
    note: v.note ?? null,
    uploaded_at: created,
  };
}

// -------------------- Assets API --------------------

export async function getAssets(params?: GetAssetsParams): Promise<AssetItem[]> {
  const url = `/api/assets/${buildQuery(params)}`; // list endpoint with trailing slash
  const data = await apiRequest<any>(url);
  // Accept array or paginated { results }
  const arr = Array.isArray(data) ? data : data?.results ?? [];
  return arr as AssetItem[];
}

export async function getMyAssets(
  userId: number,
  params?: Omit<GetAssetsParams, 'uploaded_by'>
): Promise<AssetItem[]> {
  const merged: GetAssetsParams = { ...(params || {}), uploaded_by: userId };
  return getAssets(merged);
}

export async function getAssetById(id: number | string): Promise<AssetItem> {
  const data = await apiRequest<AssetItem>(`/api/assets/${id}/`);
  return data;
}

// Create (multipart)
export async function createAsset(form: FormData): Promise<AssetItem> {
  // apiRequest auto-detects FormData; don't set Content-Type manually
  return await apiRequest<AssetItem>('/api/assets/', {
    method: 'POST',
    body: form,
  });
}

// Update (PATCH)
export async function updateAsset(
  id: number | string,
  data: FormData | Record<string, unknown>
): Promise<AssetItem> {
  return await apiRequest<AssetItem>(`/api/assets/${id}/`, {
    method: 'PATCH',
    body: data,
  });
}

// Delete
export async function deleteAsset(id: number | string): Promise<void> {
  await apiRequest<void>(`/api/assets/${id}/`, { method: 'DELETE' });
}

// Preferred preview URL for embedding img/video/object.
// First try /preview/, fallback to asset detail URL fields.
export async function getPreviewUrl(id: number | string): Promise<string> {
  try {
    const data = await apiRequest<{ file_url: string }>(`/api/assets/${id}/preview/`);
    if (data?.file_url) return data.file_url;
  } catch {
    // fallthrough
  }
  const detail = await apiRequest<AssetItem>(`/api/assets/${id}/`);
  return detail?.file_url || detail?.file || '';
}

// -------------------- Download (minimal logic, more robust) --------------------

// Read token from storage/cookie without changing your login flow
function readTokenFromStorage(): string | null {
  try {
    const keys = [
      'Authorization', // may already be 'Bearer xxx' or 'JWT xxx'
      'token',
      'access_token',
      'access',
      'accessToken',
      'jwt',
    ];
    for (const k of keys) {
      const v =
        localStorage.getItem(k) ??
        (typeof sessionStorage !== 'undefined' ? sessionStorage.getItem(k) : null);
      if (v && v.trim()) return v.trim();
    }
  } catch {}
  return null;
}

function readTokenFromCookie(): string | null {
  try {
    const jar = (typeof document !== 'undefined' ? document.cookie : '') || '';
    if (!jar) return null;
    const pick = (name: string) => {
      const m = jar.match(new RegExp(`(?:^|; )${name}=([^;]+)`));
      return m ? decodeURIComponent(m[1]) : null;
    };
    return (
      pick('Authorization') ||
      pick('token') ||
      pick('access_token') ||
      pick('access') ||
      pick('jwt') ||
      null
    );
  } catch {}
  return null;
}

/** Raw authorization value from storage/cookie (may already contain Bearer/JWT) */
function getRawAuthToken(): string | null {
  return readTokenFromStorage() ?? readTokenFromCookie();
}

function buildAuthHeader(prefix: 'Bearer' | 'JWT' | 'raw'): HeadersInit {
  const raw = getRawAuthToken();
  if (!raw) return {};
  // If it already looks like 'Bearer xxx' or 'JWT xxx', use as-is
  if (/^\s*(Bearer|JWT)\s+.+/i.test(raw)) {
    return { Authorization: raw };
  }
  // Else attach prefix or use raw value directly
  if (prefix === 'raw') {
    return { Authorization: raw };
  }
  return { Authorization: `${prefix} ${raw}` };
}

/**
 * Fetch helper with auth fallbacks:
 * 1) Bearer
 * 2) JWT
 * 3) raw value
 * 4) If 401 and URL ends with '/', retry without trailing slash
 */
async function fetchWithAuthFallback(url: string, init?: RequestInit): Promise<Response> {
  const tryOnce = (h: HeadersInit, u = url) =>
    fetch(u, {
      method: 'GET',
      credentials: 'include',
      ...init,
      headers: { ...(init?.headers || {}), ...h } as HeadersInit,
    });

  // 1) Bearer
  let res = await tryOnce(buildAuthHeader('Bearer'));
  if (res.status === 401) {
    // 2) JWT
    res = await tryOnce(buildAuthHeader('JWT'));
  }
  if (res.status === 401) {
    // 3) raw
    res = await tryOnce(buildAuthHeader('raw'));
  }
  // 4) Trailing slash fallback
  if (res.status === 401 && /\/$/.test(url)) {
    const urlNoSlash = url.replace(/\/+$/, '');
    res = await tryOnce(buildAuthHeader('Bearer'), urlNoSlash);
    if (res.status === 401) res = await tryOnce(buildAuthHeader('JWT'), urlNoSlash);
    if (res.status === 401) res = await tryOnce(buildAuthHeader('raw'), urlNoSlash);
  }
  return res;
}

export async function downloadAsset(id: number | string): Promise<Blob> {
  const url = `${BASE_URL}/api/assets/${id}/download/`;
  const res = await fetchWithAuthFallback(url);
  if (!res.ok) {
    let detail = '';
    try { detail = await res.text(); } catch {}
    throw new Error(`Download failed (${res.status}) ${detail}`.trim());
  }
  return await res.blob();
}

export async function downloadAssetBlob(
  id: number | string
): Promise<{ blob: Blob; filename: string }> {
  const url = `${BASE_URL}/api/assets/${id}/download/`;
  const res = await fetchWithAuthFallback(url);

  const blob = await res.blob();

  if (!res.ok) {
    let t = '';
    try { t = await blob.text(); } catch {}
    throw new Error(`Download failed (${res.status}) ${t}`.trim());
  }

  // Parse filename from Content-Disposition, if present
  const cd = res.headers.get('content-disposition') || '';
  let filename = 'download';
  const m =
    /filename\*=UTF-8''([^;]+)/i.exec(cd) ||
    /filename="?([^"]+)"?/i.exec(cd);
  if (m && m[1]) {
    try { filename = decodeURIComponent(m[1]); } catch { filename = m[1]; }
  }
  return { blob, filename };
}

// -------------------- View Count --------------------

/**
 * Call on entering preview page.
 * Server decides whether to increment (e.g., by user/IP + TTL).
 */
export async function trackView(id: number | string): Promise<void> {
  await apiRequest(`/api/assets/${id}/track_view/`, { method: 'POST' }).catch(() => {});
}

/** Legacy alias that simply calls trackView */
export async function trackViewOnce(id: number | string): Promise<void> {
  return trackView(id);
}

// -------------------- Tags API --------------------

export async function getTags(): Promise<Tag[]> {
  const data = await apiRequest<any>(`/api/tags/`);
  const arr = Array.isArray(data) ? data : data?.results ?? [];
  return arr as Tag[];
}

export const listTags = getTags;

// -------------------- Versions API --------------------

export async function getAssetVersions(assetId: number | string): Promise<AssetVersion[]> {
  const list = await apiRequest<any[]>(`/api/assets/${assetId}/versions/`);
  return (list ?? []).map(mapVersion);
}

export async function getLatestVersion(assetId: number | string): Promise<AssetVersion | null> {
  try {
    const list = await getAssetVersions(assetId);
    if (!list.length) return null;
    return list.sort((a, b) => b.version - a.version)[0];
  } catch {
    return null;
  }
}

export async function uploadNewVersion(
  assetId: number | string,
  fileOrForm: File | FormData,
  note?: string
): Promise<AssetVersion> {
  let fd: FormData;
  if (typeof FormData !== 'undefined' && fileOrForm instanceof FormData) {
    fd = fileOrForm;
  } else {
    fd = new FormData();
    fd.append('file', fileOrForm as File); // important field name: 'file'
    if (note) fd.append('note', note);
  }

  // Preferred: /versions/
  const v = await apiRequest<any>(`/api/assets/${assetId}/versions/`, {
    method: 'POST',
    body: fd,
  }).catch(async () => {
    // Fallback for legacy backend: /upload_version/
    const alt = await apiRequest<any>(`/api/assets/${assetId}/upload_version/`, {
      method: 'POST',
      body: fd,
    });
    return alt;
  });

  return mapVersion(v);
}

export async function restoreVersion(
  assetId: number | string,
  version: number
): Promise<AssetVersion> {
  // Preferred: /versions/<ver>/restore/
  const v = await apiRequest<any>(`/api/assets/${assetId}/versions/${version}/restore/`, {
    method: 'POST',
  }).catch(async () => {
    // Fallback for legacy backend: /restore_version/?version=xx
    return await apiRequest<any>(
      `/api/assets/${assetId}/restore_version/?version=${encodeURIComponent(String(version))}`,
      { method: 'POST' }
    );
  });

  return mapVersion(v);
}

// -------------------- Utilities --------------------

export function saveBlob(blob: Blob, filename: string) {
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename || 'download';
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
}
