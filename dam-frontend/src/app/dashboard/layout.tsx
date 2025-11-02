'use client';

import { useEffect } from 'react';
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
  const getMenuItems = () => {
    const role = user?.role;
    const baseItems = [
      { name: 'Dashboard', path: '/dashboard', roles: ['admin', 'editor', 'viewer'] },
      { name: 'Assets', path: '/dashboard/assets', roles: ['admin', 'editor', 'viewer'] },
      { name: 'My Profile', path: '/dashboard/profile', roles: ['admin', 'editor', 'viewer'] },
    ];

    if (role === 'editor') {
      baseItems.splice(2, 0, { name: 'Upload', path: '/dashboard/upload', roles: ['editor'] });
    }
    if (role === 'admin') {
      baseItems.splice(1, 0, { name: 'User Management', path: '/dashboard/users', roles: ['admin'] });
    }

    return baseItems.filter((it) => it.roles.includes(role as any));
  };

  const getRoleDescription = () => {
    switch (user?.role) {
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
          w="250px"
          bg="white"
          minH="100vh"
          p={4}
          boxShadow="md"
        >
          <VStack align="stretch" gap={6}>
            <Text fontSize="xl" fontWeight="bold" mb={4}>
              DAM System
            </Text>

            <Box>
              <Text fontSize="sm" color="gray.600" mb={1}>
                Welcome, {user.first_name || user.username}
              </Text>
              <Text
                fontSize="xs"
                color={
                  user.role === 'admin'
                    ? 'red.500'
                    : user.role === 'editor'
                    ? 'blue.500'
                    : 'green.500'
                }
                fontWeight="bold"
                mb={1}
              >
                Role: {user.role?.toUpperCase()}
              </Text>
              <Text fontSize="xs" color="gray.500">
                {getRoleDescription()}
              </Text>
            </Box>

            <VStack align="stretch" gap={2}>
              {getMenuItems().map((item) => (
                <Button
                  key={item.path}
                  variant={pathname === item.path ? 'solid' : 'ghost'}
                  colorScheme={pathname === item.path ? 'blue' : 'gray'}
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
        <Box flex={1} p={6}>
          {children}
        </Box>
      </HStack>
    </Box>
  );
}
