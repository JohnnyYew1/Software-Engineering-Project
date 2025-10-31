'use client'
import { useState, useEffect } from 'react'
import { 
  Box, 
  VStack, 
  HStack, 
  Text, 
  Button
} from '@chakra-ui/react'
import { useRouter, usePathname } from 'next/navigation'
import { authService } from '@/services/auth'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [currentUser, setCurrentUser] = useState<any>(null)
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    const user = authService.getCurrentUser()
    setCurrentUser(user)
    
    // 如果未登录，重定向到登录页
    if (!user) {
      router.push('/login')
    }
  }, [router])

  const handleLogout = async () => {
    await authService.logout()
  }

  // 根据用户角色生成菜单项
  const getMenuItems = () => {
    const baseItems = [
      { name: 'Dashboard', path: '/dashboard', roles: ['admin', 'editor', 'viewer'] },
      { name: 'Assets', path: '/dashboard/assets', roles: ['admin', 'editor', 'viewer'] },
      { name: 'My Profile', path: '/dashboard/profile', roles: ['admin', 'editor', 'viewer'] },
    ]

    // 只有 Editor 角色可以看到 Upload
    if (currentUser?.role === 'editor') {
      baseItems.splice(2, 0, { name: 'Upload', path: '/dashboard/upload', roles: ['editor'] })
    }

    // 只有 Admin 角色可以看到 User Management
    if (currentUser?.role === 'admin') {
      baseItems.splice(1, 0, { name: 'User Management', path: '/dashboard/users', roles: ['admin'] })
    }

    return baseItems.filter(item => item.roles.includes(currentUser?.role))
  }

  // 获取角色描述
  const getRoleDescription = () => {
    switch (currentUser?.role) {
      case 'admin':
        return 'System Administrator - Manage users and all assets'
      case 'editor':
        return 'Content Editor - Upload and manage your own assets'
      case 'viewer':
        return 'Viewer - Browse and download assets'
      default:
        return ''
    }
  }

  if (!currentUser) {
    return (
      <Box minH="100vh" display="flex" alignItems="center" justifyContent="center">
        <Text>Redirecting to login...</Text>
      </Box>
    )
  }

  return (
    <Box minH="100vh" bg="gray.50">
      <HStack align="start" gap={0}>
        {/* 侧边栏 */}
        <Box 
          w="250px" 
          bg="white" 
          minH="100vh" 
          p={4} 
          boxShadow="md"
        >
          <VStack align="stretch" gap={6}>
            <Text fontSize="xl" fontWeight="bold" mb={4}>
              DAM System
            </Text>
            
            <Box>
              <Text fontSize="sm" color="gray.600" mb={1}>
                Welcome, {currentUser?.first_name || currentUser?.username}
              </Text>
              <Text 
                fontSize="xs" 
                color={
                  currentUser?.role === 'admin' ? 'red.500' : 
                  currentUser?.role === 'editor' ? 'blue.500' : 'green.500'
                }
                fontWeight="bold"
                mb={1}
              >
                Role: {currentUser?.role?.toUpperCase()}
              </Text>
              <Text fontSize="xs" color="gray.500">
                {getRoleDescription()}
              </Text>
            </Box>

            <VStack align="stretch" gap={2}>
              {getMenuItems().map((item) => (
                <Button
                  key={item.path}
                  variant={pathname === item.path ? 'solid' : 'ghost'}
                  colorScheme={pathname === item.path ? 'blue' : 'gray'}
                  justifyContent="start"
                  onClick={() => router.push(item.path)}
                  size="sm"
                >
                  {item.name}
                </Button>
              ))}
              
              <Button
                variant="ghost"
                colorScheme="red"
                justifyContent="start"
                onClick={handleLogout}
                mt={4}
                size="sm"
              >
                Log Out
              </Button>
            </VStack>
          </VStack>
        </Box>

        {/* 主内容区域 */}
        <Box flex={1} p={6}>
          {children}
        </Box>
      </HStack>
    </Box>
  )
}