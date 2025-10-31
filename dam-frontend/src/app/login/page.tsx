'use client'

export const dynamic = 'force-dynamic'

import { Box, Container, VStack, Input, Button, Heading, Text } from '@chakra-ui/react'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { authService, type LoginData } from '@/services/auth'

export default function LoginPage() {
  const [mounted, setMounted] = useState(false)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{type: 'success' | 'error', text: string} | null>(null)
  const [credentials, setCredentials] = useState<LoginData>({
    username: '',
    password: '',
  })
  
  const router = useRouter()

  useEffect(() => {
    setMounted(true)
    // 如果用户已登录，重定向到仪表板
    if (authService.isAuthenticated()) {
      router.push('/dashboard')
    }
  }, [router])

  // 自动清除消息
  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => setMessage(null), 5000)
      return () => clearTimeout(timer)
    }
  }, [message])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage(null)

    try {
      await authService.login(credentials)
      setMessage({
        type: 'success',
        text: '登录成功！正在跳转...'
      })
      setTimeout(() => {
        router.push('/dashboard')
      }, 1000)
    } catch (error) {
      setMessage({
        type: 'error',
        text: '登录失败，请检查用户名和密码'
      })
    } finally {
      setLoading(false)
    }
  }

  if (!mounted) {
    return (
      <Container centerContent height="100vh" justifyContent="center">
        <Box p={8} borderWidth={1} borderRadius={8} boxShadow="lg" width="400px">
          <Text>Loading...</Text>
        </Box>
      </Container>
    )
  }

  return (
    <Container centerContent height="100vh" justifyContent="center">
      <Box p={8} borderWidth={1} borderRadius={8} boxShadow="lg" width="400px">
        <form onSubmit={handleLogin}>
          <VStack gap={4}>
            <Heading size="lg" mb={6}>DAM System</Heading>
            
            {/* 消息显示 */}
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
            
            <Input 
              placeholder="Username" 
              size="lg"
              value={credentials.username}
              onChange={(e) => setCredentials({...credentials, username: e.target.value})}
              required
            />
            <Input 
              type="password" 
              placeholder="Password" 
              size="lg"
              value={credentials.password}
              onChange={(e) => setCredentials({...credentials, password: e.target.value})}
              required
            />
            
            <Button 
              colorScheme="blue" 
              width="100%" 
              size="lg"
              type="submit"
              loading={loading}
              loadingText="Logging in..."
            >
              Login
            </Button>
            
            <Text fontSize="sm" color="gray.600">
              Enter your credentials to access the system
            </Text>
          </VStack>
        </form>
      </Box>
    </Container>
  )
}