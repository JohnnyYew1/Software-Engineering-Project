
'use client'
export const dynamic = 'force-dynamic'
// 现有代码保持不变
import { 
  Heading, 
  VStack, 
  Box, 
  Input, 
  Button, 
  Text,
  HStack
} from '@chakra-ui/react'
import { useState, useEffect } from 'react'

export default function ProfilePage() {
  const [mounted, setMounted] = useState(false)
  const [userData, setUserData] = useState({
    name: 'John Doe',
    email: 'john.doe@example.com',
    role: 'Editor'
  })

  const [isEditing, setIsEditing] = useState(false)
  const [editedName, setEditedName] = useState(userData.name)

  useEffect(() => {
    setMounted(true)
  }, [])

  const handleSave = () => {
    setUserData(prev => ({ ...prev, name: editedName }))
    setIsEditing(false)
  }

  const handleCancel = () => {
    setEditedName(userData.name)
    setIsEditing(false)
  }

  if (!mounted) {
    return (
      <VStack align="stretch" gap={6}>
        <Heading>My Profile</Heading>
        <Text>Loading...</Text>
      </VStack>
    )
  }

  return (
    <VStack align="stretch" gap={6}>
      <Heading>My Profile</Heading>

      <Box p={6} borderWidth="1px" borderRadius="lg" bg="white" maxWidth="500px">
        <VStack align="stretch" gap={4}>
          <Box pb={4} borderBottom="1px" borderColor="gray.200">
            <Text fontWeight="bold" fontSize="lg">{userData.name}</Text>
            <Text color="gray.600">{userData.email}</Text>
            <Text 
              color={userData.role === 'Admin' ? 'red.600' : 
                     userData.role === 'Editor' ? 'blue.600' : 'green.600'}
              fontWeight="medium"
              mt={1}
            >
              {userData.role}
            </Text>
          </Box>

          <Box>
            <Text fontWeight="medium" mb={2}>Display Name</Text>
            {isEditing ? (
              <VStack align="stretch" gap={3}>
                <Input
                  value={editedName}
                  onChange={(e) => setEditedName(e.target.value)}
                  placeholder="Enter your name"
                />
                <HStack gap={2}>
                  <Button colorScheme="blue" onClick={handleSave} size="sm">
                    Save
                  </Button>
                  <Button variant="outline" onClick={handleCancel} size="sm">
                    Cancel
                  </Button>
                </HStack>
              </VStack>
            ) : (
              <HStack justify="space-between">
                <Text>{userData.name}</Text>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setIsEditing(true)}
                >
                  Edit
                </Button>
              </HStack>
            )}
          </Box>

          <Box>
            <Text fontWeight="medium" mb={2}>Email</Text>
            <Text color="gray.600">{userData.email}</Text>
          </Box>

          <Box>
            <Text fontWeight="medium" mb={2}>Role</Text>
            <Text color="gray.600">{userData.role}</Text>
          </Box>
        </VStack>
      </Box>
    </VStack>
  )
}
