'use client';

import Link from 'next/link';
import { Button } from '@/components/mds';
import { Icon } from '@/components/icons';

interface InfoButtonProps {
  className?: string;
}

export function InfoButton({ className = '' }: InfoButtonProps) {
  return (
    <Button
      iconOnly
      variant="ghost"
      as={Link}
      href="/about"
      className={className}
      aria-label="About"
      title="About"
    >
      <Icon name="info" />
    </Button>
  );
}
