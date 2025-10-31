'use client'

export const dynamic = 'force-dynamic'

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

export default function Dashboard() {
  const [mounted, setMounted] = useState(false)
  const router = useRouter()

  useEffect(() => {
    setMounted(true)
  }, [])

  // 用户统计数据
  const userStats = {
    totalUploads: 24,
    totalDownloads: 156,
    recentActivity: 11
  }

  if (!mounted) {
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
        <Text fontSize="xl" color="gray.600">Overview of your digital assets</Text>
      </Box>

      {/* 统计卡片 */}
      <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} gap={6}>
        <Box 
          borderWidth="1px" 
          borderRadius="lg" 
          p={6} 
          bg="white"
          boxShadow="md"
        >
          <Text fontSize="sm" color="gray.600">Total Uploads</Text>
          <Text fontSize="3xl" fontWeight="bold">{userStats.totalUploads}</Text>
          <Text fontSize="xs" color="gray.500">Photos & 3D Models</Text>
        </Box>

        <Box 
          borderWidth="1px" 
          borderRadius="lg" 
          p={6} 
          bg="white"
          boxShadow="md"
        >
          <Text fontSize="sm" color="gray.600">Total Downloads</Text>
          <Text fontSize="3xl" fontWeight="bold">{userStats.totalDownloads}</Text>
          <Text fontSize="xs" color="gray.500">All time</Text>
        </Box>

        <Box 
          borderWidth="1px" 
          borderRadius="lg" 
          p={6} 
          bg="white"
          boxShadow="md"
        >
          <Text fontSize="sm" color="gray.600">Recent Activity</Text>
          <Text fontSize="3xl" fontWeight="bold">{userStats.recentActivity}</Text>
          <Text fontSize="xs" color="gray.500">Last 30 days</Text>
        </Box>
      </SimpleGrid>

      {/* 快捷操作区域 */}
      <Box 
        borderWidth="1px" 
        borderRadius="lg" 
        p={6} 
        bg="white"
        boxShadow="md"
      >
        <Heading size="md" mb={4}>Quick Actions</Heading>
        <HStack gap={4}>
          <Button 
            colorScheme="blue" 
            onClick={() => router.push('/dashboard/upload')}
          >
            Upload New Asset
          </Button>
          <Button 
            variant="outline"
            onClick={() => router.push('/dashboard/assets')}
          >
            View All Assets
          </Button>
        </HStack>
      </Box>

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
              <Text fontWeight="medium">product_design.glb</Text>
              <Text fontSize="sm" color="gray.500">3D Model • 45.2 MB</Text>
            </Box>
            <Text color="gray.500" fontSize="sm">2 hours ago</Text>
          </HStack>
          <HStack justify="space-between" p={3} bg="gray.50" borderRadius="md">
            <Box>
              <Text fontWeight="medium">architecture_photo.jpg</Text>
              <Text fontSize="sm" color="gray.500">Photo • 8.7 MB</Text>
            </Box>
            <Text color="gray.500" fontSize="sm">1 day ago</Text>
          </HStack>
          <HStack justify="space-between" p={3} bg="gray.50" borderRadius="md">
            <Box>
              <Text fontWeight="medium">character_model.fbx</Text>
              <Text fontSize="sm" color="gray.500">3D Model • 120.5 MB</Text>
            </Box>
            <Text color="gray.500" fontSize="sm">2 days ago</Text>
          </HStack>
        </VStack>
      </Box>
    </VStack>
  )
}