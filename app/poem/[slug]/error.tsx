'use client';

import Link from 'next/link';
import styles from './error.module.css';

export default function PoemError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className={styles.container}>
      <div className={styles.content}>
        <h1 className={styles.title}>Could not load poem</h1>
        <p className={styles.message}>
          There was a problem loading this poem. Please try again.
        </p>
        <div className={styles.actions}>
          <button
            onClick={reset}
            className={styles.button}
          >
            Try again
          </button>
          <Link
            href="/"
            className={styles.buttonOutline}
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}
