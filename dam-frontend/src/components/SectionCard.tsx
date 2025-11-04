'use client';
import { Box } from '@chakra-ui/react';
import { ReactNode } from 'react';

export default function SectionCard({
  children, p = 5
}: { children: ReactNode; p?: number | string }) {
  return (
    <Box
      borderRadius="20px"
      p={p}
      background="white"
      border="1px solid #E2E8F0"
      boxShadow="0 10px 30px rgba(0,0,0,0.10)"
    >
      {children}
    </Box>
  );
}
