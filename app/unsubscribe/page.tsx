import { SITE_NAME } from '@/lib/brand';
import type { Metadata } from 'next';
import Link from 'next/link';
import { PageShell } from '@/components/PageShell';
import styles from './page.module.css';

export const metadata: Metadata = {
  title: 'Unsubscribed',
  description: `You have been unsubscribed from ${SITE_NAME}`,
};

export default function UnsubscribePage() {
  return (
    <PageShell contentClassName={styles.content}>
      <div className={styles.inner}>
        <div className={styles.iconWrap}>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className={styles.icon}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M5 13l4 4L19 7"
            />
          </svg>
        </div>
        <h1 className={styles.title}>
          You&apos;ve been unsubscribed
        </h1>
        <p className={styles.message}>
          You will no longer receive email updates from {SITE_NAME}.
        </p>
        <Link
          href="/"
          className={styles.button}
        >
          Return to poems
        </Link>
      </div>
    </PageShell>
  );
}
