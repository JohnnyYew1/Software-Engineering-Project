'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  Heading,
  SimpleGrid,
  Button,
} from '@chakra-ui/react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import GlassCard from '@/components/GlassCard';

type Stats = {
  totalAssets: number;
  totalDownloads: number;
  recentActivity: number;
  totalUsers?: number;
};

/* ========== 粉色玻璃拟态主题（与 Users/Preview/Upload 一致） ========== */
const PINK_BG = 'rgba(253, 242, 248, 0.80)';
const PINK_BG_ALT = 'rgba(253, 242, 248, 0.92)';
const PINK_BORDER = 'rgba(244, 114, 182, 0.45)';
const PINK_SHADOW = '0 18px 48px rgba(244, 114, 182, 0.25)';

/* 霓虹按钮：白字、透明底、粉→紫描边 */
function NeonButton(props: React.ComponentProps<typeof Button>) {
  const { color, variant, ...rest } = props;
  return (
    <Button
      {...rest}
      variant={variant ?? 'ghost'}
      color={color ?? 'white'}
      bg="transparent"
      borderRadius="md"
      position="relative"
      _before={{
        content: '""',
        position: 'absolute',
        inset: 0,
        borderRadius: 'inherit',
        padding: '1px',
        background: 'linear-gradient(90deg,#f472b6,#8b5cf6)',
        WebkitMask:
          'linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)',
        WebkitMaskComposite: 'xor',
        maskComposite: 'exclude',
        pointerEvents: 'none',
      }}
      _hover={{ transform: 'translateY(-1px)', boxShadow: PINK_SHADOW }}
      _active={{ transform: 'translateY(0)' }}
      _focusVisible={{ boxShadow: 'none' }}
      transition="all .15s ease"
    />
  );
}

