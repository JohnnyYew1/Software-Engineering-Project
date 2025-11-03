// src/services/assets.ts
// 统一导出 & 兼容旧字段/旧函数名；移除对 `api` 的依赖，改用 apiRequest/BASE_URL

import { apiRequest, BASE_URL } from "@/lib/api";

// -------------------- Types --------------------

export type Tag = {
  id: number;
  name: string;
};

export type MiniUser = {
  id: number;
  username: string;
};

export type AssetItem = {
  id: number;
  name: string;
  brand?: string;
  asset_no?: string;
  description?: string;

  // 后端真实字段
  asset_type?: "image" | "video" | "3d_model" | "document" | string;

  // 兼容旧页面字段
  type?: string;

  file?: string;
  file_url?: string;

  // 某些页面用到
  mime_type?: string;

  tags: Tag[];

  // 后端真实字段（日期）
  upload_date?: string;

  // 兼容旧页面字段
  created_at?: string;
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
  uploaded_at: string;
  uploaded_by?: MiniUser;
  note?: string;
  // 旧页面用 created_at，这里保证始终有值（由 uploaded_at 映射）
  created_at: string;
};

export type GetAssetsParams = {
  // 新旧都兼容：有的页面传 search，有的传 q
  q?: string;
  search?: string;

  date_from?: string;
  date_to?: string;
  tags?: number[] | string | string[]; // 兼容旧页面传 string / string[]
  tag_names?: string; // csv: "logo,product"
  asset_type?: string;
  uploaded_by?: number;
  // 放宽类型：兼容 "-created_at" 等旧值，避免 TS 报错
  ordering?: string;
  page?: number;
  page_size?: number;
};

// -------------------- Helpers --------------------

// 从 localStorage 取 JWT，给 fetch 用（apiRequest 已内置，这里只给二进制/表单用）
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

function buildQuery(params?: GetAssetsParams): string {
  if (!params) return "";
  const q = new URLSearchParams();

  // SearchFilter 默认读取 ?search=
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

  // tags 多选 => ?tags=1&tags=2
  const t = params.tags;
  if (t != null) {
    const arr = Array.isArray(t) ? t : [t];
    arr.forEach((v) => q.append("tags", String(v)));
  }

  const s = q.toString();
  return s ? `?${s}` : "";
}

// -------------------- Assets API --------------------

// 列表
export async function getAssets(params?: GetAssetsParams): Promise<AssetItem[]> {
  const url = `/api/assets/${buildQuery(params)}`;
  const data = await apiRequest<any>(url);
  // 兼容分页/非分页
  const arr = Array.isArray(data) ? data : (data?.results ?? []);
  return arr as AssetItem[];
}

// “我的上传”
export async function getMyAssets(
  userId: number,
  params?: Omit<GetAssetsParams, "uploaded_by">
): Promise<AssetItem[]> {
  const merged: GetAssetsParams = { ...(params || {}), uploaded_by: userId };
  return getAssets(merged);
}

// 详情
export async function getAssetById(id: number | string): Promise<AssetItem> {
  const data = await apiRequest<AssetItem>(`/api/assets/${id}/`);
  return data;
}

// 创建（multipart）
export async function createAsset(form: FormData): Promise<AssetItem> {
  const res = await fetch(`${BASE_URL}/api/assets/`, {
    method: "POST",
    headers: authHeaders(), // Content-Type 交给浏览器自动带 multipart 边界
    body: form,
  });
  if (!res.ok) throw new Error(`Create failed (${res.status})`);
  return (await res.json()) as AssetItem;
}

// 更新（PATCH，JSON 或 multipart）
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
  if (!res.ok) throw new Error(`Update failed (${res.status})`);
  return (await res.json()) as AssetItem;
}

// 删除
export async function deleteAsset(id: number | string): Promise<void> {
  const res = await fetch(`${BASE_URL}/api/assets/${id}/`, {
    method: "DELETE",
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error(`Delete failed (${res.status})`);
}

// 预览（返回 {file_url}）
export async function getPreviewUrl(id: number | string): Promise<string> {
  const data = await apiRequest<{ file_url: string }>(`/api/assets/${id}/preview/`);
  return data?.file_url;
}

// 下载（真实下载接口，二进制）
export async function downloadAsset(id: number | string): Promise<Blob> {
  const res = await fetch(`${BASE_URL}/api/assets/${id}/download/`, {
    method: "GET",
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error(`Download failed (${res.status})`);
  return await res.blob();
}

// -------------------- Tags API --------------------

export async function getTags(): Promise<Tag[]> {
  const data = await apiRequest<any>(`/api/tags/`);
  const arr = Array.isArray(data) ? data : (data?.results ?? []);
  return arr as Tag[];
}

// 兼容：有些页面 import { listTags }
export const listTags = getTags;

// -------------------- Versions API --------------------

export async function getAssetVersions(assetId: number | string): Promise<AssetVersion[]> {
  const list = await apiRequest<Omit<AssetVersion, "created_at">[]>(
    `/api/assets/${assetId}/versions/`
  );
  return (list ?? []).map((v) => ({ created_at: v.uploaded_at, ...v }));
}

export async function getLatestVersion(assetId: number | string): Promise<AssetVersion | null> {
  try {
    const v = await apiRequest<Omit<AssetVersion, "created_at">>(
      `/api/assets/${assetId}/versions/latest/`
    );
    return { created_at: v.uploaded_at, ...v };
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
    fd.append("file", fileOrForm as File);
    if (note) fd.append("note", note);
  }
  const res = await fetch(`${BASE_URL}/api/assets/${assetId}/versions/`, {
    method: "POST",
    headers: authHeaders(),
    body: fd,
  });
  if (!res.ok) throw new Error(`Upload version failed (${res.status})`);
  const v = (await res.json()) as Omit<AssetVersion, "created_at">;
  return { created_at: v.uploaded_at, ...v };
}

export async function restoreVersion(
  assetId: number | string,
  version: number
): Promise<AssetVersion> {
  const res = await fetch(`${BASE_URL}/api/assets/${assetId}/versions/${version}/restore/`, {
    method: "POST",
    headers: authHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify({}),
  });
  if (!res.ok) throw new Error(`Restore failed (${res.status})`);
  const v = (await res.json()) as Omit<AssetVersion, "created_at">;
  return { created_at: v.uploaded_at, ...v };
}

// -------------------- 小工具 --------------------

export function saveBlob(blob: Blob, filename: string) {
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  window.URL.revokeObjectURL(url);
}
