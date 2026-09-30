import Link from 'next/link';
import { Button } from '@/components/mds';
import { Icon } from '@/components/icons';

interface LoginButtonProps {
  className?: string;
}

export function LoginButton({ className = '' }: LoginButtonProps) {
  return (
    <Button
      iconOnly
      variant="ghost"
      as={Link}
      href="/login"
      className={className}
      aria-label="Admin login"
      title="Admin login"
    >
      {/* Capricorn: a deliberately unconventional login mark. */}
      <Icon name="login" />
    </Button>
  );
}
