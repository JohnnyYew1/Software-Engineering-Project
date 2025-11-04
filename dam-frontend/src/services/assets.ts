// src/services/assets.ts
// 统一导出 & 兼容旧字段/旧函数名；保留 apiRequest/BASE_URL 的使用

import { apiRequest, BASE_URL } from "@/lib/api";

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
  asset_no?: string;
  description?: string;

  // 后端真实字段
  asset_type?: "image" | "video" | "3d_model" | "pdf" | "document" | string;

  // 兼容旧页面字段
  type?: string;

  file?: string;
  file_url?: string;

  mime_type?: string;

  tags: Tag[];

  upload_date?: string; // 后端真实字段
  created_at?: string;  // 兼容旧字段
  updated_at?: string;

  download_count?: number;
  view_count?: number;
  uploaded_by?: MiniUser;
};

// 兼容：有页面 import { Asset }
export type Asset = AssetItem;

export type AssetVersion = {
  id: number;
  version: number;
  file: string;
  file_url?: string;
  created_at: string;
  uploaded_by?: MiniUser;
  note?: string;
  uploaded_at?: string; // 兼容旧代码
};

export type GetAssetsParams = {
  q?: string;
  search?: string;

  date_from?: string;
  date_to?: string;
  tags?: number[] | string | string[];
  /** 'OR' -> ?tags=1,2,3 ; 'AND' -> ?tags=1&tags=2&tags=3 */
  tags_mode?: "OR" | "AND";

  tag_names?: string;
  asset_type?: string;
  uploaded_by?: number;
  ordering?: string;
  page?: number;
  page_size?: number;
};

// -------------------- Helpers --------------------

function getAccessToken(): string | null {
  try {
    return localStorage.getItem("accessToken");
  } catch {
    return null;
  }
}

function authHeaders(extra?: HeadersInit): HeadersInit {
  const token = typeof window !== "undefined" ? getAccessToken() : null;
  return token
    ? { Authorization: `Bearer ${token}`, ...(extra || {}) }
    : { ...(extra || {}) };
}

/**
 * 构造查询字符串：
 * - 默认 tags_mode = 'OR' -> ?tags=1,2,3  （兼容性更好）
 * - tags_mode = 'AND'    -> ?tags=1&tags=2&tags=3
 */
function buildQuery(params?: GetAssetsParams): string {
  if (!params) return "";
  const q = new URLSearchParams();

  const keyword = params.q ?? params.search;
  if (keyword) q.set("search", keyword);

  if (params.date_from) q.set("date_from", params.date_from);
  if (params.date_to) q.set("date_to", params.date_to);
  if (params.asset_type) q.set("asset_type", params.asset_type);
  if (params.tag_names) q.set("tag_names", params.tag_names);
  if (params.uploaded_by != null) q.set("uploaded_by", String(params.uploaded_by));
  if (params.ordering) q.set("ordering", params.ordering);
  if (params.page) q.set("page", String(params.page));
  if (params.page_size) q.set("page_size", String(params.page_size));

  // --- tags --- //
  const t = params.tags;
  const mode: "OR" | "AND" = (params.tags_mode as any) === "AND" ? "AND" : "OR";

  if (t != null) {
    const arr = Array.isArray(t) ? t : [t];
    const ids = arr
      .flatMap((v) => String(v).split(","))
      .map((v) => v.trim())
      .filter(Boolean);

    if (ids.length) {
      if (mode === "AND") {
        // ?tags=1&tags=2&tags=3
        ids.forEach((v) => q.append("tags", v));
      } else {
        // 默认 OR：?tags=1,2,3
        q.set("tags", ids.join(","));
      }
    }
  }

  const s = q.toString();
  return s ? `?${s}` : "";
}

// -------------------- Assets API --------------------

export async function getAssets(params?: GetAssetsParams): Promise<AssetItem[]> {
  const url = `/api/assets/${buildQuery(params)}`;
  const data = await apiRequest<any>(url);
  const arr = Array.isArray(data) ? data : (data?.results ?? []);
  return arr as AssetItem[];
}

export async function getMyAssets(
  userId: number,
  params?: Omit<GetAssetsParams, "uploaded_by">
): Promise<AssetItem[]> {
  const merged: GetAssetsParams = { ...(params || {}), uploaded_by: userId };
  return getAssets(merged);
}

export async function getAssetById(id: number | string): Promise<AssetItem> {
  const data = await apiRequest<AssetItem>(`/api/assets/${id}/`);
  return data;
}

// 创建（multipart）
export async function createAsset(form: FormData): Promise<AssetItem> {
  const res = await fetch(`${BASE_URL}/api/assets/`, {
    method: "POST",
    headers: authHeaders(), // multipart 让浏览器自己带边界
    body: form,
  });
  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`Create failed (${res.status}) ${txt}`);
  }
  return (await res.json()) as AssetItem;
}

