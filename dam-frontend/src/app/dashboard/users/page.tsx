'use client'
import { Box, VStack, Heading, Button, HStack, Badge, Text } from '@chakra-ui/react'
import { useState, useEffect } from 'react'
import { permissions } from '@/utils/permissions'

// 模拟用户数据
const mockUsers = [
  { id: 1, username: 'admin',  role: 'admin',  date_joined: '2024-01-01' },
  { id: 2, username: 'editor1', role: 'editor', date_joined: '2024-01-02' },
  { id: 3, username: 'viewer1', role: 'viewer', date_joined: '2024-01-03' },
]

export default function UsersPage() {
  const [users, setUsers] = useState<any[]>([])

  useEffect(() => { if (permissions.canManageUsers()) setUsers(mockUsers) }, [])

  if (!permissions.canManageUsers()) {
    return (
      <VStack align="stretch" gap={6}>
        <Heading color="white">User Management</Heading>
        <Box bg="rgba(255,255,255,0.08)" color="white" p={4} borderRadius="md" border="1px solid rgba(255,255,255,0.18)">
          <Text fontWeight="bold" mb={2}>Access Denied</Text>
          <Text>Only Admin role can access user management.</Text>
        </Box>
      </VStack>
    )
  }

  const roleColor = (role: string) => role === 'admin' ? 'red' : role === 'editor' ? 'blue' : 'green';

  return (
    <VStack align="stretch" gap={6}>
      <Heading color="white">User Management</Heading>

      <Box bg="white" border="1px solid #E2E8F0" borderRadius="2xl" boxShadow="0 10px 30px rgba(0,0,0,0.10)" overflow="hidden">
        {/* 表头 */}
        <Box display="grid" gridTemplateColumns="1fr 1fr 1fr 1fr" bg="#0b0f2b" color="#E2E8F0" p={4} fontWeight="bold">
          <Box>Username</Box><Box>Role</Box><Box>Date Joined</Box><Box>Actions</Box>
        </Box>

        {/* 内容 */}
        {users.map(u => (
          <Box key={u.id} display="grid" gridTemplateColumns="1fr 1fr 1fr 1fr"
               p={4} borderTop="1px solid #E2E8F0" alignItems="center">
            <Box fontWeight="medium">{u.username}</Box>
            <Box><Badge colorScheme={roleColor(u.role)}>{u.role.toUpperCase()}</Badge></Box>
            <Box>{new Date(u.date_joined).toLocaleDateString()}</Box>
            <HStack>
              <Button size="sm" variant="outline">Edit Role</Button>
              <Button size="sm" colorScheme="red">Delete</Button>
            </HStack>
          </Box>
        ))}

        {users.length === 0 && (
          <Box textAlign="center" py={10}><Text color="gray.500">No users found.</Text></Box>
        )}
      </Box>

      <Button alignSelf="start"
              borderRadius="md" position="relative"
              _before={{
                content:'""', position:'absolute', inset:0, borderRadius:'inherit', padding:'1px',
                background:'linear-gradient(90deg,#60a5fa,#a78bfa)',
                WebkitMask:'linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)',
                WebkitMaskComposite:'xor', maskComposite:'exclude', pointerEvents:'none'
              }}
              color="white" bg="linear-gradient(90deg,#3b82f6,#8b5cf6)">
        Add New User
      </Button>
    </VStack>
  )
}
