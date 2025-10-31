'use client'

export const dynamic = 'force-dynamic'

import { Box, Container, VStack, Input, Button, Heading, Text } from '@chakra-ui/react'
import { useState, useEffect } from 'react'

export default function LoginPage() {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

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
        <VStack gap={4}>
          <Heading size="lg" mb={6}>DAM System</Heading>
          
          <Input 
            placeholder="Username" 
            size="lg"
          />
          <Input 
            type="password" 
            placeholder="Password" 
            size="lg"
          />
          
          <Button colorScheme="blue" width="100%" size="lg">
            Login
          </Button>
          
          <Text fontSize="sm" color="gray.600">
            Enter your credentials to access the system
          </Text>
        </VStack>
      </Box>
    </Container>
  )
}