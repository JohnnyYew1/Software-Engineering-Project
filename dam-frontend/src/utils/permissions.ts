// src/utils/permissions.ts
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

export function isAuthenticated(user?: CurrentUser | null): boolean {
  return !!(user && user.id);
}
export function canUpload(user?: CurrentUser | null): boolean {
  const role = user?.role?.toLowerCase();
  return role === "editor"; // Admin 禁止上传
}
export function canManageUsers(user?: CurrentUser | null): boolean {
  const role = user?.role?.toLowerCase();
  return role === "admin";
}
export function canViewAssets(user?: CurrentUser | null): boolean {
  return isAuthenticated(user);
}
export function canEditAsset(
  user: CurrentUser | null | undefined,
  asset: AssetLike | null | undefined
): boolean {
  const role = user?.role?.toLowerCase();
  if (role === "admin") return true;
  if (role === "editor") {
    const ownerId = asset?.uploaded_by?.id;
    return ownerId != null && String(ownerId) === String(user?.id ?? "");
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

// 兼容历史：默认导出对象 permissions
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
