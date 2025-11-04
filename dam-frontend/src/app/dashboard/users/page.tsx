'use client';

import { useEffect, useMemo, useState, type ChangeEvent } from 'react';
import {
  Box,
  VStack,
  Heading,
  Button,
  HStack,
  Badge,
  Text,
  Input,
  Spinner,
} from '@chakra-ui/react';
import { permissions } from '@/utils/permissions';
import { apiRequest } from '@/lib/api';

type Role = 'admin' | 'editor' | 'viewer';

type UserRow = {
  id: number;
  username: string;
  email?: string;
  role: Role | string;
  is_active?: boolean;
  date_joined?: string;
  first_name?: string;
  last_name?: string;
};

const roleColor = (role: string): any =>
  role === 'admin' ? 'red' : role === 'editor' ? 'blue' : 'green';

export default function UsersPage() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // 新增用户表单显隐
  const [showAdd, setShowAdd] = useState<boolean>(false);
  const [addUsername, setAddUsername] = useState('');
  const [addPassword, setAddPassword] = useState('');
  const [addEmail, setAddEmail] = useState('');
  const [addRole, setAddRole] = useState<Role>('viewer');
  const [submitting, setSubmitting] = useState<boolean>(false);

  const canManage = useMemo(() => permissions.canManageUsers(), []);

  // 拉取列表
  const fetchUsers = async () => {
    if (!canManage) return;
    setLoading(true);
    setError(null);
    try {
      const data = await apiRequest<UserRow[]>('/api/admin/users/');
      const arr = Array.isArray(data) ? data : [];
      setUsers(
        arr.map((u) => ({
          ...u,
          role: (u.role || '').toString().toLowerCase() as Role,
        }))
      );
    } catch (e: any) {
      setError(e?.message || 'Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (canManage) fetchUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canManage]);

  if (!canManage) {
    return (
      <VStack align="stretch" gap={6}>
        <Heading color="white">User Management</Heading>
        <Box
          bg="rgba(255,255,255,0.08)"
          color="white"
          p={4}
          borderRadius="md"
          border="1px solid rgba(255,255,255,0.18)"
        >
          <Text fontWeight="bold" mb={2}>
            Access Denied
          </Text>
          <Text>Only Admin role can access user management.</Text>
        </Box>
      </VStack>
    );
  }

  // 新增用户
  const onAddUser = async () => {
    if (!addUsername.trim() || !addPassword.trim()) {
      alert('Username 与 Password 必填');
      return;
    }
    setSubmitting(true);
    try {
      await apiRequest('/api/admin/users/', {
        method: 'POST',
        body: {
          username: addUsername.trim(),
          password: addPassword,
          email: addEmail.trim() || undefined,
          role: addRole,
        },
      });
      // 重置表单并刷新列表
      setAddUsername('');
      setAddPassword('');
      setAddEmail('');
      setAddRole('viewer');
      setShowAdd(false);
      await fetchUsers();
      alert('User created');
    } catch (e: any) {
      alert(e?.data?.detail || e?.message || 'Create failed');
    } finally {
      setSubmitting(false);
    }
  };

  // 修改角色
  const onEditRole = async (u: UserRow) => {
    const next = prompt(
      `Set role for "${u.username}" (admin/editor/viewer):`,
      String(u.role || 'viewer')
    );
    if (!next) return;
    const v = next.trim().toLowerCase();
    if (!['admin', 'editor', 'viewer'].includes(v)) {
      alert('Invalid role. Use admin/editor/viewer.');
      return;
    }
    try {
      await apiRequest(`/api/admin/users/${u.id}/`, {
        method: 'PATCH',
        body: { role: v },
      });
      await fetchUsers();
      alert('Role updated');
    } catch (e: any) {
      alert(e?.data?.detail || e?.message || 'Update failed');
    }
  };

  // 删除用户
  const onDelete = async (u: UserRow) => {
    const yes = confirm(`Delete user "${u.username}" ?`);
    if (!yes) return;
    try {
      await apiRequest(`/api/admin/users/${u.id}/`, {
        method: 'DELETE',
      });
      await fetchUsers();
      alert('Deleted');
    } catch (e: any) {
      alert(e?.data?.detail || e?.message || 'Delete failed');
    }
  };

  return (
    <VStack align="stretch" gap={6}>
      <Heading color="white">User Management</Heading>

      {/* 新增用户按钮 */}
      <Button
        alignSelf="start"
        onClick={() => setShowAdd((s) => !s)}
        borderRadius="md"
        position="relative"
        _before={{
          content: '""',
          position: 'absolute',
          inset: 0,
          borderRadius: 'inherit',
          padding: '1px',
          background: 'linear-gradient(90deg,#60a5fa,#a78bfa)',
          WebkitMask:
            'linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)',
          WebkitMaskComposite: 'xor',
          maskComposite: 'exclude',
          pointerEvents: 'none',
        }}
        color="white"
        bg="linear-gradient(90deg,#3b82f6,#8b5cf6)"
        _hover={{ transform: 'translateY(-1px)' }}
      >
        {showAdd ? 'Close' : 'Add New User'}
      </Button>

      {/* 新增用户内联表单（玻璃拟态风格） */}
      {showAdd && (
        <Box
          bg="rgba(255,255,255,0.7)"
          color="gray.900"
          borderRadius="20px"
          border="1px solid rgba(226,232,240,0.8)"
          boxShadow="0 20px 60px rgba(0,0,0,.20)"
          style={{ backdropFilter: 'blur(10px)' }}
          p={5}
        >
          <Heading size="sm" mb={4}>
            Create New User
          </Heading>

          <VStack align="stretch" gap={3}>
            <Box>
              <Text fontSize="sm" color="gray.600" mb={1}>
                Username *
              </Text>
              <Input
                value={addUsername}
                onChange={(e) => setAddUsername(e.target.value)}
                placeholder="username"
              />
            </Box>

            <Box>
              <Text fontSize="sm" color="gray.600" mb={1}>
                Password *
              </Text>
              <Input
                type="password"
                value={addPassword}
                onChange={(e) => setAddPassword(e.target.value)}
                placeholder="min 6 characters"
              />
            </Box>

            <Box>
              <Text fontSize="sm" color="gray.600" mb={1}>
                Email
              </Text>
              <Input
                type="email"
                value={addEmail}
                onChange={(e) => setAddEmail(e.target.value)}
                placeholder="optional"
              />
            </Box>

            <Box>
              <Text fontSize="sm" color="gray.600" mb={1}>
                Role
              </Text>
              {/* 原生 select（避免 Chakra v3 类型问题） */}
              <select
                value={addRole}
                onChange={(e: ChangeEvent<HTMLSelectElement>) =>
                  setAddRole(e.target.value as Role)
                }
                style={{
                  width: '100%',
                  height: '40px',
                  padding: '8px',
                  borderRadius: '6px',
                  border: '1px solid #E2E8F0',
                  background: 'white',
                }}
              >
                <option value="viewer">viewer</option>
                <option value="editor">editor</option>
                <option value="admin">admin</option>
              </select>
            </Box>

            <HStack gap={3} pt={2}>
              <Button onClick={onAddUser} disabled={submitting} colorScheme="blue">
                {submitting ? 'Creating…' : 'Create'}
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setAddUsername('');
                  setAddPassword('');
                  setAddEmail('');
                  setAddRole('viewer');
                  setShowAdd(false);
                }}
              >
                Cancel
              </Button>
            </HStack>
          </VStack>
        </Box>
      )}

      {/* 列表卡片 */}
      <Box
        bg="white"
        border="1px solid #E2E8F0"
        borderRadius="2xl"
        boxShadow="0 10px 30px rgba(0,0,0,0.10)"
        overflow="hidden"
      >
        {/* 表头 */}
        <Box
          display="grid"
          gridTemplateColumns="1fr 1fr 1fr 1fr"
          bg="#0b0f2b"
          color="#E2E8F0"
          p={4}
          fontWeight="bold"
        >
          <Box>Username</Box>
          <Box>Role</Box>
          <Box>Date Joined</Box>
          <Box>Actions</Box>
        </Box>

        {/* 内容 */}
        {loading ? (
          <Box p={8} textAlign="center">
            <Spinner />
          </Box>
        ) : error ? (
          <Box p={6} color="red.500">
            {error}
          </Box>
        ) : users.length === 0 ? (
          <Box textAlign="center" py={10}>
            <Text color="gray.500">No users found.</Text>
          </Box>
        ) : (
          users.map((u) => (
            <Box
              key={u.id}
              display="grid"
              gridTemplateColumns="1fr 1fr 1fr 1fr"
              p={4}
              borderTop="1px solid #E2E8F0"
              alignItems="center"
            >
              <Box fontWeight="medium">{u.username}</Box>

              <Box>
                <Badge colorScheme={roleColor(String(u.role))}>
                  {String(u.role || '').toUpperCase()}
                </Badge>
              </Box>

              <Box>
                {u.date_joined
                  ? new Date(u.date_joined).toLocaleDateString()
                  : '—'}
              </Box>

              <HStack justify="flex-start" gap={2}>
                <Button size="sm" variant="outline" onClick={() => onEditRole(u)}>
                  Edit Role
                </Button>
                <Button size="sm" colorScheme="red" onClick={() => onDelete(u)}>
                  Delete
                </Button>
              </HStack>
            </Box>
          ))
        )}
      </Box>
    </VStack>
  );
}
