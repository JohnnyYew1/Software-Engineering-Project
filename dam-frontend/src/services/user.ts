// src/services/users.ts
// 先用相对路径兜底，等别名(@/*)稳定后再改回 '@/lib/api'
import { apiRequest } from '../lib/api';

export type Role = 'admin' | 'editor' | 'viewer';

export type UserRow = {
  id: number;
  username: string;
  email?: string;
  role: Role | string;
  is_active?: boolean;
  date_joined?: string;
  first_name?: string;
  last_name?: string;
};

function normalizeRole(raw: unknown): Role | undefined {
  const r = typeof raw === 'string' ? raw.trim().toLowerCase() : '';
  return (['admin', 'editor', 'viewer'] as const).includes(r as Role) ? (r as Role) : undefined;
}

export async function fetchUsers(): Promise<UserRow[]> {
  const data = await apiRequest<UserRow[]>('/api/admin/users/');
  const arr = Array.isArray(data) ? data : [];
  return arr.map((u) => ({ ...u, role: normalizeRole(u.role) ?? 'viewer' }));
}

export async function createUser(payload: {
  username: string;
  password: string;
  email?: string;
  role: Role;
  first_name?: string;
  last_name?: string;
}): Promise<UserRow> {
  const res = await apiRequest<UserRow>('/api/admin/users/', {
    method: 'POST',
    body: {
      username: payload.username.trim(),
      password: payload.password,
      email: payload.email?.trim() || undefined,
      role: payload.role,
      first_name: payload.first_name?.trim() || undefined,
      last_name: payload.last_name?.trim() || undefined,
    },
  });
  return { ...res, role: normalizeRole((res as any)?.role) ?? 'viewer' };
}

export async function updateUser(
  id: number,
  patch: Partial<{
    role: Role;
    is_active: boolean;
    email: string;
    first_name: string;
    last_name: string;
    password: string;
  }>
): Promise<UserRow> {
  const res = await apiRequest<UserRow>(`/api/admin/users/${id}/`, {
    method: 'PATCH',
    body: patch,
  });
  return { ...res, role: normalizeRole((res as any)?.role) ?? 'viewer' };
}

export async function deleteUser(id: number): Promise<void> {
  await apiRequest<void>(`/api/admin/users/${id}/`, { method: 'DELETE' });
}
