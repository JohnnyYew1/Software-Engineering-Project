'use client'
import { 
  Box, 
  VStack, 
  Heading, 
  Button, 
  HStack,
  Badge,
  Text
} from '@chakra-ui/react'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { permissions } from '@/utils/permissions'

// 模拟用户数据 - 稍后替换为真实API
const mockUsers = [
  { id: 1, username: 'admin', role: 'admin', date_joined: '2024-01-01' },
  { id: 2, username: 'editor1', role: 'editor', date_joined: '2024-01-02' },
  { id: 3, username: 'viewer1', role: 'viewer', date_joined: '2024-01-03' },
]

export default function UsersPage() {
  const [users, setUsers] = useState<any[]>([])
  const router = useRouter()

  useEffect(() => {
    // 权限检查
    if (!permissions.canManageUsers()) {
      return
    }
    // 稍后替换为从API获取真实数据
    setUsers(mockUsers)
  }, [])

  // 如果用户没有管理权限，显示错误信息
  if (!permissions.canManageUsers()) {
    return (
      <VStack align="stretch" gap={6}>
        <Heading>User Management</Heading>
        <Box 
          bg="red.50" 
          color="red.800"
          p={4} 
          borderRadius="md" 
          borderWidth="1px"
          borderColor="red.200"
          textAlign="center"
        >
          <Text fontWeight="bold" mb={2}>Access Denied</Text>
          <Text>
            You do not have permission to manage users. Only Admin role can access user management.
          </Text>
        </Box>
      </VStack>
    )
  }

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin': return 'red'
      case 'editor': return 'blue'
      case 'viewer': return 'green'
      default: return 'gray'
    }
  }

  return (
    <VStack align="stretch" gap={6}>
      <Heading>User Management</Heading>
      
      {/* 使用 div 和样式模拟表格 */}
      <Box bg="white" borderRadius="lg" boxShadow="sm" overflow="hidden">
        {/* 表头 */}
        <Box 
          display="grid" 
          gridTemplateColumns="1fr 1fr 1fr 1fr" 
          bg="gray.50" 
          p={4}
          fontWeight="bold"
          borderBottom="1px solid"
          borderColor="gray.200"
        >
          <Box>Username</Box>
          <Box>Role</Box>
          <Box>Date Joined</Box>
          <Box>Actions</Box>
        </Box>
        
        {/* 表格内容 */}
        {users.map((user) => (
          <Box 
            key={user.id}
            display="grid" 
            gridTemplateColumns="1fr 1fr 1fr 1fr" 
            p={4}
            borderBottom="1px solid"
            borderColor="gray.100"
            _last={{ borderBottom: 'none' }}
          >
            <Box fontWeight="medium">{user.username}</Box>
            <Box>
              <Badge colorScheme={getRoleColor(user.role)}>
                {user.role.toUpperCase()}
              </Badge>
            </Box>
            <Box>{new Date(user.date_joined).toLocaleDateString()}</Box>
            <Box>
              <HStack gap={2}>
                <Button size="sm" colorScheme="blue">
                  Edit Role
                </Button>
                <Button size="sm" colorScheme="red">
                  Delete
                </Button>
              </HStack>
            </Box>
          </Box>
        ))}
      </Box>

      {/* 空状态 */}
      {users.length === 0 && (
        <Box textAlign="center" py={10}>
          <Text color="gray.500">No users found.</Text>
        </Box>
      )}

      <Button alignSelf="start" colorScheme="green">
        Add New User
      </Button>
    </VStack>
  )
}