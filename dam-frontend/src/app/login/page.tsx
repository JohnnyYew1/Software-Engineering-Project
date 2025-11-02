'use client';

import { useEffect, useState } from 'react';
import {
  Box,
  VStack,
  Heading,
  Text,
  Input,
  Button,
} from '@chakra-ui/react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

export default function LoginPage() {
  const router = useRouter();
  const { user, loading, login } = useAuth();

  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({ username: '', password: '' });
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // 只有在 loading 结束后，再根据 user 决定是否跳去 dashboard
  useEffect(() => {
    if (!loading && user) {
      router.replace('/dashboard');
    }
  }, [loading, user, router]);

  useEffect(() => {
    if (message) {
      const t = setTimeout(() => setMessage(null), 5000);
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

    // ✅ 统一 JWT：不要再传 'session' 第三个参数
    const res = await login(formData.username, formData.password);

    if (res.ok) {
      setMessage({ type: 'success', text: 'Login successful! Redirecting...' });
      // 直接跳转，避免等待异步状态传播产生竞态
      router.replace('/dashboard');
    } else {
      setMessage({ type: 'error', text: res.error || 'Login failed. Please try again.' });
    }
    setIsLoading(false);
  };

  if (loading) {
    return (
      <Box minH="100vh" display="flex" alignItems="center" justifyContent="center">
        <VStack gap={3}>
          <Heading size="md">Digital Asset Management System</Heading>
          <Text color="gray.600">Checking session...</Text>
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
    <Box minH="100vh" display="flex" alignItems="center" justifyContent="center" bg="gray.50">
      <Box
        bg="white"
        p={8}
        borderRadius="lg"
        boxShadow="lg"
        width="100%"
        maxWidth="400px"
      >
        <VStack gap={6}>
          <Heading size="lg" textAlign="center">
            Digital Asset Management System
          </Heading>
          <Text color="gray.600" textAlign="center">
            Please log in to your account
          </Text>

          {message && (
            <Box
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

          <form onSubmit={handleSubmit} style={{ width: '100%' }}>
            <VStack gap={4}>
              <Box width="100%">
                <Text fontWeight="medium" mb={2}>Username</Text>
                <Input
                  type="text"
                  name="username"
                  value={formData.username}
                  onChange={handleChange}
                  placeholder="Enter your username"
                  required
                />
              </Box>

              <Box width="100%">
                <Text fontWeight="medium" mb={2}>Password</Text>
                <Input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="Enter your password"
                  required
                />
              </Box>

              <Button
                type="submit"
                colorScheme="blue"
                width="100%"
                loading={isLoading}
                loadingText="Logging in..."
              >
                Log In
              </Button>
            </VStack>
          </form>

          <Text fontSize="sm" color="gray.500" textAlign="center">
            Test accounts: admin / admin123, editor / editor123, viewer / viewer123
          </Text>
        </VStack>
      </Box>
    </Box>
  );
}
