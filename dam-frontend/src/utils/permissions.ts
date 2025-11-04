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

/** 统一把角色转小写，避免 'Admin' / 'EDITOR' 等大小写差异 */
function normalizeRole(
  raw?: string | null
): "admin" | "editor" | "viewer" | undefined {
  const r = (raw || "").toString().trim().toLowerCase();
  if (r === "admin" || r === "editor" || r === "viewer") return r;
  return undefined;
}

/** 当未显式传入 user 时，自动从 authService 读取当前登录用户 */
function effectiveUser(user?: CurrentUser | null): CurrentUser | null {
  try {
    return user ?? authService.getCurrentUser?.() ?? null;
  } catch {
    return user ?? null;
  }
}

/** 判断资产是否属于当前用户 */
function isOwner(user: CurrentUser | null | undefined, asset: AssetLike | null | undefined) {
  const uid = user?.id;
  const ownerId = asset?.uploaded_by?.id;
  return uid != null && ownerId != null && String(uid) === String(ownerId);
}

export function isAuthenticated(user?: CurrentUser | null): boolean {
  const u = effectiveUser(user);
  return !!(u && u.id);
}

export function canUpload(user?: CurrentUser | null): boolean {
  const u = effectiveUser(user);
  const role = normalizeRole(u?.role as any);
  // 规则：只有 Editor 可以上传；Admin/Viewer 不可上传
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

/**
 * 编辑权限：
 * - Editor：仅可编辑自己上传的资产
 * - Admin：不可编辑任何资产（按你的业务规则）
 * - Viewer：不可编辑
 */
export function canEditAsset(
  user: CurrentUser | null | undefined,
  asset: AssetLike | null | undefined
): boolean {
  const u = effectiveUser(user);
  const role = normalizeRole(u?.role as any);
  if (role === "editor") return isOwner(u, asset);
  if (role === "admin") return false;
  return false;
}

/**
 * 删除权限：
 * - Admin：可以删除任何资产
 * - Editor：仅可删除自己上传的资产
 * - Viewer：不可删除
 */
export function canDeleteAsset(
  user: CurrentUser | null | undefined,
  asset: AssetLike | null | undefined
): boolean {
  const u = effectiveUser(user);
  const role = normalizeRole(u?.role as any);
  if (role === "admin") return true;
  if (role === "editor") return isOwner(u, asset);
  return false;
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
