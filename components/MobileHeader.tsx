'use client';

import { SITE_NAME } from '@/lib/brand';
import Link from 'next/link';
import { BrandLogo } from './BrandLogo';
import { AppBar, Button } from '@/components/mds';
import { Icon } from '@/components/icons';
import { ThemeToggle } from './ThemeToggle';
import { LoginButton } from './LoginButton';
import styles from './MobileHeader.module.css';

interface MobileHeaderProps {
  onMenuClick: () => void;
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
            <Icon name="menu" size="lg" />
          </Button>
          <Link
            href="/"
            className={styles.brandLink}
            aria-label={SITE_NAME}
          >
            <BrandLogo />
          </Link>
        </>
      }
      trailing={
        <>
          <ThemeToggle />
          <LoginButton className={styles.iconButton} />
        </>
      }
      flush={true}
    />
  );
}
