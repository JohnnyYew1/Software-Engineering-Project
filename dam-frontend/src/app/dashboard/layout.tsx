'use client'

export const dynamic = 'force-dynamic'

import { Box, Flex, VStack, Text, Button } from '@chakra-ui/react'
import { useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [mounted, setMounted] = useState(false)
  const router = useRouter()

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return (
      <Flex height="100vh">
        <Box width="250px" bg="gray.100" p={4}>
          <Text>Loading...</Text>
        </Box>
        <Box flex={1} p={8}>
          {children}
        </Box>
      </Flex>
    )
  }

  return (
    <Flex height="100vh">
      <Box width="250px" bg="gray.100" p={4}>
        <VStack align="stretch" gap={4}>
          <Text fontSize="xl" fontWeight="bold" mb={6}>DAM System</Text>
          
          <Button 
            variant="ghost" 
            justifyContent="flex-start"
            onClick={() => router.push('/dashboard')}
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

      <Box flex={1} p={8}>
        {children}
      </Box>
    </Flex>
  )
}