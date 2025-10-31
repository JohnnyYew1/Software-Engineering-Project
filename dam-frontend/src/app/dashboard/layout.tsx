'use client'

export const dynamic = 'force-dynamic'

import { Box, Flex, VStack, Text, Button } from '@chakra-ui/react'
import { useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'

interface SafeUser {
  username: string;
  role: string;
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [mounted, setMounted] = useState(false)
  const [user, setUser] = useState<SafeUser | null>(null)
  const router = useRouter()

  useEffect(() => {
    setMounted(true)
    // 安全地获取用户信息
    try {
      if (typeof window !== 'undefined') {
        const userStr = localStorage.getItem('user')
        if (userStr) {
          const userData = JSON.parse(userStr)
          setUser({
            username: userData.username || 'User',
            role: userData.role || 'viewer'
          })
        }
      }
    } catch (error) {
      console.error('Failed to get user data:', error)
    }
  }, [])

  const handleLogout = () => {
    // 安全地清除存储并重定向
    if (typeof window !== 'undefined') {
      localStorage.removeItem('auth_token')
      localStorage.removeItem('user')
      window.location.href = '/login'
    }
  }

  if (!mounted) {
    return (
      <div style={{ display: 'flex', height: '100vh' }}>
        <div style={{ width: '250px', backgroundColor: '#f7fafc', padding: '16px' }}>
          <div>Loading...</div>
        </div>
        <div style={{ flex: 1, padding: '32px' }}>
          {children}
        </div>
      </div>
    )
  }

  return (
    <Flex height="100vh">
      <Box width="250px" bg="gray.100" p={4}>
        <VStack align="stretch" gap={4}>
          <Text fontSize="xl" fontWeight="bold" mb={6}>DAM System</Text>
          
          {user && (
            <Text fontSize="sm" color="gray.600" mb={2}>
              Welcome, {user.username}
            </Text>
          )}
          
          {/* Dashboard 链接 */}
          <Button 
            variant="ghost" 
            justifyContent="flex-start"
            onClick={() => router.push('/dashboard')}
          >
            Dashboard
          </Button>
          
          {/* Assets 链接 */}
          <Button 
            variant="ghost" 
            justifyContent="flex-start"
            onClick={() => router.push('/dashboard/assets')}
          >
            Assets
          </Button>
          
          {/* Upload 链接 */}
          <Button 
            variant="ghost" 
            justifyContent="flex-start"
            onClick={() => router.push('/dashboard/upload')}
          >
            Upload
          </Button>
          
          {/* My Profile 链接 */}
          <Button 
            variant="ghost" 
            justifyContent="flex-start"
            onClick={() => router.push('/dashboard/profile')}
          >
            My Profile
          </Button>
          
          {/* Log Out 按钮 */}
          <Button 
            variant="outline" 
            mt="auto"
            onClick={handleLogout}
          >
            Log Out
          </Button>
        </VStack>
      </Box>

      <Box flex={1} p={8}>
        {children}
      </Box>
    </Flex>
  )
}