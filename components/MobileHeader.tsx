'use client';

import Link from 'next/link';
import { ThemeToggle } from './ThemeToggle';
import { SubscribeButton } from './SubscribeButton';
import { InfoButton } from './InfoButton';

interface MobileHeaderProps {
  onMenuClick: () => void;
}

export function MobileHeader({ onMenuClick }: MobileHeaderProps) {
  return (
    <header className="md:hidden fixed top-0 left-0 right-0 z-40 bg-[var(--bg-primary)] border-b border-[var(--border)] px-2 h-14 flex items-center justify-between w-full overflow-hidden">
      {/* Hamburger menu button */}
      <button
        onClick={onMenuClick}
        className="shrink-0 w-[44px] h-[44px] flex items-center justify-center rounded-lg transition-colors hover:bg-[var(--bg-hover)]"
        aria-label="Open navigation menu"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <line x1="3" y1="6" x2="21" y2="6" />
          <line x1="3" y1="12" x2="21" y2="12" />
          <line x1="3" y1="18" x2="21" y2="18" />
        </svg>
      </button>

      {/* Site title */}
      <Link
        href="/"
        className="font-serif text-base font-medium text-[var(--text-primary)] hover:text-[var(--text-secondary)] transition-colors h-[44px] flex items-center truncate min-w-0"
      >
        Blumenous Poetry
      </Link>

      {/* Right side buttons */}
      <div className="shrink-0 flex items-center">
        <InfoButton />
        <SubscribeButton />
        <ThemeToggle />
      </div>
    </header>
  );
}
