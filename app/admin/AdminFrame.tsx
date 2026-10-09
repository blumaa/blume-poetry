'use client';

import type { ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { signOut } from '@/features/auth';
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
export function AdminFrame({ email, children }: { email: string | undefined; children: ReactNode }) {
  const router = useRouter();

  const onSignOut = async () => {
    await signOut();
    router.replace('/login');
    router.refresh();
  };

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
      account={{ email, onSignOut }}
    >
      {children}
    </AdminShell>
  );
}
