'use client';

import { ButtonLink } from '@/components/mds';
import { Icon } from '@/components/icons';

interface InfoButtonProps {
  className?: string;
}

export function InfoButton({ className = '' }: InfoButtonProps) {
  return (
    <ButtonLink
      iconOnly
      variant="ghost"
      href="/about"
      className={className}
      aria-label="About"
      title="About"
    >
      <Icon name="info" />
    </ButtonLink>
  );
}
