'use client';
import { Box, Container, VStack } from '@chakra-ui/react';
import { ReactNode } from 'react';

export default function CyberShell({ children }: { children: ReactNode }) {
  return (
    <Box position="relative" minH="100vh">
      {/* 背景层（不拦截点击） */}
      <Box
        position="fixed"
        inset="0"
        zIndex={0}
        pointerEvents="none"
        background="
          radial-gradient(1200px 600px at 10% -10%, rgba(56, 189, 248, 0.18), transparent 60%),
          radial-gradient(800px 500px at 90% 0%, rgba(139, 92, 246, 0.18), transparent 60%),
          linear-gradient(180deg, #0a1022 0%, #0b0f2b 35%, #0d1236 100%)
        "
      >
        <Box
          position="absolute"
          inset="0"
          opacity={0.15}
          style={{
            backgroundImage:
              'linear-gradient(rgba(255,255,255,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)',
            backgroundSize: '36px 36px, 36px 36px',
          }}
        />
        <Box
          position="absolute"
          top="18%"
          left="10%"
          width="420px"
          height="420px"
          borderRadius="50%"
          background="radial-gradient(closest-side, rgba(59,130,246,0.35), transparent)"
          style={{ filter: 'blur(80px)' }}
        />
        <Box
          position="absolute"
          bottom="10%"
          right="6%"
          width="520px"
          height="520px"
          borderRadius="50%"
          background="radial-gradient(closest-side, rgba(147,51,234,0.35), transparent)"
          style={{ filter: 'blur(90px)' }}
        />
      </Box>

      {/* 内容容器 */}
      <Container maxW="container.xl" py={8} zIndex={1} position="relative">
        <VStack align="stretch" gap={6}>
          {children}
        </VStack>
      </Container>
    </Box>
  );
}
