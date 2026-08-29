'use client';

import Link from 'next/link';
import { AppBar, Button } from '@/components/mds';
import { ThemeToggle } from './ThemeToggle';
import { LoginButton } from './LoginButton';
import styles from './MobileHeader.module.css';

interface MobileHeaderProps {
  onMenuClick: () => void;
}

function MenuIcon() {
  return (
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
  );
}

export function MobileHeader({ onMenuClick }: MobileHeaderProps) {
  return (
    <AppBar
      className={styles.appBar}
      /* No `title`: AppBar renders it as the page h1, which belongs to the
         poem. The site name is a plain home link in the leading slot. */
      leading={
        <>
          <Button
            iconOnly
            variant="ghost"
            shape="rect"
            onClick={onMenuClick}
            aria-label="Open navigation menu"
          >
            <MenuIcon />
          </Button>
          <Link
            href="/"
            className={styles.brandLink}
          >
            Blumenous Poetry
          </Link>
        </>
      }
      trailing={
        <>
          <ThemeToggle />
          <LoginButton className={styles.iconButton} />
        </>
      }
    />
  );
}
