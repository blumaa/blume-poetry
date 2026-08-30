'use client';

import Link from 'next/link';
import { Button } from '@/components/mds';

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
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="16" x2="12" y2="12" />
        <line x1="12" y1="8" x2="12.01" y2="8" />
      </svg>
    </Button>
  );
}
