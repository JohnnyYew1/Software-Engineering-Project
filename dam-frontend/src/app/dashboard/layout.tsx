'use client';

import { useEffect, useMemo } from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  Button,
  Spinner,
} from '@chakra-ui/react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

type Role = 'admin' | 'editor' | 'viewer';

type MenuItem = {
  name: string;
  path: string;
  roles: Role[];
};

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  // 只有在 loading 结束后，再根据 user 决定是否重定向
  useEffect(() => {
    if (!loading && !user) {
      router.replace('/login');
    }
  }, [loading, user, router]);

  // 登出：清空状态后回到登录页
  const handleLogout = async () => {
    await logout();
    router.replace('/login');
  };

  // 侧边菜单
  const menuItems: MenuItem[] = useMemo(() => {
    const role = (user?.role ?? 'viewer') as Role;

    const base: MenuItem[] = [
      { name: 'Dashboard',        path: '/dashboard',          roles: ['admin', 'editor', 'viewer'] },
      { name: 'Assets',           path: '/dashboard/assets',   roles: ['admin', 'editor', 'viewer'] },
      { name: 'My Profile',       path: '/dashboard/profile',  roles: ['admin', 'editor', 'viewer'] },
    ];

    if (role === 'editor') {
      // 插入到 Assets 后面
      base.splice(2, 0, { name: 'Upload', path: '/dashboard/upload', roles: ['editor'] });
    }
    if (role === 'admin') {
      // 插入到 Dashboard 后面
      base.splice(1, 0, { name: 'User Management', path: '/dashboard/users', roles: ['admin'] });
    }

    return base.filter((it) => it.roles.includes(role));
  }, [user?.role]);

  const getRoleDescription = (r?: Role) => {
    switch (r) {
      case 'admin':
        return 'System Administrator - Manage users and all assets';
      case 'editor':
        return 'Content Editor - Upload and manage your own assets';
      case 'viewer':
        return 'Viewer - Browse and download assets';
      default:
        return '';
    }
  };

  const roleColor = (r?: Role) =>
    r === 'admin' ? 'red.500' : r === 'editor' ? 'blue.500' : 'green.500';

  // 判断高亮：当前路径是否等于或以菜单路径开头（支持子页）
  const isActive = (path: string) =>
    pathname === path || pathname.startsWith(path + '/');

  // 首屏：如果还在加载，就给一个中立态，不做跳转
  if (loading) {
    return (
      <Box minH="100vh" display="flex" alignItems="center" justifyContent="center">
        <HStack gap={3}>
          <Spinner />
          <Text>Checking session...</Text>
        </HStack>
      </Box>
    );
  }

  // 加载结束但未登录：展示个轻量文案（useEffect 会触发跳转）
  if (!user) {
    return (
      <Box minH="100vh" display="flex" alignItems="center" justifyContent="center">
        <Text>Redirecting to login...</Text>
      </Box>
    );
  }

  // 已登录正常渲染
  return (
    <Box minH="100vh" bg="gray.50">
      <HStack align="start" gap={0}>
        {/* 侧边栏 */}
        <Box
          w={{ base: '220px', md: '250px' }}
          bg="white"
          minH="100vh"
          p={4}
          boxShadow="md"
          position="sticky"
          top={0}
        >
          <VStack align="stretch" gap={6}>
            <Text fontSize="xl" fontWeight="bold" mb={2}>
              DAM System
            </Text>

            <Box>
              <Text fontSize="sm" color="gray.600" mb={1}>
                Welcome, {user.first_name || user.username}
              </Text>
              <Text
                fontSize="xs"
                color={roleColor(user.role as Role)}
                fontWeight="bold"
                mb={1}
              >
                Role: {(user.role || '').toUpperCase()}
              </Text>
              <Text fontSize="xs" color="gray.500">
                {getRoleDescription(user.role as Role)}
              </Text>
            </Box>

            <VStack align="stretch" gap={2}>
              {menuItems.map((item) => (
                <Button
                  key={item.path}
                  variant={isActive(item.path) ? 'solid' : 'ghost'}
                  colorScheme={isActive(item.path) ? 'blue' : 'gray'}
                  justifyContent="start"
                  onClick={() => router.push(item.path)}
                  size="sm"
                >
                  {item.name}
                </Button>
              ))}

              <Button
                variant="ghost"
                colorScheme="red"
                justifyContent="start"
                onClick={handleLogout}
                mt={4}
                size="sm"
              >
                Log Out
              </Button>
            </VStack>
          </VStack>
        </Box>

        {/* 主内容 */}
        <Box flex={1} p={{ base: 4, md: 6 }}>
          {children}
        </Box>
      </HStack>
    </Box>
  );
}
