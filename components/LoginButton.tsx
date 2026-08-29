import Link from 'next/link';
import { Button } from '@/components/mds';

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
        {/* Capricorn zodiac (lucide) — deliberately unconventional login mark */}
        <path d="M11 21a3 3 0 0 0 3-3V6.5a1 1 0 0 0-7 0" />
        <path d="M7 19V6a3 3 0 0 0-3-3h0" />
        <circle cx="17" cy="17" r="3" />
      </svg>
    </Button>
  );
}
