'use client';

import { Button } from '@/components/mds';
import { Icon } from '@/components/icons';
import { useTheme } from '@/lib/useTheme';

interface ThemeToggleProps {
  className?: string;
}

export function ThemeToggle({ className = '' }: ThemeToggleProps) {
  const { theme, toggleTheme } = useTheme();

  return (
    <Button
      iconOnly
      variant="ghost"
      onClick={toggleTheme}
      className={className}
      aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
    >
      {/* The icon names where a click goes: moon to go dark, sun to go light. */}
      <Icon name={theme === 'light' ? 'moon' : 'sun'} />
    </Button>
  );
}
