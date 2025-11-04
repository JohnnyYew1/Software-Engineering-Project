'use client';
import { Box } from '@chakra-ui/react';
import { ReactNode } from 'react';

export default function TableCard({ children }: { children: ReactNode }) {
  return (
    <Box
      border="1px solid #E2E8F0"
      borderRadius="20px"
      overflow="hidden"
      bg="white"
      boxShadow="0 10px 30px rgba(0,0,0,0.10)"
    >
      <Box
        as="table"
        w="100%"
        style={{ borderCollapse: 'collapse', fontSize: 14 }}
      >
        {children}
      </Box>
    </Box>
  );
}

export function ThRow({ children }: { children: ReactNode }) {
  return (
    <tr style={{ background: '#0b0f2b', color: '#E2E8F0' }}>{children}</tr>
  );
}
export function Th({ children }: { children: ReactNode }) {
  return <th style={{ textAlign: 'left', padding: 10 }}>{children}</th>;
}
export function TdRow({ children }: { children: ReactNode }) {
  return <tr style={{ borderTop: '1px solid #E2E8F0' }}>{children}</tr>;
}
export function Td({ children }: { children: ReactNode }) {
  return <td style={{ padding: 10 }}>{children}</td>;
}
