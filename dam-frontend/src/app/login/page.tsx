'use client'
import { useState, useEffect } from 'react'
import { 
  Box, 
  Button, 
  Input, 
  VStack, 
  Heading, 
  Text
} from '@chakra-ui/react'
import { useRouter } from 'next/navigation'
import { authService, LoginCredentials } from '@/services/auth'

export default function LoginPage() {
  const [isLoading, setIsLoading] = useState(false)
  const [formData, setFormData] = useState<LoginCredentials>({
    username: '',
    password: ''
  })
  const [message, setMessage] = useState<{type: 'success' | 'error', text: string} | null>(null)
  const router = useRouter()

  useEffect(() => {
    // 如果已经登录，重定向到仪表板
    if (authService.isAuthenticated()) {
      router.push('/dashboard')
    }
  }, [router])

  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => setMessage(null), 5000)
      return () => clearTimeout(timer)
    }
  }, [message])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setMessage(null)

    // 客户端验证
    if (!formData.username.trim() || !formData.password.trim()) {
      setMessage({ 
        type: 'error', 
        text: 'Please enter both username and password.' 
      })
      setIsLoading(false)
      return
    }

    const result = await authService.login(formData)
    
    if (result.success) {
      setMessage({ 
        type: 'success', 
        text: 'Login successful! Redirecting to dashboard...' 
      })
      setTimeout(() => router.push('/dashboard'), 1000)
    } else {
      setMessage({ 
        type: 'error', 
        text: result.error || 'Login failed. Please try again.' 
      })
    }
    
    setIsLoading(false)
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
                  onChange={handleInputChange}
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
                  onChange={handleInputChange}
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
  )
}