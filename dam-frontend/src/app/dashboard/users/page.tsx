/* FULL FILE: src/app/dashboard/users/page.tsx */
'use client';

import { useEffect, useMemo, useState } from 'react';
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

// ---------------- Theme Tokens (粉色玻璃拟态) ----------------
const PINK_BG = 'rgba(253, 242, 248, 0.80)';         // 粉-50 ~ 80% 透明
const PINK_BG_ALT = 'rgba(253, 242, 248, 0.92)';     // 行条纹稍深
const PINK_BORDER = 'rgba(244, 114, 182, 0.45)';     // 粉-400 边框
const PINK_SHADOW = '0 18px 48px rgba(244, 114, 182, 0.25)';

// ---------------- Types ----------------
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

type Tag = {
  id: number;
  name: string;
};

// 角色颜色
const roleColor = (role: string): any =>
  role === 'admin' ? 'red' : role === 'editor' ? 'blue' : 'green';

// ---------------- Page ----------------
export default function UsersPage() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loadingUsers, setLoadingUsers] = useState<boolean>(true);
  const [userErr, setUserErr] = useState<string | null>(null);

  // 新增用户表单显隐
  const [showAdd, setShowAdd] = useState<boolean>(false);
  const [addUsername, setAddUsername] = useState('');
  const [addPassword, setAddPassword] = useState('');
  const [addEmail, setAddEmail] = useState('');
  const [addRole, setAddRole] = useState<Role>('viewer');
  const [submittingUser, setSubmittingUser] = useState<boolean>(false);

  // Tag 管理
  const [tags, setTags] = useState<Tag[]>([]);
  const [loadingTags, setLoadingTags] = useState<boolean>(true);
  const [tagErr, setTagErr] = useState<string | null>(null);
  const [newTagName, setNewTagName] = useState('');
  const [renamingTagId, setRenamingTagId] = useState<number | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [pendingTagId, setPendingTagId] = useState<number | null>(null); // 正在删除/修改中的 tag

  const canManage = useMemo(() => permissions.canManageUsers(), []);

  // ====================== Users ======================
  const fetchUsers = async () => {
    if (!canManage) return;
    setLoadingUsers(true);
    setUserErr(null);
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
      setUserErr(e?.message || 'Failed to load users');
    } finally {
      setLoadingUsers(false);
    }
  };

  useEffect(() => {
    if (canManage) {
      fetchUsers();
      fetchTags();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canManage]);

  if (!canManage) {
    return (
      <VStack align="stretch" gap={6}>
        <Heading color="white">Admin</Heading>
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
          <Text>Only Admin can access user & tag management.</Text>
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
    setSubmittingUser(true);
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
      setSubmittingUser(false);
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
  const onDeleteUser = async (u: UserRow) => {
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

  // ====================== Tags (CRUD) ======================

  // 拉取 tag 列表
  const fetchTags = async () => {
    setLoadingTags(true);
    setTagErr(null);
    try {
      const data = await apiRequest<any>('/api/tags/');
      const arr = Array.isArray(data) ? data : (data?.results ?? []);
      setTags(arr as Tag[]);
    } catch (e: any) {
      setTagErr(e?.message || 'Failed to load tags');
    } finally {
      setLoadingTags(false);
    }
  };

  // 新增 tag
  const onAddTag = async () => {
    const name = newTagName.trim();
    if (!name) {
      alert('Tag name 不能为空');
      return;
    }
    try {
      const created = await apiRequest<Tag>('/api/tags/', {
        method: 'POST',
        body: { name },
      });
      setTags((prev) => [...prev, created]);
      setNewTagName('');
    } catch (e: any) {
      alert(e?.data?.detail || e?.message || 'Create tag failed');
    }
  };

  // 开始重命名
  const startRename = (tag: Tag) => {
    setRenamingTagId(tag.id);
    setRenameValue(tag.name);
  };

  // 提交重命名
  const submitRename = async (tagId: number) => {
    const val = renameValue.trim();
    if (!val) {
      alert('Tag name 不能为空');
      return;
    }
    setPendingTagId(tagId);
    try {
      const updated = await apiRequest<Tag>(`/api/tags/${tagId}/`, {
        method: 'PATCH',
        body: { name: val },
      });
      setTags((prev) => prev.map((t) => (t.id === tagId ? updated : t)));
      setRenamingTagId(null);
      setRenameValue('');
    } catch (e: any) {
      alert(e?.data?.detail || e?.message || 'Rename failed');
    } finally {
      setPendingTagId(null);
    }
  };

  // 删除 tag
  const onDeleteTag = async (tag: Tag) => {
    const yes = confirm(`Delete tag "${tag.name}" ?`);
    if (!yes) return;
    setPendingTagId(tag.id);
    try {
      await apiRequest(`/api/tags/${tag.id}/`, { method: 'DELETE' });
      setTags((prev) => prev.filter((t) => t.id !== tag.id));
    } catch (e: any) {
      alert(e?.data?.detail || e?.message || 'Delete tag failed');
    } finally {
      setPendingTagId(null);
    }
  };

  // ---------------- Render ----------------
  return (
    <VStack align="stretch" gap={10}>
      {/* ========== 用户管理 ========== */}
      <Box>
        <Heading color="white" mb={4}>User Management</Heading>

        {/* 新增用户按钮（文案已优化） */}
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
            background: 'linear-gradient(90deg,#f472b6,#a78bfa)', // 粉紫描边
            WebkitMask:
              'linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)',
            WebkitMaskComposite: 'xor',
            maskComposite: 'exclude',
            pointerEvents: 'none',
          }}
          color="white"
          bg="linear-gradient(90deg,#f472b6,#8b5cf6)" // 粉→紫渐变
          _hover={{ transform: 'translateY(-1px)' }}
          mb={4}
        >
          {showAdd ? 'Close Form' : 'New Account'}
        </Button>

        {/* 新增用户内联表单（保持原样式，可与外观统一） */}
        {showAdd && (
          <Box
            bg={PINK_BG}
            color="gray.900"
            borderRadius="20px"
            border={`1px solid ${PINK_BORDER}`}
            boxShadow={PINK_SHADOW}
            style={{ backdropFilter: 'blur(10px)' }}
            p={5}
            mb={6}
          >
            <Heading size="sm" mb={4}>
              Create New User
            </Heading>

            <VStack align="stretch" gap={3}>
              <Box>
                <Text fontSize="sm" color="gray.700" mb={1}>
                  Username *
                </Text>
                <Input
                  value={addUsername}
                  onChange={(e) => setAddUsername(e.target.value)}
                  placeholder="username"
                  bg="white"
                />
              </Box>

              <Box>
                <Text fontSize="sm" color="gray.700" mb={1}>
                  Password *
                </Text>
                <Input
                  type="password"
                  value={addPassword}
                  onChange={(e) => setAddPassword(e.target.value)}
                  placeholder="min 6 characters"
                  bg="white"
                />
              </Box>

              <Box>
                <Text fontSize="sm" color="gray.700" mb={1}>
                  Email
                </Text>
                <Input
                  type="email"
                  value={addEmail}
                  onChange={(e) => setAddEmail(e.target.value)}
                  placeholder="optional"
                  bg="white"
                />
              </Box>

              <Box>
                <Text fontSize="sm" color="gray.700" mb={1}>
                  Role
                </Text>
                {/* 原生 select（避免 Chakra v3 类型问题） */}
                <select
                  value={addRole}
                  onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
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
                <Button
                  onClick={onAddUser}
                  disabled={submittingUser}
                  colorScheme="pink"
                >
                  {submittingUser ? 'Creating…' : 'Create'}
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

        {/* 列表卡片 —— 粉色玻璃表格 */}
        <Box
          bg={PINK_BG}
          border={`1px solid ${PINK_BORDER}`}
          borderRadius="20px"
          boxShadow={PINK_SHADOW}
          overflow="hidden"
          style={{ backdropFilter: 'blur(10px)' }}
        >
          {/* 表头（深色保持对比） */}
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
          {loadingUsers ? (
            <Box p={8} textAlign="center">
              <Spinner />
            </Box>
          ) : userErr ? (
            <Box p={6} color="red.500">
              {userErr}
            </Box>
          ) : users.length === 0 ? (
            <Box textAlign="center" py={10}>
              <Text color="gray.700">No users found.</Text>
            </Box>
          ) : (
            users.map((u, idx) => (
              <Box
                key={u.id}
                display="grid"
                gridTemplateColumns="1fr 1fr 1fr 1fr"
                p={4}
                borderTop={`1px solid ${PINK_BORDER}`}
                alignItems="center"
                bg={idx % 2 === 0 ? PINK_BG_ALT : PINK_BG}
              >
                <Box fontWeight="medium" color="#1A202C">{u.username}</Box>

                <Box>
                  <Badge colorScheme={roleColor(String(u.role))}>
                    {String(u.role || '').toUpperCase()}
                  </Badge>
                </Box>

                <Box color="#1A202C">
                  {u.date_joined
                    ? new Date(u.date_joined).toLocaleDateString()
                    : '—'}
                </Box>

                <HStack justify="flex-start" gap={2}>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onEditRole(u)}
                  >
                    Edit Role
                  </Button>
                  <Button
                    size="sm"
                    colorScheme="red"
                    onClick={() => onDeleteUser(u)}
                  >
                    Delete
                  </Button>
                </HStack>
              </Box>
            ))
          )}
        </Box>
      </Box>

      {/* ========== Tag 管理 ========== */}
      <Box>
        <Heading color="white" mb={4}>Tag Management</Heading>

        {/* 新建 tag —— 粉色卡片（与外观统一） */}
        <Box
          bg={PINK_BG}
          color="gray.900"
          borderRadius="20px"
          border={`1px solid ${PINK_BORDER}`}
          boxShadow={PINK_SHADOW}
          style={{ backdropFilter: 'blur(10px)' }}
          p={5}
          mb={6}
          maxW="560px"
        >
          <Text fontWeight="semibold" mb={3} color="gray.800">Create a new tag</Text>
          <HStack gap={3}>
            <Input
              placeholder="tag name"
              value={newTagName}
              onChange={(e) => setNewTagName(e.target.value)}
              bg="white"
            />
            <Button colorScheme="pink" onClick={onAddTag}>
              Add
            </Button>
          </HStack>
        </Box>

        {/* tag 列表 —— 粉色玻璃表格 */}
        <Box
          bg={PINK_BG}
          border={`1px solid ${PINK_BORDER}`}
          borderRadius="20px"
          boxShadow={PINK_SHADOW}
          overflow="hidden"
          style={{ backdropFilter: 'blur(10px)' }}
        >
          {/* 表头 */}
          <Box
            display="grid"
            gridTemplateColumns="80px 1fr 220px"
            bg="#0b0f2b"
            color="#E2E8F0"
            p={4}
            fontWeight="bold"
          >
            <Box>ID</Box>
            <Box>Name</Box>
            <Box>Actions</Box>
          </Box>

          {loadingTags ? (
            <Box p={8} textAlign="center">
              <Spinner />
            </Box>
          ) : tagErr ? (
            <Box p={6} color="red.500">
              {tagErr}
            </Box>
          ) : tags.length === 0 ? (
            <Box textAlign="center" py={10}>
              <Text color="gray.700">No tags.</Text>
            </Box>
          ) : (
            tags.map((t, idx) => {
              const isEditing = renamingTagId === t.id;
              const pending = pendingTagId === t.id;
              return (
                <Box
                  key={t.id}
                  display="grid"
                  gridTemplateColumns="80px 1fr 220px"
                  p={4}
                  borderTop={`1px solid ${PINK_BORDER}`}
                  alignItems="center"
                  bg={idx % 2 === 0 ? PINK_BG_ALT : PINK_BG}
                >
                  <Box color="#1A202C">{t.id}</Box>
                  <Box>
                    {isEditing ? (
                      <Input
                        value={renameValue}
                        onChange={(e) => setRenameValue(e.target.value)}
                        bg="white"
                        size="sm"
                      />
                    ) : (
                      <Text color="#1A202C">{t.name}</Text>
                    )}
                  </Box>
                  <HStack gap={2}>
                    {isEditing ? (
                      <>
                        <Button
                          size="sm"
                          colorScheme="pink"
                          onClick={() => submitRename(t.id)}
                          disabled={pending}
                        >
                          Save
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setRenamingTagId(null);
                            setRenameValue('');
                          }}
                          disabled={pending}
                        >
                          Cancel
                        </Button>
                      </>
                    ) : (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => startRename(t)}
                          disabled={pending}
                        >
                          Rename
                        </Button>
                        <Button
                          size="sm"
                          colorScheme="red"
                          onClick={() => onDeleteTag(t)}
                          disabled={pending}
                        >
                          Delete
                        </Button>
                      </>
                    )}
                  </HStack>
                </Box>
              );
            })
          )}
        </Box>
      </Box>
    </VStack>
  );
}
