'use client';

import type { ReactNode } from 'react';
import { AdminGuard, useAuth } from '@/features/auth';
import { ThemeToggle } from '@/components/ThemeToggle';
import { NotificationBell } from '@/features/notifications';
import { PushToggle } from '@/features/push';
import { Icon } from '@/components/icons';
import { AdminShell } from '@/layouts/AdminShell';
import type { NavDestination } from '@/layouts/nav';
import styles from './layout.module.css';

const destinations: NavDestination[] = [
  {
    href: '/admin',
    label: 'Dashboard',
    exact: true,
    icon: <Icon name="dashboard" />,
  },
  {
    href: '/admin/poems',
    label: 'Poems',
    icon: <Icon name="edit" />,
  },
  {
    href: '/admin/subscribers',
    label: 'Subscribers',
    icon: <Icon name="users" />,
  },
  {
    href: '/admin/comments',
    label: 'Comments',
    icon: <Icon name="comment" />,
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
