import { ButtonLink } from '@/components/mds';
import { Icon } from '@/components/icons';

interface LoginButtonProps {
  className?: string;
}

export function LoginButton({ className = '' }: LoginButtonProps) {
  return (
    <ButtonLink
      iconOnly
      variant="ghost"
      href="/login"
      className={className}
      aria-label="Admin login"
      title="Admin login"
    >
      {/* Capricorn: a deliberately unconventional login mark. */}
      <Icon name="login" />
    </ButtonLink>
  );
}
