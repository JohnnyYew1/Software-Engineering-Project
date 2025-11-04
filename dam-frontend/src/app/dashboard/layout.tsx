/* FULL FILE: src/app/dashboard/layout.tsx */
'use client';

import { useEffect, useMemo } from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  Button,
  Spinner,
  Heading,
} from '@chakra-ui/react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

type Role = 'admin' | 'editor' | 'viewer';
type MenuItem = { name: string; path: string; roles: Role[]; strict?: boolean };

/** 霓虹按钮（侧边栏导航）：文字固定白色，激活/悬停有描边与背景变化 */
function NeonButton(
  props: React.ComponentProps<typeof Button> & { active?: boolean }
) {
  const { active, ...rest } = props;
  return (
    <Button
      {...rest}
      color="white"
      borderRadius="md"
      bg={active ? 'rgba(59,130,246,0.20)' : 'transparent'}
      justifyContent="start"
      position="relative"
      _hover={{
        bg: active ? 'rgba(59,130,246,0.28)' : 'rgba(148,163,184,0.15)',
        transform: 'translateX(2px)',
        boxShadow: active
          ? '0 12px 28px rgba(59,130,246,0.25)'
          : '0 10px 24px rgba(0,0,0,0.06)',
      }}
      _active={{ bg: 'rgba(59,130,246,0.32)' }}
      _before={{
        content: '""',
        position: 'absolute',
        inset: 0,
        borderRadius: 'inherit',
        padding: '1px',
        background: active
          ? 'linear-gradient(90deg,#60a5fa,#a78bfa)'
          : 'linear-gradient(90deg,#94a3b8,#cbd5e1)',
        WebkitMask:
          'linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)',
        mask:
          'linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)',
        WebkitMaskComposite: 'xor',
        maskComposite: 'exclude',
        pointerEvents: 'none',
      }}
      transition="all .15s ease"
    />
  );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, loading, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!loading && !user) router.replace('/login');
  }, [loading, user, router]);

  const handleLogout = async () => {
    await logout();
    router.replace('/login');
  };

  const menuItems: MenuItem[] = useMemo(() => {
    const role = (user?.role ?? 'viewer') as Role;
    const base: MenuItem[] = [
      { name: 'Dashboard', path: '/dashboard', roles: ['admin','editor','viewer'], strict: true },
      { name: 'Assets', path: '/dashboard/assets', roles: ['admin','editor','viewer'] },
      { name: 'My Profile', path: '/dashboard/profile', roles: ['admin','editor','viewer'] },
    ];
    if (role === 'editor') {
      base.splice(2, 0, { name: 'Upload', path: '/dashboard/upload', roles: ['editor'] });
    }
    if (role === 'admin') {
      base.splice(1, 0, { name: 'Admin (Users & Tags)', path: '/dashboard/users', roles: ['admin'] });
    }
    return base.filter(it => it.roles.includes(role));
  }, [user?.role]);

  const isActive = (it: MenuItem) =>
    it.strict ? pathname === it.path : pathname === it.path || pathname.startsWith(it.path + '/');

  if (loading) {
    return (
      <Box minH="100vh" display="flex" alignItems="center" justifyContent="center" bg="#0b0f2b">
        <HStack gap={3}><Spinner color="white" /><Text color="white">Checking session...</Text></HStack>
      </Box>
    );
  }
  if (!user) {
    return (
      <Box minH="100vh" display="flex" alignItems="center" justifyContent="center" bg="#0b0f2b">
        <Text color="white">Redirecting to login...</Text>
      </Box>
    );
  }

  const roleColor = (r?: Role) => (r === 'admin' ? 'red.300' : r === 'editor' ? 'blue.300' : 'green.300');
  const roleDesc = (r?: Role) =>
    r === 'admin' ? 'System Administrator — Manage users and all assets'
    : r === 'editor' ? 'Content Editor — Upload and manage your own assets'
    : 'Viewer — Browse and download assets';

  return (
    <Box minH="100vh" position="relative">
      {/* 背景 */}
      <Box
        position="fixed" inset="0" zIndex={0} pointerEvents="none"
        background="
          radial-gradient(1200px 600px at 10% -10%, rgba(56,189,248,0.18), transparent 60%),
          radial-gradient(800px 500px at 90% 0%, rgba(139,92,246,0.18), transparent 60%),
          linear-gradient(180deg, #0a1022 0%, #0b0f2b 35%, #0d1236 100%)"
      >
        <Box
          position="absolute" inset="0" opacity={0.15}
          style={{
            backgroundImage:
              'linear-gradient(rgba(255,255,255,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)',
            backgroundSize: '36px 36px, 36px 36px',
          }}
        />
        <Box position="absolute" top="18%" left="10%" w="420px" h="420px" borderRadius="50%"
             background="radial-gradient(closest-side, rgba(59,130,246,0.35), transparent)"
             style={{ filter: 'blur(80px)' }} />
        <Box position="absolute" bottom="10%" right="6%" w="520px" h="520px" borderRadius="50%"
             background="radial-gradient(closest-side, rgba(147,51,234,0.35), transparent)"
             style={{ filter: 'blur(90px)' }} />
      </Box>

      <HStack align="start" gap={0} position="relative" zIndex={1}>
        {/* 侧边栏 */}
        <Box
          as="nav"
          w={{ base: '220px', md: '250px' }}
          minH="100vh"
          p={4}
          position="sticky"
          top={0}
          zIndex={3}
          borderRight="1px solid rgba(148,163,184,0.25)"
          background="rgba(13,18,54,0.72)"
          style={{ backdropFilter: 'blur(8px)' }}
        >
          <VStack align="stretch" gap={6}>
            {/* 顶部信息（玻璃卡） */}
            <Box
              p={4}
              border="1px solid rgba(226,232,240,0.90)"
              borderRadius="16px"
              bg="rgba(255,255,255,0.10)"
              style={{ backdropFilter: 'blur(10px)' }}
            >
              <Heading size="md" mb={1} color="white" letterSpacing="0.3px">
                DAM System
              </Heading>
              <Text fontSize="sm" color="gray.200" mb={1}>
                Welcome, {user.first_name || user.username}
              </Text>
              <Text fontSize="xs" color={roleColor(user.role as Role)} fontWeight="bold" mb={1}>
                Role: {(user.role || '').toUpperCase()}
              </Text>
              <Text fontSize="xs" color="gray.300">{roleDesc(user.role as Role)}</Text>
            </Box>

            {/* 分隔线：用 Box 代替 Divider */}
            <Box
              h="1px"
              w="100%"
              bg="rgba(226,232,240,0.24)"
              borderRadius="full"
            />

            {/* 导航菜单 */}
            <VStack align="stretch" gap={2}>
              {menuItems.map((item) => {
                const active = isActive(item);
                return (
                  <Box key={item.path} position="relative">
                    {active && (
                      <Box
                        position="absolute"
                        left="-8px"
                        top="10%"
                        bottom="10%"
                        w="3px"
                        bg="linear-gradient(180deg,#60a5fa,#a78bfa)"
                        borderRadius="full"
                      />
                    )}
                    <NeonButton
                      active={active}
                      variant={active ? 'solid' : 'ghost'}
                      size="sm"
                      fontWeight={active ? 'bold' : 'normal'}
                      aria-current={active ? 'page' : undefined}
                      onClick={() => router.push(item.path)}
                    >
                      {item.name}
                    </NeonButton>
                  </Box>
                );
              })}
              <NeonButton
                variant="ghost"
                onClick={handleLogout}
                mt={4}
                size="sm"
                title="Log out"
              >
                Log Out
              </NeonButton>
            </VStack>
          </VStack>
        </Box>

        {/* 主内容 */}
        <Box as="main" flex={1} p={{ base: 4, md: 6 }} position="relative" zIndex={2}>
          {children}
        </Box>
      </HStack>
    </Box>
  );
}
