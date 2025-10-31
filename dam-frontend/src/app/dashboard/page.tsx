
'use client'
export const dynamic = 'force-dynamic'
// 现有代码保持不变
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

export default function Dashboard() {
  const [open, setOpen] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const [mounted, setMounted] = useState(false)

  // 确保只在客户端渲染
  useEffect(() => {
    setMounted(true)
  }, [])

  // 用户统计数据 - 专注于上传和下载
  const userStats = {
    totalUploads: 24,
    totalDownloads: 156,
    recentActivity: 11
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(true)
  }

  const handleDragLeave = () => {
    setDragOver(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    // 这里处理文件上传
    console.log('Files dropped:', e.dataTransfer.files)
    setOpen(true)
  }

  const onOpen = () => setOpen(true)
  const onClose = () => setOpen(false)

  // 在服务器端渲染时返回简单的 HTML
  if (!mounted) {
    return (
      <VStack align="stretch" gap={6}>
        <Box>
          <Heading>Welcome, User</Heading>
          <Text fontSize="xl" color="gray.600">Photo & 3D Model Management</Text>
        </Box>
        <Text>Loading...</Text>
      </VStack>
    )
  }

  return (
    <VStack align="stretch" gap={6}>
      <Box>
        <Heading>Welcome, User</Heading>
        <Text fontSize="xl" color="gray.600">Photo & 3D Model Management</Text>
      </Box>

      {/* 简化的统计卡片 - 只显示上传和下载 */}
      <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} gap={6}>
        {/* 总上传卡片 */}
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

        {/* 总下载卡片 */}
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

        {/* 最近活动卡片 */}
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

      {/* 快捷上传区域 - 专注于照片和3D模型 */}
      <Box 
        border="2px dashed" 
        borderColor={dragOver ? "blue.400" : "gray.300"}
        borderRadius="lg" 
        p={8} 
        textAlign="center"
        bg={dragOver ? "blue.50" : "gray.50"}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        cursor="pointer"
        transition="all 0.2s"
      >
        <VStack gap={4}>
          <Text fontSize="xl" fontWeight="bold">Quick Upload</Text>
          <Text color="gray.600">
            Drag and drop photos or 3D models here
          </Text>
          <Text fontSize="sm" color="gray.500">
            Supports: JPG, PNG, GLB, OBJ, FBX
          </Text>
          <Button colorScheme="blue" onClick={onOpen}>
            Select Files
          </Button>
        </VStack>
      </Box>

      {/* 最近活动预览 */}
      <Box>
        <Heading size="md" mb={4}>Recent Uploads</Heading>
        <VStack align="stretch" gap={3}>
          <HStack justify="space-between" p={3} bg="white" borderRadius="md" borderWidth="1px">
            <Box>
              <Text fontWeight="medium">product_design.glb</Text>
              <Text fontSize="sm" color="gray.500">3D Model • 45.2 MB</Text>
            </Box>
            <Text color="gray.500" fontSize="sm">2 hours ago</Text>
          </HStack>
          <HStack justify="space-between" p={3} bg="white" borderRadius="md" borderWidth="1px">
            <Box>
              <Text fontWeight="medium">architecture_photo.jpg</Text>
              <Text fontSize="sm" color="gray.500">Photo • 8.7 MB</Text>
            </Box>
            <Text color="gray.500" fontSize="sm">1 day ago</Text>
          </HStack>
          <HStack justify="space-between" p={3} bg="white" borderRadius="md" borderWidth="1px">
            <Box>
              <Text fontWeight="medium">character_model.fbx</Text>
              <Text fontSize="sm" color="gray.500">3D Model • 120.5 MB</Text>
            </Box>
            <Text color="gray.500" fontSize="sm">2 days ago</Text>
          </HStack>
        </VStack>
      </Box>

      {/* 上传模态框 */}
      {open && (
        <Box
          position="fixed"
          top="0"
          left="0"
          width="100%"
          height="100%"
          bg="blackAlpha.600"
          display="flex"
          alignItems="center"
          justifyContent="center"
          zIndex="modal"
        >
          <Box
            bg="white"
            p={6}
            borderRadius="lg"
            boxShadow="xl"
            maxWidth="400px"
            width="90%"
          >
            <Heading size="md" mb={4}>Upload Files</Heading>
            <Text mb={4}>Select photos or 3D models to upload</Text>
            <Button colorScheme="blue" onClick={onClose}>
              Close
            </Button>
          </Box>
        </Box>
      )}
    </VStack>
  )
}