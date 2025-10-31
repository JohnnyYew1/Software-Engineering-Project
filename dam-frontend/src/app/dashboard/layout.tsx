'use client'

import { Box, Flex, VStack, Text, Button } from '@chakra-ui/react'
import { useRouter } from 'next/navigation'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()

  return (
    <Flex height="100vh">
      {/* 侧边栏 - 基于您的设计图 */}
      <Box width="250px" bg="gray.100" p={4}>
        <VStack align="stretch" gap={4}>
          <Text fontSize="xl" fontWeight="bold" mb={6}>DAM System</Text>
          
          <Button 
            variant="ghost" 
            justifyContent="flex-start"
             onClick={() => router.push('/dashboard/assets')}  // 更新为 assets
          >
            Assets
          </Button>
          
          <Button 
            variant="ghost" 
            justifyContent="flex-start"
            onClick={() => router.push('/dashboard/upload')}
          >
            Upload
          </Button>
          
          <Button 
            variant="ghost" 
            justifyContent="flex-start"
            onClick={() => router.push('/dashboard/profile')}
          >
            My Profile
          </Button>
          
          <Button 
            variant="outline" 
            mt="auto"
            onClick={() => router.push('/login')}
          >
            Log Out
          </Button>
        </VStack>
      </Box>

      {/* 主内容区 */}
      <Box flex={1} p={8}>
        {children}
      </Box>
    </Flex>
  )
}