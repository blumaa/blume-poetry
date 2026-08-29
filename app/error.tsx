'use client';

import styles from './error.module.css';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className={styles.container}>
      <div className={styles.content}>
        <h1 className={styles.title}>Something went wrong</h1>
        <p className={styles.message}>
          An unexpected error occurred. Please try again.
        </p>
        <button
          onClick={reset}
          className={styles.button}
        >
          Try again
        </button>
      </div>
    </div>
  );
}
