'use client'
import { 
  Heading, 
  Text, 
  SimpleGrid, 
  Button, 
  VStack, 
  Box, 
  HStack
} from '@chakra-ui/react'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { permissions } from '@/utils/permissions'

export default function Dashboard() {
  const [currentUser, setCurrentUser] = useState<any>(null)
  const router = useRouter()

  useEffect(() => {
    const user = permissions.getCurrentUser()
    setCurrentUser(user)
  }, [])

  // 定义统计数据的类型
  type Stats = {
    totalAssets: number;
    totalDownloads: number;
    recentActivity: number;
    totalUsers?: number; // 可选属性
  }

  // 用户统计数据 - 根据角色显示不同数据
  const getStats = (): Stats => {
    const baseStats: Stats = {
      totalAssets: 156,
      totalDownloads: 1247,
      recentActivity: 23
    }

    // 只有 Admin 可以看到用户统计
    if (currentUser?.role === 'admin') {
      return {
        ...baseStats,
        totalUsers: 8
      }
    }

    return baseStats
  }

  const stats = getStats()

  // 获取角色特定的欢迎信息
  const getWelcomeMessage = () => {
    switch (currentUser?.role) {
      case 'admin':
        return 'System Overview - Manage users and monitor system activity'
      case 'editor':
        return 'Content Management - Upload and manage your digital assets'
      case 'viewer':
        return 'Asset Library - Browse and download available assets'
      default:
        return 'Overview of your digital assets'
    }
  }

  if (!currentUser) {
    return (
      <VStack align="stretch" gap={6}>
        <Heading>Dashboard</Heading>
        <Text>Loading...</Text>
      </VStack>
    )
  }

  return (
    <VStack align="stretch" gap={6}>
      <Box>
        <Heading>Dashboard</Heading>
        <Text fontSize="xl" color="gray.600">{getWelcomeMessage()}</Text>
        <Text fontSize="sm" color="gray.500" mt={1}>
          Welcome back, {currentUser?.first_name || currentUser?.username}! 
          You are logged in as <Text as="span" fontWeight="bold" color={
            currentUser?.role === 'admin' ? 'red.500' : 
            currentUser?.role === 'editor' ? 'blue.500' : 'green.500'
          }>{currentUser?.role?.toUpperCase()}</Text>
        </Text>
      </Box>

      {/* 统计卡片 */}
      <SimpleGrid columns={{ base: 1, md: currentUser?.role === 'admin' ? 4 : 3 }} gap={6}>
        <Box 
          borderWidth="1px" 
          borderRadius="lg" 
          p={6} 
          bg="white"
          boxShadow="md"
        >
          <Text fontSize="sm" color="gray.600">Total Assets</Text>
          <Text fontSize="3xl" fontWeight="bold">{stats.totalAssets}</Text>
          <Text fontSize="xs" color="gray.500">Photos, 3D Models & Videos</Text>
        </Box>

        <Box 
          borderWidth="1px" 
          borderRadius="lg" 
          p={6} 
          bg="white"
          boxShadow="md"
        >
          <Text fontSize="sm" color="gray.600">Total Downloads</Text>
          <Text fontSize="3xl" fontWeight="bold">{stats.totalDownloads}</Text>
          <Text fontSize="xs" color="gray.500">All time downloads</Text>
        </Box>

        <Box 
          borderWidth="1px" 
          borderRadius="lg" 
          p={6} 
          bg="white"
          boxShadow="md"
        >
          <Text fontSize="sm" color="gray.600">Recent Activity</Text>
          <Text fontSize="3xl" fontWeight="bold">{stats.recentActivity}</Text>
          <Text fontSize="xs" color="gray.500">Last 30 days</Text>
        </Box>

        {/* 只有 Admin 可以看到用户统计 */}
        {currentUser?.role === 'admin' && stats.totalUsers !== undefined && (
          <Box 
            borderWidth="1px" 
            borderRadius="lg" 
            p={6} 
            bg="white"
            boxShadow="md"
          >
            <Text fontSize="sm" color="gray.600">Total Users</Text>
            <Text fontSize="3xl" fontWeight="bold">{stats.totalUsers}</Text>
            <Text fontSize="xs" color="gray.500">System users</Text>
          </Box>
        )}
      </SimpleGrid>

      {/* 快捷操作区域 - 根据角色显示不同操作 */}
      <SimpleGrid columns={{ base: 1, md: currentUser?.role === 'admin' ? 3 : 2 }} gap={6}>
        {/* 所有用户都可以看到资产浏览 */}
        <Box 
          borderWidth="1px" 
          borderRadius="lg" 
          p={6} 
          bg="white"
          boxShadow="md"
        >
          <Heading size="md" mb={4}>Browse Assets</Heading>
          <Text color="gray.600" mb={4}>
            Explore all available digital assets in the system
          </Text>
          <Button 
            variant="outline"
            onClick={() => router.push('/dashboard/assets')}
            width="full"
          >
            View All Assets
          </Button>
        </Box>

        {/* 只有 Editor 可以看到上传快捷方式 */}
        {currentUser?.role === 'editor' && (
          <Box 
            borderWidth="1px" 
            borderRadius="lg" 
            p={6} 
            bg="white"
            boxShadow="md"
          >
            <Heading size="md" mb={4}>Upload Assets</Heading>
            <Text color="gray.600" mb={4}>
              Upload new photos, 3D models, or videos to the system
            </Text>
            <Button 
              colorScheme="blue" 
              onClick={() => router.push('/dashboard/upload')}
              width="full"
            >
              Upload New Asset
            </Button>
          </Box>
        )}

        {/* 只有 Admin 可以看到用户管理 */}
        {currentUser?.role === 'admin' && (
          <Box 
            borderWidth="1px" 
            borderRadius="lg" 
            p={6} 
            bg="white"
            boxShadow="md"
          >
            <Heading size="md" mb={4}>User Management</Heading>
            <Text color="gray.600" mb={4}>
              Manage system users, roles, and permissions
            </Text>
            <Button 
              colorScheme="green"
              onClick={() => router.push('/dashboard/users')}
              width="full"
            >
              Manage Users
            </Button>
          </Box>
        )}

        {/* Viewer 用户的额外引导 */}
        {currentUser?.role === 'viewer' && (
          <Box 
            borderWidth="1px" 
            borderRadius="lg" 
            p={6} 
            bg="white"
            boxShadow="md"
          >
            <Heading size="md" mb={4}>Get Started</Heading>
            <Text color="gray.600" mb={4}>
              Browse our collection of digital assets and download what you need
            </Text>
            <Button 
              colorScheme="blue"
              onClick={() => router.push('/dashboard/assets')}
              width="full"
            >
              Explore Assets
            </Button>
          </Box>
        )}
      </SimpleGrid>

      {/* 最近活动预览 */}
      <Box 
        borderWidth="1px" 
        borderRadius="lg" 
        p={6} 
        bg="white"
        boxShadow="md"
      >
        <Heading size="md" mb={4}>Recent Activity</Heading>
        <VStack align="stretch" gap={3}>
          <HStack justify="space-between" p={3} bg="gray.50" borderRadius="md">
            <Box>
              <Text fontWeight="medium">New asset uploaded: product_design.glb</Text>
              <Text fontSize="sm" color="gray.500">3D Model • 45.2 MB • By editor1</Text>
            </Box>
            <Text color="gray.500" fontSize="sm">2 hours ago</Text>
          </HStack>
          <HStack justify="space-between" p={3} bg="gray.50" borderRadius="md">
            <Box>
              <Text fontWeight="medium">Asset downloaded: architecture_photo.jpg</Text>
              <Text fontSize="sm" color="gray.500">Photo • 8.7 MB • By viewer2</Text>
            </Box>
            <Text color="gray.500" fontSize="sm">1 day ago</Text>
          </HStack>
          {/* 只有 Admin 可以看到用户管理活动 */}
          {currentUser?.role === 'admin' && (
            <HStack justify="space-between" p={3} bg="gray.50" borderRadius="md">
              <Box>
                <Text fontWeight="medium">User role updated: editor3 → viewer</Text>
                <Text fontSize="sm" color="gray.500">System Administration • By admin</Text>
              </Box>
              <Text color="gray.500" fontSize="sm">2 days ago</Text>
            </HStack>
          )}
          <HStack justify="space-between" p={3} bg="gray.50" borderRadius="md">
            <Box>
              <Text fontWeight="medium">New asset uploaded: character_model.fbx</Text>
              <Text fontSize="sm" color="gray.500">3D Model • 120.5 MB • By editor2</Text>
            </Box>
            <Text color="gray.500" fontSize="sm">2 days ago</Text>
          </HStack>
        </VStack>
      </Box>
    </VStack>
  )
}