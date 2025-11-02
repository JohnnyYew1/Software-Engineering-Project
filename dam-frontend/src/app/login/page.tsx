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

export default function LoginPage() {
  const router = useRouter();
  const { user, loading, login } = useAuth();

  const [isLoading, setIsLoading] = useState(false);
  const [showPwd, setShowPwd] = useState(false);
  const [formData, setFormData] = useState({ username: '', password: '' });
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // 登录后跳转（等 loading 结束，避免抖动）
  useEffect(() => {
    if (!loading && user) {
      router.replace('/dashboard');
    }
  }, [loading, user, router]);

  useEffect(() => {
    if (message) {
      const t = setTimeout(() => setMessage(null), 4500);
      return () => clearTimeout(t);
    }
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

    // 不传模式参数，沿用你 AuthContext 内部默认（session / jwt 都可）
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
        bg={{ base: 'gray.50', _dark: 'gray.900' }}
      >
        <VStack gap={3}>
          <Heading size="md">Digital Asset Management System</Heading>
          <Text color={{ base: 'gray.600', _dark: 'gray.300' }}>Checking session...</Text>
        </VStack>
      </Box>
    );
  }

  if (user) {
    return (
      <Box minH="100vh" display="flex" alignItems="center" justifyContent="center">
        <Text>Redirecting to dashboard...</Text>
      </Box>
    );
  }

  return (
    <Box
      minH="100vh"
      display="flex"
      alignItems="center"
      justifyContent="center"
      px={4}
      bg={{ base: 'gray.50', _dark: 'gray.900' }}
    >
      <Box
        bg={{ base: 'white', _dark: 'gray.800' }}
        color={{ base: 'gray.900', _dark: 'white' }}
        p={8}
        borderRadius="2xl"
        boxShadow="xl"
        width="100%"
        maxW="420px"
        borderWidth="1px"
        borderColor={{ base: 'gray.200', _dark: 'whiteAlpha.200' }}
      >
        <VStack gap={6} align="stretch">
          <VStack gap={1}>
            <Heading size="lg" textAlign="center" letterSpacing="0.4px">
              Digital Asset Management
            </Heading>
            <Text color={{ base: 'gray.600', _dark: 'gray.300' }} textAlign="center">
              Sign in to continue
            </Text>
          </VStack>

        {message && (
  <Box
    // v3：不要用 sx
    bg={message.type === 'error' ? 'red.50' : 'green.50'}
    color={message.type === 'error' ? 'red.800' : 'green.800'}
    p={3}
    borderRadius="md"
    borderWidth="1px"
    borderColor={message.type === 'error' ? 'red.200' : 'green.200'}
    width="100%"
    textAlign="center"
  >
    {message.text}
  </Box>
)}


          <form onSubmit={handleSubmit}>
            <VStack gap={4} align="stretch">
              <Box>
                <Text fontWeight="medium" mb={2}>
                  Username
                </Text>
                <Input
                  name="username"
                  type="text"
                  value={formData.username}
                  onChange={handleChange}
                  placeholder="Enter your username"
                  bg={{ base: 'white', _dark: 'gray.700' }}
                  color={{ base: 'gray.900', _dark: 'white' }}   // 输入文字可见
                  _placeholder={{ color: { base: 'gray.500', _dark: 'whiteAlpha.600' } }}
                  borderColor={{ base: 'gray.300', _dark: 'whiteAlpha.300' }}
                  _hover={{ borderColor: { base: 'gray.400', _dark: 'whiteAlpha.400' } }}
                  _focus={{
                    borderColor: 'blue.500',
                    boxShadow: '0 0 0 1px var(--chakra-colors-blue-500)',
                  }}
                />
              </Box>

              <Box>
                <Text fontWeight="medium" mb={2}>
                  Password
                </Text>
                <Input
                  name="password"
                  type={showPwd ? 'text' : 'password'}
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="Enter your password"
                  bg={{ base: 'white', _dark: 'gray.700' }}
                  color={{ base: 'gray.900', _dark: 'white' }}   // 输入文字可见
                  _placeholder={{ color: { base: 'gray.500', _dark: 'whiteAlpha.600' } }}
                  borderColor={{ base: 'gray.300', _dark: 'whiteAlpha.300' }}
                  _hover={{ borderColor: { base: 'gray.400', _dark: 'whiteAlpha.400' } }}
                  _focus={{
                    borderColor: 'blue.500',
                    boxShadow: '0 0 0 1px var(--chakra-colors-blue-500)',
                  }}
                />
                <HStack justify="flex-end" mt={2}>
                  <Button
                    size="xs"
                    variant="ghost"
                    onClick={() => setShowPwd((s) => !s)}
                  >
                    {showPwd ? 'Hide password' : 'Show password'}
                  </Button>
                </HStack>
              </Box>

              <Button
                type="submit"
                colorScheme="blue"
                w="100%"
                loading={isLoading}
                loadingText="Signing in..."
              >
                Log In
              </Button>
            </VStack>
          </form>

          <Box mt={2} borderTopWidth="1px" borderColor={{ base: 'gray.200', _dark: 'whiteAlpha.200' }} pt={3}>
            <Text fontSize="xs" color={{ base: 'gray.500', _dark: 'gray.400' }} textAlign="center">
              Test accounts: admin / admin123, editor / editor123, viewer / viewer123
            </Text>
          </Box>
        </VStack>
      </Box>
    </Box>
  );
}
