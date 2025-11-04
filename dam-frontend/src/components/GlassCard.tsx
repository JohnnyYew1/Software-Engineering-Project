// src/components/GlassCard.tsx
'use client';
import { Box, BoxProps } from '@chakra-ui/react';

export default function GlassCard(props: BoxProps) {
  const { children, ...rest } = props;
  return (
    <Box
      bg="rgba(255,255,255,0.7)"         // ← 70% 透明
      color="gray.900"
      borderRadius="20px"
      border="1px solid rgba(226,232,240,0.8)"
      boxShadow="0 20px 60px rgba(0,0,0,.20)"
      style={{ backdropFilter: 'blur(10px)' }}  // 玻璃拟态
      {...rest}
    >
      {children}
    </Box>
  );
}
