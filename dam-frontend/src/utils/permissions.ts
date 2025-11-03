// src/utils/permissions.ts
import { authService } from "@/services/auth";

export type Role = "admin" | "editor" | "viewer" | string;

export interface CurrentUser {
  id: number | string;
  username?: string;
  role?: Role;
  is_active?: boolean;
}

export interface UploadedBy {
  id?: number | string;
  username?: string;
}

export interface AssetLike {
  id?: number | string;
  uploaded_by?: UploadedBy | null;
}

/** 统一把角色转小写，避免 'Admin' / 'EDITOR' 之类大小写导致的误判 */
function normalizeRole(raw?: string | null): "admin" | "editor" | "viewer" | undefined {
  const r = (raw || "").toString().trim().toLowerCase();
  if (r === "admin" || r === "editor" || r === "viewer") return r;
  return undefined;
}

/** 当未显式传入 user 时，自动从 authService 读取当前登录用户 */
function effectiveUser(user?: CurrentUser | null): CurrentUser | null {
  return user ?? authService.getCurrentUser();
}

export function isAuthenticated(user?: CurrentUser | null): boolean {
  const u = effectiveUser(user);
  return !!(u && u.id);
}

export function canUpload(user?: CurrentUser | null): boolean {
  const u = effectiveUser(user);
  const role = normalizeRole(u?.role as any);
  // 保留你的业务规则：Admin 禁止上传，只有 Editor 可上传
  return role === "editor";
}

export function canManageUsers(user?: CurrentUser | null): boolean {
  const u = effectiveUser(user);
  const role = normalizeRole(u?.role as any);
  return role === "admin";
}

export function canViewAssets(user?: CurrentUser | null): boolean {
  return isAuthenticated(user);
}

export function canEditAsset(
  user: CurrentUser | null | undefined,
  asset: AssetLike | null | undefined
): boolean {
  const u = effectiveUser(user);
  const role = normalizeRole(u?.role as any);
  if (role === "admin") return true;
  if (role === "editor") {
    const ownerId = asset?.uploaded_by?.id;
    return ownerId != null && String(ownerId) === String(u?.id ?? "");
  }
  return false;
}

export function canDeleteAsset(
  user: CurrentUser | null | undefined,
  asset: AssetLike | null | undefined
): boolean {
  return canEditAsset(user, asset);
}

export function canDownloadAsset(user?: CurrentUser | null): boolean {
  return isAuthenticated(user);
}

// 兼容历史：默认导出对象 permissions（保持原有 API，不破坏调用方）
export const permissions = {
  isAuthenticated,
  canUpload,
  canManageUsers,
  canViewAssets,
  canEditAsset,
  canDeleteAsset,
  canDownloadAsset,
};

export default permissions;
