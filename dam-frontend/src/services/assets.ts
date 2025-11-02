// src/services/assets.ts
import { apiRequest, BASE_URL } from "@/lib/api";

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

export type Asset = AssetItem;

export interface ListParams {
  search?: string;
  asset_type?: string;
  uploaded_by?: number;
  tags?: number | number[];
  ordering?: string;
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
  return await apiRequest<AssetItem[]>(`/api/assets/${query}`);
}
export const getAssets = listAssets;

export async function getAsset(id: number): Promise<AssetItem> {
  return await apiRequest<AssetItem>(`/api/assets/${id}/`);
}

/**
 * 方案1下载：GET /api/assets/:id/download/  → blob → 触发保存
 */
export async function downloadAsset(id: number): Promise<void> {
  const url = `${BASE_URL}/api/assets/${id}/download/`;
  const token = localStorage.getItem("accessToken");

  const headers: Record<string, string> = {};
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const resp = await fetch(url, {
    method: "GET",
    headers,
  });
  if (!resp.ok) {
    const text = await resp.text().catch(() => "");
    throw new Error(text || resp.statusText || "Download failed");
  }
  const blob = await resp.blob();

  let filename = "download";
  const cd = resp.headers.get("Content-Disposition") || "";
  const match = cd.match(/filename\*?=UTF-8''([^;]+)/i);
  if (match && match[1]) {
    filename = decodeURIComponent(match[1]);
  }

  const a = document.createElement("a");
  const objectUrl = URL.createObjectURL(blob);
  a.href = objectUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(objectUrl);
}
