import type { Metadata } from 'next';
import Link from 'next/link';
import { PageShell } from '@/components/PageShell';
import { NotificationSettings } from './NotificationSettings';
import styles from './page.module.css';

export const metadata: Metadata = {
  title: 'Email settings | Blumenous Poetry',
  description: 'Choose whether to get an email when a new poem is published',
  robots: { index: false, follow: false },
};

export default async function NotificationsPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string; action?: string }>;
}) {
  const { token, action } = await searchParams;

  return (
    <PageShell contentClassName={styles.content}>
      <div className={styles.inner}>
        {token ? (
          <NotificationSettings
            token={token}
            initialAction={action === 'on' || action === 'off' ? action : undefined}
          />
        ) : (
          <>
            <h1 className={styles.title}>
              This link is missing something
            </h1>
            <p className={styles.message}>
              Open the link straight from one of my emails and it&rsquo;ll bring you here with
              your settings.
            </p>
            <Link
              href="/"
              className={styles.button}
            >
              Return to poems
            </Link>
          </>
        )}
      </div>
    </PageShell>
  );
}
