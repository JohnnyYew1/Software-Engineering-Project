'use client';
export const dynamic = 'force-dynamic';

import {
  Heading,
  VStack,
  Box,
  Input,
  Button,
  Text,
  HStack,
} from '@chakra-ui/react';
import { useState, useEffect } from 'react';

/* 霓虹按钮（沿用你的风格） */
function NeonButton(props: React.ComponentProps<typeof Button>) {
  return (
    <Button
      {...props}
      borderRadius="md"
      position="relative"
      _before={{
        content: '""',
        position: 'absolute',
        inset: 0,
        borderRadius: 'inherit',
        padding: '1px',
        background: 'linear-gradient(90deg,#60a5fa,#a78bfa)',
        WebkitMask:
          'linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)',
        WebkitMaskComposite: 'xor',
        maskComposite: 'exclude',
        pointerEvents: 'none',
      }}
      _hover={{
        transform: 'translateY(-1px)',
        boxShadow: '0 12px 28px rgba(59,130,246,0.25)',
      }}
      transition="all .15s ease"
    />
  );
}

export default function ProfilePage() {
  const [mounted, setMounted] = useState(false);
  const [userData, setUserData] = useState({
    name: 'John Doe',
    email: 'john.doe@example.com',
    role: 'Editor',
  });
  const [isEditing, setIsEditing] = useState(false);
  const [editedName, setEditedName] = useState(userData.name);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleSave = () => {
    setUserData((prev) => ({ ...prev, name: editedName }));
    setIsEditing(false);
  };
  const handleCancel = () => {
    setEditedName(userData.name);
    setIsEditing(false);
  };

  if (!mounted) {
    return (
      <VStack align="stretch" gap={6}>
        <Heading color="white">My Profile</Heading>
        <Text color="gray.200">Loading...</Text>
      </VStack>
    );
  }

  return (
    <VStack align="stretch" gap={6}>
      <Heading color="white">My Profile</Heading>

      {/* 半透明玻璃卡片：≈70% 透明、毛玻璃、浅边框、柔和阴影 */}
      <Box
        p={6}
        border="1px solid rgba(226,232,240,0.90)"
        borderRadius="20px"
        bg="rgba(255,255,255,0.70)"
        maxW="560px"
        boxShadow="0 20px 60px rgba(0,0,0,0.20)"
        style={{ backdropFilter: 'blur(10px)' }}
      >
        <VStack align="stretch" gap={5}>
          {/* 顶部资料区：底部分隔线稍淡 */}
          <Box pb={4} borderBottom="1px solid rgba(226,232,240,0.90)">
            <Text fontWeight="bold" fontSize="lg" color="gray.800">
              {userData.name}
            </Text>
            <Text color="gray.700">{userData.email}</Text>
            <Text
              color={
                userData.role === 'Admin'
                  ? 'red.600'
                  : userData.role === 'Editor'
                  ? 'blue.600'
                  : 'green.600'
              }
              fontWeight="medium"
              mt={1}
            >
              {userData.role}
            </Text>
          </Box>

          {/* Display Name */}
          <Box>
            <Text fontWeight="medium" mb={2} color="gray.800">
              Display Name
            </Text>
            {isEditing ? (
              <VStack align="stretch" gap={3}>
                <Input
                  value={editedName}
                  onChange={(e) => setEditedName(e.target.value)}
                  placeholder="Enter your name"
                  borderRadius="12px"
                  bg="rgba(255,255,255,0.90)"
                  border="1px solid rgba(226,232,240,0.90)"
                />
                <HStack gap={2}>
                  <NeonButton onClick={handleSave} size="sm">
                    Save
                  </NeonButton>
                  <Button variant="ghost" onClick={handleCancel} size="sm">
                    Cancel
                  </Button>
                </HStack>
              </VStack>
            ) : (
              <HStack justify="space-between">
                <Text color="gray.800">{userData.name}</Text>
                <NeonButton variant="ghost" size="sm" onClick={() => setIsEditing(true)}>
                  Edit
                </NeonButton>
              </HStack>
            )}
          </Box>

          {/* Email */}
          <Box>
            <Text fontWeight="medium" mb={2} color="gray.800">
              Email
            </Text>
            <Text color="gray.700">{userData.email}</Text>
          </Box>

          {/* Role */}
          <Box>
            <Text fontWeight="medium" mb={2} color="gray.800">
              Role
            </Text>
            <Text color="gray.700">{userData.role}</Text>
          </Box>
        </VStack>
      </Box>
    </VStack>
  );
}
