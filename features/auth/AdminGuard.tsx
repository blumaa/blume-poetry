'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from './AuthProvider';
import styles from './AdminGuard.module.css';

interface AdminGuardProps {
  children: React.ReactNode;
}

export function AdminGuard({ children }: AdminGuardProps) {
  const { user, isLoading, isAdmin } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/login');
    }
  }, [user, isLoading, router]);

  if (isLoading) {
    return (
      <div className={styles.center}>
        <div className={styles.loadingText}>Loading...</div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  if (!isAdmin) {
    return (
      <div className={styles.center}>
        <div className={styles.deniedBox}>
          <h1 className={styles.deniedTitle}>Access Denied</h1>
          <p className={styles.deniedText}>
            You don&apos;t have permission to access this area.
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
