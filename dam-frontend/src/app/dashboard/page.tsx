'use client'

import { Heading, Text, SimpleGrid, Button, VStack, Box } from '@chakra-ui/react'

export default function Dashboard() {
  return (
    <VStack align="stretch" gap={6}>
      <Heading>Welcome, User</Heading>
      <Text fontSize="xl">Dashboard</Text>

      <SimpleGrid columns={2} gap={6}>
        {/* 使用 Box 替代 Card */}
        <Box 
          borderWidth="1px" 
          borderRadius="lg" 
          p={6} 
          bg="white"
          boxShadow="md"
        >
          <Text fontSize="2xl" fontWeight="bold">Total Assets</Text>
          <Text fontSize="4xl">11</Text>
        </Box>
        
        <Box 
          borderWidth="1px" 
          borderRadius="lg" 
          p={6} 
          bg="white"
          boxShadow="md"
        >
          <Text fontSize="2xl" fontWeight="bold">Recent Uploads</Text>
          <Text fontSize="4xl">11</Text>
        </Box>
      </SimpleGrid>

      <Button colorScheme="blue" size="lg" width="200px">
        Upload
      </Button>
    </VStack>
  )
}