// 更新（PATCH）
export async function updateAsset(
  id: number | string,
  data: FormData | Record<string, unknown>
): Promise<AssetItem> {
  const isFD = typeof FormData !== "undefined" && data instanceof FormData;
  const res = await fetch(`${BASE_URL}/api/assets/${id}/`, {
    method: "PATCH",
    headers: isFD ? authHeaders() : authHeaders({ "Content-Type": "application/json" }),
    body: isFD ? (data as FormData) : JSON.stringify(data ?? {}),
  });
  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`Update failed (${res.status}) ${txt}`);
  }
  return (await res.json()) as AssetItem;
}

// 删除
export async function deleteAsset(id: number | string): Promise<void> {
  const res = await fetch(`${BASE_URL}/api/assets/${id}/`, {
    method: "DELETE",
    headers: authHeaders(),
  });
  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`Delete failed (${res.status}) ${txt}`);
  }
}

// ★ 预览直链（用于 img/video/object 的 src）——优先 /preview/，失败回退 detail
export async function getPreviewUrl(id: number | string): Promise<string> {
  try {
    const data = await apiRequest<{ file_url: string }>(`/api/assets/${id}/preview/`);
    if (data?.file_url) return data.file_url;
  } catch {
    // fallthrough
  }
  const detail = await apiRequest<AssetItem>(`/api/assets/${id}/`);
  return detail?.file_url || detail?.file || "";
}

// ★ 仅当用户点击“下载”时调用（这里才会 +1）
export async function downloadAsset(id: number | string): Promise<Blob> {
  const res = await fetch(`${BASE_URL}/api/assets/${id}/download/`, {
    method: "GET",
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error(`Download failed (${res.status})`);
  return await res.blob();
}

// 更稳的下载：解析响应头拿“真实文件名”
export async function downloadAssetBlob(
  id: number | string
): Promise<{ blob: Blob; filename: string }> {
  const res = await fetch(`${BASE_URL}/api/assets/${id}/download/`, {
    method: "GET",
    headers: authHeaders(),
  });

  const blob = await res.blob();

  if (!res.ok) {
    let t = "";
    try { t = await blob.text(); } catch {}
    throw new Error(`Download failed (${res.status}) ${t}`);
  }

  const cd = res.headers.get("content-disposition") || "";
  let filename = "download";
  const m =
    /filename\*=UTF-8''([^;]+)/i.exec(cd) ||
    /filename="?([^"]+)"?/i.exec(cd);
  if (m && m[1]) {
    try { filename = decodeURIComponent(m[1]); }
    catch { filename = m[1]; }
  }
  return { blob, filename };
}

// -------------------- View Count --------------------

/**
 * 进入预览页后调用：
 * - 前端不再做 sessionStorage 防抖
 * - 由后端（按 user/IP + TTL）决定是否 +1
 */
export async function trackView(id: number | string): Promise<void> {
  await apiRequest(`/api/assets/${id}/track_view/`, { method: "POST" }).catch(() => {});
}

/** 兼容旧名：内部直接转调 trackView */
export async function trackViewOnce(id: number | string): Promise<void> {
  return trackView(id);
}

// -------------------- Tags API --------------------

export async function getTags(): Promise<Tag[]> {
  const data = await apiRequest<any>(`/api/tags/`);
  const arr = Array.isArray(data) ? data : (data?.results ?? []);
  return arr as Tag[];
}

export const listTags = getTags;

// -------------------- Versions API --------------------

function mapVersion(v: any): AssetVersion {
  const created = v?.created_at ?? v?.uploaded_at ?? "";
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
  if (typeof FormData !== "undefined" && fileOrForm instanceof FormData) {
    fd = fileOrForm;
  } else {
    fd = new FormData();
    fd.append("file", fileOrForm as File); // 关键是 'file'
    if (note) fd.append("note", note);
  }

  let res = await fetch(`${BASE_URL}/api/assets/${assetId}/versions/`, {
    method: "POST",
    headers: authHeaders(),
    body: fd,
  });

  if (!res.ok) {
    const bodyTxt = await res.text().catch(() => "");
    const res2 = await fetch(`${BASE_URL}/api/assets/${assetId}/upload_version/`, {
      method: "POST",
      headers: authHeaders(),
      body: fd,
    });
    if (!res2.ok) {
      const bodyTxt2 = await res2.text().catch(() => "");
      throw new Error(
        `Upload version failed (${res.status}) ${bodyTxt} | fallback (${res2.status}) ${bodyTxt2}`
      );
    }
    const v2 = await res2.json();
    return mapVersion(v2);
  }

  const v = await res.json();
  return mapVersion(v);
}

export async function restoreVersion(
  assetId: number | string,
  version: number
): Promise<AssetVersion> {
  const url = `${BASE_URL}/api/assets/${assetId}/restore_version/?version=${encodeURIComponent(
    String(version)
  )}`;
  const res = await fetch(url, {
    method: "POST",
    headers: authHeaders(),
    body: null,
  });
  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`Restore failed (${res.status}) ${txt}`);
  }
  const v = await res.json();
  return mapVersion(v);
}

// -------------------- 小工具 --------------------

export function saveBlob(blob: Blob, filename: string) {
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename || "download";
  a.style.display = "none";
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
}
