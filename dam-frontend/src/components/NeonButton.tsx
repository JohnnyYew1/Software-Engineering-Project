'use client';
import { Button } from '@chakra-ui/react';

export default function NeonButton(
  props: React.ComponentProps<typeof Button> & { active?: boolean }
) {
  const { active, ...rest } = props;
  return (
    <Button
      {...rest}
      borderRadius="md"
      position="relative"
      _before={{
        content: '""',
        position: 'absolute',
        inset: 0,
        borderRadius: 'inherit',
        padding: '1px',
        background: active
          ? 'linear-gradient(90deg,#60a5fa,#a78bfa)'
          : 'linear-gradient(90deg,#94a3b8,#cbd5e1)',
        WebkitMask:
          'linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)',
        WebkitMaskComposite: 'xor',
        maskComposite: 'exclude',
        pointerEvents: 'none',
      }}
      _hover={{
        transform: 'translateY(-1px)',
        boxShadow: active
          ? '0 12px 28px rgba(59,130,246,0.25)'
          : '0 10px 24px rgba(0,0,0,0.08)',
      }}
      transition="all .15s ease"
    />
  );
}
