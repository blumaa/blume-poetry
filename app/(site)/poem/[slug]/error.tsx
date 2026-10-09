'use client';

import { Button, ButtonLink } from '@/components/mds';
import styles from './error.module.css';

export default function PoemError({
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
          <Button onClick={reset}>Try again</Button>
          <ButtonLink href="/" variant="secondary">
            Go home
          </ButtonLink>
        </div>
      </div>
    </div>
  );
}
