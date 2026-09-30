import { SITE_NAME } from '@/lib/brand';
import type { Metadata } from 'next';
import Link from 'next/link';
import { PageShell } from '@/components/PageShell';
import { Button } from '@/components/mds';
import { Icon } from '@/components/icons';
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
          <Icon name="check" />
        </div>
        <h1 className={styles.title}>
          You&apos;ve been unsubscribed
        </h1>
        <p className={styles.message}>
          You will no longer receive email updates from {SITE_NAME}.
        </p>
        <Button as={Link} href="/">
          Return to poems
        </Button>
      </div>
    </PageShell>
  );
}
