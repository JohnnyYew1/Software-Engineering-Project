'use client'

import { Box, Container, VStack, Input, Button, Heading, Text } from '@chakra-ui/react'

export default function LoginPage() {
  return (
    <Container centerContent height="100vh" justifyContent="center">
      <Box p={8} borderWidth={1} borderRadius={8} boxShadow="lg" width="400px">
        <VStack gap={4}>
          {/* Logo - 暂时用文字代替 */}
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