/* FULL FILE: src/app/dashboard/profile/page.tsx */
'use client';
export const dynamic = 'force-dynamic';

import { useEffect, useMemo, useState } from 'react';
import {
  Box,
  Container,
  Heading,
  Text,
  VStack,
  HStack,
  Badge,
  Spinner,
  Center,
  Button,
} from '@chakra-ui/react';
import { apiRequest } from '@/lib/api';
import { authService } from '@/services/auth';

/* 霓虹按钮（与你现有风格一致） */
function NeonButton(props: React.ComponentProps<typeof Button>) {
  return (
    <Button
      {...props}
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
      _hover={{
        transform: 'translateY(-1px)',
        boxShadow: '0 12px 28px rgba(59,130,246,0.25)',
      }}
      transition="all .15s ease"
    />
  );
}

type MeResponse = {
  id: number;
  username: string;
  email?: string;
  role?: 'admin' | 'editor' | 'viewer' | string;
  first_name?: string;
  last_name?: string;
  date_joined?: string;
  is_active?: boolean;
};

/* 生成头像字母 */
function getInitials(name?: string) {
  const n = (name || '').trim();
  if (!n) return 'U';
  const parts = n.split(/\s+/);
  const first = parts[0]?.[0] || '';
  const second = parts[1]?.[0] || '';
  return (first + second).toUpperCase();
}

