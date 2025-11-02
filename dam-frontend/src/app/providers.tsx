'use client';

import { ReactNode } from 'react';
// ✅ Chakra v3：用 value={defaultSystem}，不要再用 theme / extendTheme / ColorModeScript
import { ChakraProvider, defaultSystem } from '@chakra-ui/react';
import { AuthProvider } from '@/contexts/AuthContext';

export default function Providers({ children }: { children: ReactNode }) {
  return (
    <ChakraProvider value={defaultSystem}>
      <AuthProvider>
        {children}
      </AuthProvider>
    </ChakraProvider>
  );
}