export default function Dashboard() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [currentUser, setCurrentUser] = useState<any>(null);

  useEffect(() => {
    if (user) {
      setCurrentUser(user);
      return;
    }
    if (typeof window !== 'undefined') {
      try {
        const raw =
          window.localStorage.getItem('currentUser') ||
          window.localStorage.getItem('user');
        if (raw) setCurrentUser(JSON.parse(raw));
      } catch {}
    }
  }, [user]);

  const getStats = (): Stats => {
    const baseStats: Stats = {
      totalAssets: 156,
      totalDownloads: 1247,
      recentActivity: 23,
    };
    if (currentUser?.role === 'admin') return { ...baseStats, totalUsers: 8 };
    return baseStats;
  };

  const welcomeTitle = useMemo(() => {
    switch (currentUser?.role) {
      case 'admin':
        return 'System Overview — Manage users and monitor system activity';
      case 'editor':
        return 'Content Management — Upload and manage your digital assets';
      case 'viewer':
        return 'Asset Library — Browse and download available assets';
      default:
        return 'Overview of your digital assets';
    }
  }, [currentUser?.role]);

  if (loading && !currentUser) {
    return (
      <VStack align="stretch" gap={6}>
        <Heading color="white">Dashboard</Heading>
        <Text color="gray.300">Loading...</Text>
      </VStack>
    );
  }

  if (!currentUser) {
    return (
      <VStack align="stretch" gap={6}>
        <Heading color="white">Dashboard</Heading>
        <Text color="gray.300">Please login to continue.</Text>
      </VStack>
    );
  }

  const stats = getStats();

  return (
    <VStack align="stretch" gap={6}>
      {/* 顶部标题 */}
      <Box>
        <Heading color="white">Dashboard</Heading>
        <Text fontSize="xl" color="pink.300" fontWeight="bold">
          {welcomeTitle}
        </Text>
        <Text fontSize="sm" color="gray.300" mt={1}>
          Welcome back, {currentUser?.first_name || currentUser?.username}! You are logged in as{' '}
          <Text
            as="span"
            fontWeight="bold"
            color={
              currentUser?.role === 'admin'
                ? 'red.300'
                : currentUser?.role === 'editor'
                ? 'blue.300'
                : 'green.300'
            }
          >
            {currentUser?.role?.toUpperCase()}
          </Text>
        </Text>
      </Box>

      {/* 统计卡片（用 GlassCard + 粉色主题内容） */}
      <SimpleGrid
        columns={{ base: 1, md: currentUser?.role === 'admin' ? 4 : 3 }}
        gap={6}
      >
        <GlassCard p={6} bg={PINK_BG} border={`1px solid ${PINK_BORDER}`} boxShadow={PINK_SHADOW}>
          <Text fontSize="sm" color="gray.700">Total Assets</Text>
          <Text fontSize="3xl" fontWeight="bold" color="gray.900">{stats.totalAssets}</Text>
          <Text fontSize="xs" color="gray.700">Photos, 3D Models & Videos</Text>
        </GlassCard>

        <GlassCard p={6} bg={PINK_BG} border={`1px solid ${PINK_BORDER}`} boxShadow={PINK_SHADOW}>
          <Text fontSize="sm" color="gray.700">Total Downloads</Text>
          <Text fontSize="3xl" fontWeight="bold" color="gray.900">{stats.totalDownloads}</Text>
          <Text fontSize="xs" color="gray.700">All time downloads</Text>
        </GlassCard>

        <GlassCard p={6} bg={PINK_BG} border={`1px solid ${PINK_BORDER}`} boxShadow={PINK_SHADOW}>
          <Text fontSize="sm" color="gray.700">Recent Activity</Text>
          <Text fontSize="3xl" fontWeight="bold" color="gray.900">{stats.recentActivity}</Text>
          <Text fontSize="xs" color="gray.700">Last 30 days</Text>
        </GlassCard>

        {currentUser?.role === 'admin' && stats.totalUsers !== undefined && (
          <GlassCard p={6} bg={PINK_BG} border={`1px solid ${PINK_BORDER}`} boxShadow={PINK_SHADOW}>
            <Text fontSize="sm" color="gray.700">Total Users</Text>
            <Text fontSize="3xl" fontWeight="bold" color="gray.900">{stats.totalUsers}</Text>
            <Text fontSize="xs" color="gray.700">System users</Text>
          </GlassCard>
        )}
      </SimpleGrid>

      {/* 快捷操作 */}
      <SimpleGrid columns={{ base: 1, md: currentUser?.role === 'admin' ? 3 : 2 }} gap={6}>
        <GlassCard p={6} bg={PINK_BG} border={`1px solid ${PINK_BORDER}`} boxShadow={PINK_SHADOW}>
          <Heading size="md" mb={3} color="gray.900">Browse Assets</Heading>
          <Text color="gray.800" mb={4}>Explore all available digital assets in the system</Text>
          <NeonButton w="100%" onClick={() => router.push('/dashboard/assets')}>
            View All Assets
          </NeonButton>
        </GlassCard>

        {currentUser?.role === 'editor' && (
          <GlassCard p={6} bg={PINK_BG} border={`1px solid ${PINK_BORDER}`} boxShadow={PINK_SHADOW}>
            <Heading size="md" mb={3} color="gray.900">Upload Assets</Heading>
            <Text color="gray.800" mb={4}>Upload new photos, 3D models, or videos to the system</Text>
            <NeonButton w="100%" onClick={() => router.push('/dashboard/upload')}>
              Upload New Asset
            </NeonButton>
          </GlassCard>
        )}

        {currentUser?.role === 'admin' && (
          <GlassCard p={6} bg={PINK_BG} border={`1px solid ${PINK_BORDER}`} boxShadow={PINK_SHADOW}>
            <Heading size="md" mb={3} color="gray.900">User Management</Heading>
            <Text color="gray.800" mb={4}>Manage system users, roles, and permissions</Text>
            <NeonButton w="100%" onClick={() => router.push('/dashboard/users')}>
              Manage Users
            </NeonButton>
          </GlassCard>
        )}

        {currentUser?.role === 'viewer' && (
          <GlassCard p={6} bg={PINK_BG} border={`1px solid ${PINK_BORDER}`} boxShadow={PINK_SHADOW}>
            <Heading size="md" mb={3} color="gray.900">Get Started</Heading>
            <Text color="gray.800" mb={4}>Browse our collection of digital assets and download what you need</Text>
            <NeonButton w="100%" onClick={() => router.push('/dashboard/assets')}>
              Explore Assets
            </NeonButton>
          </GlassCard>
        )}
      </SimpleGrid>

      {/* 最近活动：容器 GlassCard，条目交替粉色透明 */}
      <GlassCard p={6} bg={PINK_BG} border={`1px solid ${PINK_BORDER}`} boxShadow={PINK_SHADOW}>
        <Heading size="md" mb={4} color="gray.900">Recent Activity</Heading>
        <VStack align="stretch" gap={3}>
          <HStack justify="space-between" p={3} borderRadius="md" bg={PINK_BG}>
            <Box>
              <Text fontWeight="medium" color="gray.900">New asset uploaded: product_design.glb</Text>
              <Text fontSize="sm" color="gray.700">3D Model • 45.2 MB • By editor1</Text>
            </Box>
            <Text color="gray.700" fontSize="sm">2 hours ago</Text>
          </HStack>

          <HStack justify="space-between" p={3} borderRadius="md" bg={PINK_BG_ALT}>
            <Box>
              <Text fontWeight="medium" color="gray.900">Asset downloaded: architecture_photo.jpg</Text>
              <Text fontSize="sm" color="gray.700">Photo • 8.7 MB • By viewer2</Text>
            </Box>
            <Text color="gray.700" fontSize="sm">1 day ago</Text>
          </HStack>

          {currentUser?.role === 'admin' && (
            <HStack justify="space-between" p={3} borderRadius="md" bg="rgba(255,255,255,0.93)">
              <Box>
                <Text fontWeight="medium" color="gray.900">User role updated: editor3 → viewer</Text>
                <Text fontSize="sm" color="gray.700">System Administration • By admin</Text>
              </Box>
              <Text color="gray.700" fontSize="sm">2 days ago</Text>
            </HStack>
          )}

          <HStack justify="space-between" p={3} borderRadius="md" bg={PINK_BG_ALT}>
            <Box>
              <Text fontWeight="medium" color="gray.900">New asset uploaded: character_model.fbx</Text>
              <Text fontSize="sm" color="gray.700">3D Model • 120.5 MB • By editor2</Text>
            </Box>
            <Text color="gray.700" fontSize="sm">2 days ago</Text>
          </HStack>
        </VStack>
      </GlassCard>
    </VStack>
  );
}