export default function ProfilePage() {
  // 先尝试从本地缓存拿到一份（仅作占位，渲染后会用 /api/me 覆盖）
  const cached = useMemo(() => {
    try {
      return authService.getCurrentUser?.() ?? null;
    } catch {
      return null;
    }
  }, []);

  const [me, setMe] = useState<MeResponse | null>(
    cached
      ? {
          id: Number(cached.id),
          username: (cached as any).username || '—',
          email: (cached as any).email,
          role: (cached as any).role,
        }
      : null
  );
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const loadMe = async () => {
    try {
      setLoading(true);
      setErr(null);
      const data = await apiRequest<MeResponse>('/api/me/', { method: 'GET' });
      setMe(data || null);

      // 可选同步（避免 TS 报错，用 in 保护 + any）
      try {
        if (authService && 'setCurrentUser' in (authService as any)) {
          (authService as any).setCurrentUser?.({
            ...(authService as any).getCurrentUser?.(),
            ...data,
          });
        }
      } catch {}
    } catch (e: any) {
      setErr(e?.message || 'Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const roleColor = (role?: string) => {
    const r = (role || '').toLowerCase();
    if (r === 'admin') return 'red';
    if (r === 'editor') return 'blue';
    if (r === 'viewer') return 'gray';
    return 'purple';
  };

  /* ===== 背景：赛博渐变 + 光晕 ===== */
  const Background = (
    <Box
      position="fixed"
      inset="0"
      zIndex={0}
      pointerEvents="none"
      background={`
        radial-gradient(1200px 600px at 10% -10%, rgba(56,189,248,0.18), transparent 60%),
        radial-gradient(800px 500px at 90% 0%, rgba(139,92,246,0.18), transparent 60%),
        linear-gradient(180deg, #0a1022 0%, #0b0f2b 35%, #0d1236 100%)
      `}
    />
  );

  if (loading) {
    return (
      <Box position="relative" minH="100vh">
        {Background}
        <Container maxW="container.md" py={10} zIndex={1} position="relative">
          <Center minH="300px">
            <VStack gap={4}>
              <Spinner size="xl" color="white" />
              <Text color="gray.200">Loading profile…</Text>
            </VStack>
          </Center>
        </Container>
      </Box>
    );
  }

  if (err) {
    return (
      <Box position="relative" minH="100vh">
        {Background}
        <Container maxW="container.md" py={10} zIndex={1} position="relative">
          <Box
            bg="rgba(255,0,0,0.06)"
            border="1px solid rgba(248,113,113,0.8)"
            borderRadius="16px"
            p={4}
            style={{ backdropFilter: 'blur(6px)' }}
          >
            <Heading size="sm" color="red.700" mb={2}>
              Unable to load profile
            </Heading>
            <Text color="red.600" mb={4}>{err}</Text>
            <NeonButton onClick={loadMe} size="sm">Retry</NeonButton>
          </Box>
        </Container>
      </Box>
    );
  }

  const username = me?.username || '—';
  const email = me?.email || '—';
  const role = (me?.role || 'viewer') as string;
  const joined = me?.date_joined
    ? new Date(me.date_joined).toLocaleString()
    : '—';

  return (
    <Box position="relative" minH="100vh">
      {Background}

      <Container maxW="container.lg" py={10} zIndex={1} position="relative">
        <VStack align="stretch" gap={6}>
          {/* 顶部标题区：左标题 + 右刷新 */}
          <HStack justify="space-between" align="center">
            <Heading size="lg" color="white" letterSpacing="0.3px">
              My Profile
            </Heading>
            <NeonButton size="sm" onClick={loadMe}>
              Refresh
            </NeonButton>
          </HStack>

          {/* 顶部信息卡：自定义圆形头像 + 用户名 + 角色徽章 */}
          <Box
            p={6}
            border="1px solid rgba(226,232,240,0.40)"
            borderRadius="24px"
            bg="linear-gradient(180deg, rgba(255,255,255,0.38), rgba(255,255,255,0.30))"
            boxShadow="0 24px 80px rgba(0,0,0,0.28)"
            style={{ backdropFilter: 'blur(12px)' }}
          >
            <HStack align="center" gap={6} flexWrap="wrap">
              {/* 自定义头像圆形块（避免 Chakra v3 Avatar 类型差异） */}
              <Box
                w="72px"
                h="72px"
                borderRadius="full"
                display="flex"
                alignItems="center"
                justifyContent="center"
                bg="linear-gradient(135deg, rgba(59,130,246,0.9), rgba(147,51,234,0.9))"
                color="white"
                fontWeight="bold"
                fontSize="lg"
                boxShadow="0 10px 28px rgba(59,130,246,0.35)"
              >
                {getInitials(username)}
              </Box>

              <VStack align="start" gap={1} flex={1} minW="220px">
                <HStack gap={3} align="center" flexWrap="wrap">
                  <Heading size="md" color="#0f172a">
                    {username}
                  </Heading>
                  <Badge colorScheme={roleColor(role)} borderRadius="full" px={3}>
                    {String(role).toLowerCase()}
                  </Badge>
                </HStack>
                <Text color="gray.700">{email}</Text>
                <Text color="gray.600">Joined: {joined}</Text>
              </VStack>
            </HStack>
          </Box>

          {/* 详细信息卡：用自定义分隔线替代 Divider，避免 v3 兼容性 */}
          <Box
            p={6}
            border="1px solid rgba(226,232,240,0.60)"
            borderRadius="24px"
            bg="rgba(255,255,255,0.72)"
            boxShadow="0 16px 60px rgba(0,0,0,0.22)"
            style={{ backdropFilter: 'blur(10px)' }}
          >
            <VStack align="stretch" gap={4}>
              <Text fontWeight="semibold" color="#111827">
                Account Details
              </Text>
              {/* 自定义分隔线 */}
              <Box as="hr" border="none" height="1px" bg="rgba(226,232,240,0.9)" />

              <InfoRow label="Username" value={username} />
              <InfoRow label="Email" value={email} />
              <InfoRow label="Role" value={String(role).toLowerCase()} />
              <InfoRow label="Joined" value={joined} />
            </VStack>

            {/* 右下角禁用按钮：传达“只读，不可编辑” */}
            <HStack justify="flex-end" mt={6}>
              <Button variant="outline" disabled>
                Edit (disabled)
              </Button>
            </HStack>
          </Box>
        </VStack>
      </Container>
    </Box>
  );
}

/* 信息行（左 label 固定宽度，右 value 自适应，整体对齐更整洁） */
function InfoRow({ label, value }: { label: string; value?: React.ReactNode }) {
  return (
    <HStack align="start" gap={3}>
      <Box flexShrink={0} w="140px" textAlign="right">
        <Text fontSize="sm" color="gray.600" fontWeight="semibold">
          {label}
        </Text>
      </Box>
      <Box flex="1" minW={0}>
        <Text fontSize="sm" color="gray.800" whiteSpace="pre-wrap">
          {value ?? '—'}
        </Text>
      </Box>
    </HStack>
  );
}
