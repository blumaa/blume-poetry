import { PageShell } from '@/components/PageShell';
import Link from 'next/link';
import styles from './not-found.module.css';

export default function NotFound() {
  return (
    <PageShell contentClassName={styles.content}>
      <div className={styles.inner}>
        <h1 className={styles.title}>
          Page not found
        </h1>
        <p className={styles.message}>
          The poem you are looking for may have moved or does not exist.
        </p>
        <Link
          href="/"
          className={styles.button}
        >
          Return to latest poem
        </Link>
      </div>
    </PageShell>
  );
}
