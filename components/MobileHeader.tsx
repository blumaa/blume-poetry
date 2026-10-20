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
  /** Where the logo goes: the collection's home. */
  homeHref: string;
  onMenuClick: () => void;
}

export function MobileHeader({ homeHref, onMenuClick }: MobileHeaderProps) {
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
            href={homeHref}
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
