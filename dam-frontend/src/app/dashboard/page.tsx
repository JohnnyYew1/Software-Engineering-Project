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

// 统一霓虹按钮（Chakra v3 兼容）
function NeonButton(props: React.ComponentProps<typeof Button>) {
  return (
    <Button
      {...props}
      color="white"
      borderRadius="md"
      bg="rgba(59,130,246,0.20)"
      _hover={{
        bg: 'rgba(59,130,246,0.28)',
        transform: 'translateY(-1px)',
        boxShadow: '0 12px 28px rgba(59,130,246,0.25)',
      }}
      _active={{ bg: 'rgba(59,130,246,0.35)' }}
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
    if (currentUser?.role === 'admin') {
      return { ...baseStats, totalUsers: 8 };
    }
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
      {/* 顶部标题（白字，匹配深色背景） */}
      <Box>
        <Heading color="white">Dashboard</Heading>
        <Text fontSize="xl" color="blue.300" fontWeight="bold">
          {welcomeTitle}
        </Text>
        <Text fontSize="sm" color="gray.300" mt={1}>
          Welcome back, {currentUser?.first_name || currentUser?.username}! You
          are logged in as{' '}
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

      {/* 统计卡片：70% 透明玻璃卡 */}
      <SimpleGrid
        columns={{ base: 1, md: currentUser?.role === 'admin' ? 4 : 3 }}
        gap={6}
      >
        <GlassCard p={6}>
          <Text fontSize="sm" color="gray.600">
            Total Assets
          </Text>
          <Text fontSize="3xl" fontWeight="bold">
            {stats.totalAssets}
          </Text>
          <Text fontSize="xs" color="gray.600">
            Photos, 3D Models & Videos
          </Text>
        </GlassCard>

        <GlassCard p={6}>
          <Text fontSize="sm" color="gray.600">
            Total Downloads
          </Text>
          <Text fontSize="3xl" fontWeight="bold">
            {stats.totalDownloads}
          </Text>
          <Text fontSize="xs" color="gray.600">
            All time downloads
          </Text>
        </GlassCard>

        <GlassCard p={6}>
          <Text fontSize="sm" color="gray.600">
            Recent Activity
          </Text>
          <Text fontSize="3xl" fontWeight="bold">
            {stats.recentActivity}
          </Text>
          <Text fontSize="xs" color="gray.600">
            Last 30 days
          </Text>
        </GlassCard>

        {currentUser?.role === 'admin' && stats.totalUsers !== undefined && (
          <GlassCard p={6}>
            <Text fontSize="sm" color="gray.600">
              Total Users
            </Text>
            <Text fontSize="3xl" fontWeight="bold">
              {stats.totalUsers}
            </Text>
            <Text fontSize="xs" color="gray.600">
              System users
            </Text>
          </GlassCard>
        )}
      </SimpleGrid>

      {/* 快捷操作：透明卡 + 霓虹按钮 */}
      <SimpleGrid
        columns={{ base: 1, md: currentUser?.role === 'admin' ? 3 : 2 }}
        gap={6}
      >
        <GlassCard p={6}>
          <Heading size="md" mb={3}>
            Browse Assets
          </Heading>
          <Text color="gray.600" mb={4}>
            Explore all available digital assets in the system
          </Text>
          <NeonButton w="100%" onClick={() => router.push('/dashboard/assets')}>
            View All Assets
          </NeonButton>
        </GlassCard>

        {currentUser?.role === 'editor' && (
          <GlassCard p={6}>
            <Heading size="md" mb={3}>
              Upload Assets
            </Heading>
            <Text color="gray.600" mb={4}>
              Upload new photos, 3D models, or videos to the system
            </Text>
            <NeonButton w="100%" onClick={() => router.push('/dashboard/upload')}>
              Upload New Asset
            </NeonButton>
          </GlassCard>
        )}

        {currentUser?.role === 'admin' && (
          <GlassCard p={6}>
            <Heading size="md" mb={3}>
              User Management
            </Heading>
            <Text color="gray.600" mb={4}>
              Manage system users, roles, and permissions
            </Text>
            <NeonButton w="100%" onClick={() => router.push('/dashboard/users')}>
              Manage Users
            </NeonButton>
          </GlassCard>
        )}

        {currentUser?.role === 'viewer' && (
          <GlassCard p={6}>
            <Heading size="md" mb={3}>
              Get Started
            </Heading>
            <Text color="gray.600" mb={4}>
              Browse our collection of digital assets and download what you need
            </Text>
            <NeonButton w="100%" onClick={() => router.push('/dashboard/assets')}>
              Explore Assets
            </NeonButton>
          </GlassCard>
        )}
      </SimpleGrid>

      {/* 最近活动：容器用 GlassCard；行用浅透明交替 */}
      <GlassCard p={6}>
        <Heading size="md" mb={4}>
          Recent Activity
        </Heading>
        <VStack align="stretch" gap={3}>
          <HStack
            justify="space-between"
            p={3}
            borderRadius="md"
            bg="rgba(255,255,255,0.55)"
          >
            <Box>
              <Text fontWeight="medium">
                New asset uploaded: product_design.glb
              </Text>
              <Text fontSize="sm" color="gray.600">
                3D Model • 45.2 MB • By editor1
              </Text>
            </Box>
            <Text color="gray.600" fontSize="sm">
              2 hours ago
            </Text>
          </HStack>

          <HStack
            justify="space-between"
            p={3}
            borderRadius="md"
            bg="rgba(255,255,255,0.65)"
          >
            <Box>
              <Text fontWeight="medium">
                Asset downloaded: architecture_photo.jpg
              </Text>
              <Text fontSize="sm" color="gray.600">
                Photo • 8.7 MB • By viewer2
              </Text>
            </Box>
            <Text color="gray.600" fontSize="sm">
              1 day ago
            </Text>
          </HStack>

          {currentUser?.role === 'admin' && (
            <HStack
              justify="space-between"
              p={3}
              borderRadius="md"
              bg="rgba(255, 255, 255, 0.93)"
            >
              <Box>
                <Text fontWeight="medium">
                  User role updated: editor3 → viewer
                </Text>
                <Text fontSize="sm" color="gray.600">
                  System Administration • By admin
                </Text>
              </Box>
              <Text color="gray.600" fontSize="sm">
                2 days ago
              </Text>
            </HStack>
          )}

          <HStack
            justify="space-between"
            p={3}
            borderRadius="md"
            bg="rgba(255,255,255,0.65)"
          >
            <Box>
              <Text fontWeight="medium">
                New asset uploaded: character_model.fbx
              </Text>
              <Text fontSize="sm" color="gray.600">
                3D Model • 120.5 MB • By editor2
              </Text>
            </Box>
            <Text color="gray.600" fontSize="sm">
              2 days ago
            </Text>
          </HStack>
        </VStack>
      </GlassCard>
    </VStack>
  );
}
