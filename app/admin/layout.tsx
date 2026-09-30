'use client';

import type { ReactNode } from 'react';
import { AdminGuard, useAuth } from '@/features/auth';
import { ThemeToggle } from '@/components/ThemeToggle';
import { NotificationBell } from '@/features/notifications';
import { PushToggle } from '@/features/push';
import { AdminShell } from '@/layouts/AdminShell';
import type { NavDestination } from '@/layouts/nav';
import styles from './layout.module.css';

function Icon({ d }: { d: string }) {
  return (
    <svg className={styles.icon} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={d} />
    </svg>
  );
}

const destinations: NavDestination[] = [
  {
    href: '/admin',
    label: 'Dashboard',
    exact: true,
    icon: <Icon d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />,
  },
  {
    href: '/admin/poems',
    label: 'Poems',
    icon: <Icon d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />,
  },
  {
    href: '/admin/subscribers',
    label: 'Subscribers',
    icon: <Icon d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />,
  },
  {
    href: '/admin/comments',
    label: 'Comments',
    icon: <Icon d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />,
  },
];

/* Wiring only: features meet here, the shell stays feature-agnostic. */
function AdminFrame({ children }: { children: ReactNode }) {
  const { user, signOut } = useAuth();

  return (
    <AdminShell
      destinations={destinations}
      actions={
        <>
          <PushToggle />
          <NotificationBell />
          <ThemeToggle className={styles.themeToggle} />
        </>
      }
      account={{ email: user?.email, onSignOut: signOut }}
    >
      {children}
    </AdminShell>
  );
}

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <AdminGuard>
      <AdminFrame>{children}</AdminFrame>
    </AdminGuard>
  );
}
