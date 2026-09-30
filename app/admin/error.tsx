'use client';

import { Button } from '@/components/mds';
import styles from './error.module.css';

export default function AdminError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className={styles.wrapper}>
      <div className={styles.content}>
        <h1 className={styles.title}>Admin Error</h1>
        <p className={styles.message}>
          Something went wrong in the admin panel.
        </p>
        <Button onClick={reset}>Try again</Button>
      </div>
    </div>
  );
}
