'use client';
import { Box, Heading, HStack, Text } from '@chakra-ui/react';
import { ReactNode } from 'react';

export default function PageHeader({
  title,
  subtitle,
  right,
}: {
  title: string;
  subtitle?: string;
  right?: ReactNode;
}) {
  return (
    <HStack justify="space-between" align="end" w="100%">
      <Box>
        <Heading size="lg" mb={1} color="white" letterSpacing="0.3px">
          {title}
        </Heading>
        {subtitle ? <Text color="gray.200">{subtitle}</Text> : null}
      </Box>
      {right ? <Box>{right}</Box> : null}
    </HStack>
  );
}
