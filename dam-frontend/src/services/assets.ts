// src/services/assets.ts
import { apiRequest, BASE_URL } from "@/lib/api";

export type AssetType = "image" | "video" | "pdf" | "document" | string;


export async function createTag(name: string) {
  return await apiRequest("/api/tags/", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name }),
  });
}

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
  ordering?: string;
  page?: number;

  date_from?: string;
  date_to?: string;

  // 两种方式任选其一（后端建议按 ID 过滤）：
  tags?: string | number[];        // 按 ID 过滤（支持 ?tags=1&tags=2）
  tag_names?: string | string[];   // 按名称过滤（支持 ?tag_names=a&tag_names=b）
}

/** 统一的 getAssets：将数组参数展开为多个 query 参数，避免 400 */
export async function getAssets(params: ListParams = {}): Promise<AssetItem[]> {
  const sp = new URLSearchParams();

  if (params.search) sp.set("search", params.search);
  if (params.asset_type) sp.set("asset_type", params.asset_type);
  if (params.uploaded_by != null) sp.set("uploaded_by", String(params.uploaded_by));
  if (params.ordering) sp.set("ordering", params.ordering);
  if (params.page != null) sp.set("page", String(params.page));
  if (params.date_from) sp.set("date_from", params.date_from);
  if (params.date_to) sp.set("date_to", params.date_to);

  // ✅ 关键：把 tags 展开成多个 query 参数 (?tags=1&tags=2)
  if (params.tags) {
    if (Array.isArray(params.tags)) {
      params.tags.forEach((id) => sp.append("tags", String(id)));
    } else if (typeof params.tags === "string") {
      params.tags
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
        .forEach((v) => sp.append("tags", v));
    }
  }

  // 兼容按名称过滤（同样展开）
  if (params.tag_names) {
    if (Array.isArray(params.tag_names)) {
      params.tag_names.forEach((nm) => sp.append("tag_names", String(nm)));
    } else if (typeof params.tag_names === "string") {
      params.tag_names
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
        .forEach((v) => sp.append("tag_names", v));
    }
  }

  const qs = sp.toString();
  const url = `/api/assets/${qs ? `?${qs}` : ""}`;
  return await apiRequest<AssetItem[]>(url);
}

// 兼容旧名称：listAssets 等于 getAssets
export const listAssets = getAssets;

export async function downloadAsset(id: number): Promise<void> {
  const url = `${BASE_URL}/api/assets/${id}/download/`;
  const token = localStorage.getItem("accessToken");

  const headers: Record<string, string> = {};
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const resp = await fetch(url, { method: "GET", headers });
  if (!resp.ok) {
    const text = await resp.text().catch(() => "");
    throw new Error(text || resp.statusText || "Download failed");
  }
  const blob = await resp.blob();

  let filename = "download";
  const cd = resp.headers.get("Content-Disposition") || "";
  const match = cd.match(/filename\*?=UTF-8''([^;]+)/i);
  if (match && match[1]) filename = decodeURIComponent(match[1]);

  const a = document.createElement("a");
  const objectUrl = URL.createObjectURL(blob);
  a.href = objectUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(objectUrl);
}

export async function listTags(): Promise<{ id: number; name: string }[]> {
  return await apiRequest("/api/tags/");
}
