'use client';

import * as React from 'react';
import { ChakraProvider, defaultSystem } from '@chakra-ui/react';
import { AuthProvider } from '@/contexts/AuthContext'; // ✅ 用命名导入，而不是默认导入

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ChakraProvider value={defaultSystem}>
      <AuthProvider>{children}</AuthProvider>
    </ChakraProvider>
  );
}
