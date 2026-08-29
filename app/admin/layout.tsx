'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { AuthProvider } from '@/components/auth/AuthProvider';
import { AdminGuard } from '@/components/auth/AdminGuard';
import { useAuth } from '@/components/auth/AuthProvider';
import { ThemeToggle } from '@/components/ThemeToggle';
import { NotificationBell } from '@/components/admin/NotificationBell';
import { Button, Menu, MenuItem, TabBar, TabBarItem } from '@/components/mds';
import styles from './layout.module.css';

function AdminNav() {
  const pathname = usePathname();
  const { user, signOut } = useAuth();

  const isActive = (href: string) => {
    if (href === '/admin') return pathname === '/admin';
    return pathname.startsWith(href);
  };

  const navItems = [
    {
      href: '/admin',
      label: 'Dashboard',
      icon: (
        <svg className={styles.icon} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
        </svg>
      ),
    },
    {
      href: '/admin/poems',
      label: 'Poems',
      icon: (
        <svg className={styles.icon} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
        </svg>
      ),
    },
    {
      href: '/admin/subscribers',
      label: 'Subscribers',
      icon: (
        <svg className={styles.icon} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      ),
    },
    {
      href: '/admin/comments',
      label: 'Comments',
      icon: (
        <svg className={styles.icon} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
      ),
    },
  ];

  return (
    <>
      {/* Desktop nav - hidden on mobile */}
      <nav className={styles.desktopNav}>
        <div className={styles.navContainer}>
          <div className={styles.navLeft}>
            <Link href="/" className={styles.brandLink}>
              Blumenous Poetry
            </Link>
            <div className={styles.navLinks}>
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={isActive(item.href) ? 'page' : undefined}
                  className={`${styles.navLink} ${
                    isActive(item.href)
                      ? styles.navLinkActive
                      : styles.navLinkInactive
                  }`}
                >
                  {item.label}
                </Link>
              ))}
            </div>
          </div>
          <div className={styles.navRight}>
            <NotificationBell />
            <ThemeToggle className={styles.themeToggle} />
            <span className={styles.userEmail}>{user?.email}</span>
            <Button variant="ghost" size="sm" onClick={signOut} className={styles.signOutButton}>
              Sign Out
            </Button>
          </div>
        </div>
      </nav>

      {/* Mobile top bar */}
      <nav className={styles.mobileNav}>
        <Link href="/" className={styles.mobileBrandLink}>
          Blumenous
        </Link>
        <div className={styles.mobileRight}>
          <NotificationBell />
          <ThemeToggle className={styles.themeToggle} />
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
            <div className={styles.menuEmailRow}>
              {user?.email}
            </div>
            <MenuItem onSelect={signOut}>Sign Out</MenuItem>
          </Menu>
        </div>
      </nav>

      {/* Mobile bottom tab bar */}
      <div className={styles.mobileTabBarWrap}>
        <TabBar label="Admin">
          {navItems.map((item) => (
            <TabBarItem
              key={item.href}
              as={Link}
              href={item.href}
              label={item.label}
              icon={item.icon}
              active={isActive(item.href)}
            />
          ))}
        </TabBar>
      </div>
    </>
  );
}

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthProvider>
      <AdminGuard>
        <div className={styles.page}>
          <AdminNav />
          <main id="main-content" className={styles.main}>
            {children}
          </main>
        </div>
      </AdminGuard>
    </AuthProvider>
  );
}
