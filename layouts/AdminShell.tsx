'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { SITE_NAME } from '@/lib/brand';
import { BrandLogo } from '@/components/BrandLogo';
import { Button, Menu, MenuItem, TabBar, TabBarItem } from '@/components/mds';
import { isActiveDestination, type NavDestination } from './nav';
import styles from './AdminShell.module.css';

interface AdminShellProps {
  destinations: NavDestination[];
  /** Header controls. Mounted once; the header rearranges around them per width. */
  actions: ReactNode;
  account: { email: string | undefined; onSignOut: () => void };
  children: ReactNode;
}

/* One header at every width. Stateful controls live in `actions` and are never
   duplicated per breakpoint; only stateless presentation (destination links vs
   tab bar, inline account vs menu) is switched by CSS. */
export function AdminShell({ destinations, actions, account, children }: AdminShellProps) {
  const pathname = usePathname();
  const isActive = (destination: NavDestination) => isActiveDestination(destination, pathname);

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <div className={styles.headerLeft}>
            <Link href="/" className={styles.brandLink} aria-label={SITE_NAME}>
              <BrandLogo />
            </Link>
            <nav aria-label="Admin" className={styles.desktopOnly}>
              <ul className={styles.navLinks}>
                {destinations.map((destination) => (
                  <li key={destination.href}>
                    <Link
                      href={destination.href}
                      aria-current={isActive(destination) ? 'page' : undefined}
                      className={styles.navLink}
                    >
                      {destination.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          </div>

          <div className={styles.headerRight}>
            {actions}
            <div className={`${styles.account} ${styles.desktopOnly}`}>
              <span className={styles.userEmail}>{account.email}</span>
              <Button variant="ghost" size="sm" onClick={account.onSignOut}>
                Sign Out
              </Button>
            </div>
            <div className={styles.mobileOnly}>
              <Menu
                label="Account"
                trigger={
                  <Button iconOnly variant="ghost" aria-label="More options">
                    <svg className={styles.icon} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                    </svg>
                  </Button>
                }
              >
                <div className={styles.menuEmailRow}>{account.email}</div>
                <MenuItem onSelect={account.onSignOut}>Sign Out</MenuItem>
              </Menu>
            </div>
          </div>
        </div>
      </header>

      <main id="main-content" className={styles.main}>
        {children}
      </main>

      <div className={`${styles.tabBarWrap} ${styles.mobileOnly}`}>
        <TabBar label="Admin sections">
          {destinations.map((destination) => (
            <TabBarItem
              key={destination.href}
              as={Link}
              href={destination.href}
              label={destination.label}
              icon={destination.icon}
              active={isActive(destination)}
            />
          ))}
        </TabBar>
      </div>
    </div>
  );
}
