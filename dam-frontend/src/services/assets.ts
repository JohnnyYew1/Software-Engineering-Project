// src/services/assets.ts
import { apiRequest as apiFetch, BASE_URL, getAccessToken } from "@/lib/api";

export type AssetType = "image" | "video" | "pdf" | "document" | string;

export interface Tag {
  id: number;
  name: string;
  color?: string;
}

export interface AssetItem {
  id: number;
  name: string;
  asset_type: AssetType;
  file?: string;
  file_url?: string;
  upload_date?: string;
  description?: string;
  uploaded_by?: { id: number; username: string } | null;
  tags?: Tag[];
  tag_ids?: number[];
  view_count?: number;
  download_count?: number;
}

// 兼容历史类型命名
export type Asset = AssetItem;

export interface ListParams {
  search?: string;
  asset_type?: string;
  uploaded_by?: number;
  tags?: number | number[];
  ordering?: string; // e.g. "-upload_date"
  page?: number;
}

function toQuery(params: Record<string, any>): string {
  const q = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v === undefined || v === null || v === "") return;
    if (Array.isArray(v)) v.forEach((x) => q.append(k, String(x)));
    else q.set(k, String(v));
  });
  const s = q.toString();
  return s ? `?${s}` : "";
}

export async function listAssets(params: ListParams = {}): Promise<AssetItem[]> {
  const query = toQuery(params);
  return await apiFetch<AssetItem[]>(`/api/assets/${query}`);
}

// 兼容历史命名：getAssets => listAssets
export const getAssets = listAssets;

export async function getAsset(id: number): Promise<AssetItem> {
  return await apiFetch<AssetItem>(`/api/assets/${id}/`);
}

export async function uploadAsset(payload: {
  name: string;
  asset_type: AssetType;
  file: File;
  description?: string;
  tag_ids?: number[];
}): Promise<AssetItem> {
  const fd = new FormData();
  fd.append("name", payload.name);
  fd.append("asset_type", payload.asset_type);
  fd.append("file", payload.file);
  if (payload.description) fd.append("description", payload.description);
  if (payload.tag_ids && payload.tag_ids.length > 0) {
    payload.tag_ids.forEach((id) => fd.append("tag_ids", String(id)));
  }
  return await apiFetch<AssetItem>("/api/assets/", {
    method: "POST",
    body: fd,
    isFormData: true,
  });
}

export async function updateAsset(
  id: number,
  patch: Partial<Omit<AssetItem, "id">>
): Promise<AssetItem> {
  return await apiFetch<AssetItem>(`/api/assets/${id}/`, {
    method: "PATCH",
    body: patch,
  });
}

export async function deleteAsset(id: number): Promise<void> {
  await apiFetch(`/api/assets/${id}/`, { method: "DELETE" });
}

/**
 * 真正下载：带 JWT 调 /api/assets/:id/download/，拿到 Blob 后触发保存；失败回退直链。
 */
export async function downloadAsset(id: number): Promise<string> {
  const token = getAccessToken();
  const url = `${BASE_URL}/api/assets/${id}/download/`;

  const resp = await fetch(url, {
    method: "GET",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });

  if (!resp.ok) {
    // 回退：尝试拿直链，然后新开标签（不保证保存，但可访问）
    try {
      const alt = await apiFetch<{ url: string }>(`/api/assets/${id}/download_url/`, {
        method: "GET",
      });
      try {
        await apiFetch(`/api/assets/${id}/increase_download/`, { method: "POST" });
      } catch {}
      window.open(alt.url, "_blank");
      return alt.url;
    } catch (e: any) {
      const msg = (await resp.text()) || resp.statusText || "Download failed";
      throw new Error(msg);
    }
  }

  // 解析文件名
  const disp = resp.headers.get("Content-Disposition") || "";
  let filename = "download";
  const m = /filename\*=(?:UTF-8'')?([^;]+)|filename="?([^\";]+)"?/i.exec(disp);
  if (m) {
    filename = decodeURIComponent((m[1] || m[2] || "download").trim());
  }

  const blob = await resp.blob();
  const blobUrl = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = blobUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(blobUrl), 2000);

  return filename;
}

export async function increaseDownload(id: number): Promise<number> {
  const data = await apiFetch<{ download_count: number }>(
    `/api/assets/${id}/increase_download/`,
    { method: "POST" }
  );
  return data.download_count;
}
