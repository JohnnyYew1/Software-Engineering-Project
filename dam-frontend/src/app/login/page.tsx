'use client';

import { useEffect, useState } from 'react';
import {
  Box,
  VStack,
  Heading,
  Text,
  Input,
  Button,
  HStack,
} from '@chakra-ui/react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

/* 粉色玻璃拟态主题（与 Users/Tags 一致） */
const PINK_BG = 'rgba(253, 242, 248, 0.80)';   // 背景
const PINK_BORDER = 'rgba(244, 114, 182, 0.45)'; // 边框
const PINK_SHADOW = '0 18px 48px rgba(244, 114, 182, 0.25)';

/* 霓虹描边按钮：粉→紫渐变，白字 */
function NeonButton(props: React.ComponentProps<typeof Button>) {
  const { children, ...rest } = props;
  return (
    <Button
      {...rest}
      color="white"
      bg="linear-gradient(90deg,#f472b6,#8b5cf6)"
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
      _hover={{
        transform: 'translateY(-1px)',
        boxShadow: '0 16px 36px rgba(244, 114, 182, .25)',
      }}
      _active={{ transform: 'translateY(0)' }}
      transition="all .15s ease"
    >
      {children}
    </Button>
  );
}

export default function LoginPage() {
  const router = useRouter();
  const { user, loading, login } = useAuth();

  const [isLoading, setIsLoading] = useState(false);
  const [showPwd, setShowPwd] = useState(false);
  const [formData, setFormData] = useState({ username: '', password: '' });
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (!loading && user) router.replace('/dashboard');
  }, [loading, user, router]);

  useEffect(() => {
    if (!message) return;
    const t = setTimeout(() => setMessage(null), 4500);
    return () => clearTimeout(t);
  }, [message]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.username.trim() || !formData.password.trim()) {
      setMessage({ type: 'error', text: 'Please enter both username and password.' });
      return;
    }
    setIsLoading(true);
    const res = await login(formData.username, formData.password);
    if (res.ok) {
      setMessage({ type: 'success', text: 'Login successful! Redirecting...' });
      router.replace('/dashboard');
    } else {
      setMessage({ type: 'error', text: res.error || 'Login failed. Please try again.' });
    }
    setIsLoading(false);
  };

  if (loading) {
    return (
      <Box
        minH="100vh"
        display="flex"
        alignItems="center"
        justifyContent="center"
        background="linear-gradient(180deg, #0a1022 0%, #0b0f2b 35%, #0d1236 100%)"
      >
        <VStack gap={3}>
          <Heading size="md" color="white">Digital Asset Management System</Heading>
          <Text color="gray.300">Checking session...</Text>
        </VStack>
      </Box>
    );
  }
  if (user) {
    return (
      <Box
        minH="100vh"
        display="flex"
        alignItems="center"
        justifyContent="center"
        background="linear-gradient(180deg, #0a1022 0%, #0b0f2b 35%, #0d1236 100%)"
      >
        <Text color="white">Redirecting to dashboard...</Text>
      </Box>
    );
  }

  return (
    <Box
      minH="100vh"
      position="relative"
      overflow="hidden"
      background="
        radial-gradient(1200px 600px at 10% -10%, rgba(56,189,248,0.18), transparent 60%),
        radial-gradient(800px 500px at 90% 0%, rgba(139,92,246,0.18), transparent 60%),
        linear-gradient(180deg, #0a1022 0%, #0b0f2b 35%, #0d1236 100%)"
    >
      {/* 网格纹理 + 背景光晕 */}
      <Box
        position="absolute"
        inset="0"
        opacity={0.15}
        style={{
          backgroundImage:
            'linear-gradient(rgba(255,255,255,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)',
          backgroundSize: '36px 36px,36px 36px',
        }}
      />
      <Box
        position="absolute"
        top="18%"
        left="10%"
        w="420px"
        h="420px"
        borderRadius="50%"
        background="radial-gradient(closest-side, rgba(59,130,246,0.35), transparent)"
        style={{ filter: 'blur(80px)' }}
      />
      <Box
        position="absolute"
        bottom="10%"
        right="6%"
        w="520px"
        h="520px"
        borderRadius="50%"
        background="radial-gradient(closest-side, rgba(147,51,234,0.35), transparent)"
        style={{ filter: 'blur(90px)' }}
      />

      {/* 登录卡片：粉色玻璃拟态 */}
      <Box
        minH="100vh"
        display="flex"
        alignItems="center"
        justifyContent="center"
        px={4}
        position="relative"
        zIndex={1}
      >
        <Box
          bg={PINK_BG}
          color="gray.900"
          p={8}
          borderRadius="20px"
          width="100%"
          maxW="460px"
          border={`1px solid ${PINK_BORDER}`}
          boxShadow={PINK_SHADOW}
          style={{ backdropFilter: 'blur(10px)' }}
        >
          <VStack gap={6} align="stretch">
            <VStack gap={1}>
              <Heading size="lg" textAlign="center" letterSpacing="0.4px" color="#111827">
                Digital Asset Management
              </Heading>
              <Text color="gray.700" textAlign="center">Sign in to continue</Text>
            </VStack>

            {message && (
              <Box
                bg={message.type === 'error' ? 'rgba(254, 226, 226, 0.90)' : 'rgba(220, 252, 231, 0.90)'}
                color={message.type === 'error' ? '#991b1b' : '#065f46'}
                p={3}
                borderRadius="12px"
                borderWidth="1px"
                borderColor={message.type === 'error' ? '#fecaca' : '#bbf7d0'}
                textAlign="center"
                style={{ backdropFilter: 'blur(6px)' }}
              >
                {message.text}
              </Box>
            )}

            <form onSubmit={handleSubmit}>
              <VStack gap={4} align="stretch">
                <Box>
                  <Text fontWeight="medium" mb={2} color="#111827">Username</Text>
                  <Input
                    name="username"
                    type="text"
                    value={formData.username}
                    onChange={handleChange}
                    placeholder="Enter your username"
                    bg="white"
                  />
                </Box>

                <Box>
                  <Text fontWeight="medium" mb={2} color="#111827">Password</Text>
                  <Input
                    name="password"
                    type={showPwd ? 'text' : 'password'}
                    value={formData.password}
                    onChange={handleChange}
                    placeholder="Enter your password"
                    bg="white"
                  />
                  <HStack justify="flex-end" mt={2}>
                    <Button size="xs" variant="ghost" onClick={() => setShowPwd((s) => !s)}>
                      {showPwd ? 'Hide password' : 'Show password'}
                    </Button>
                  </HStack>
                </Box>

                <NeonButton
                  type="submit"
                  w="100%"
                  loading={isLoading}
                  loadingText="Signing in..."
                >
                  Log In
                </NeonButton>
              </VStack>
            </form>

            <Box mt={2} borderTopWidth="1px" borderColor={PINK_BORDER} pt={3}>
              <Text fontSize="xs" color="gray.700" textAlign="center">
                Test accounts: admin / admin123, editor / editor123, viewer / viewer123
              </Text>
            </Box>
          </VStack>
        </Box>
      </Box>
    </Box>
  );
}
