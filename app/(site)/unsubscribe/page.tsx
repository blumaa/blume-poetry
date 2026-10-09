import { SITE_NAME } from '@/lib/brand';
import type { Metadata } from 'next';
import { Button, ButtonLink } from '@/components/mds';
import { Icon } from '@/components/icons';
import { verifyUnsubscribeToken } from '@/lib/unsubscribeToken';
import { unsubscribe } from './actions';
import styles from './page.module.css';

export const metadata: Metadata = {
  title: 'Unsubscribe',
  description: `Stop getting emails from ${SITE_NAME}`,
  robots: { index: false, follow: false },
};

/* Three states: a valid link asks to confirm (a GET must not unsubscribe,
   since mail scanners follow links), the confirm lands on done, and anything
   else is a broken link. */
export default async function UnsubscribePage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string; done?: string }>;
}) {
  const { token, done } = await searchParams;
  const email = token ? verifyUnsubscribeToken(token) : null;

  return (
    <div className={styles.content}>
      <div className={styles.inner}>
        {done ? (
          <>
            <div className={styles.iconWrap}>
              <Icon name="check" />
            </div>
            <h1 className={styles.title}>You&apos;ve been unsubscribed</h1>
            <p className={styles.message}>
              You will no longer receive email updates from {SITE_NAME}.
            </p>
            <ButtonLink href="/">Return to poems</ButtonLink>
          </>
        ) : email ? (
          <>
            <h1 className={styles.title}>Unsubscribe from all emails?</h1>
            <p className={styles.message}>
              {email} will stop getting email from {SITE_NAME}.
            </p>
            <form action={unsubscribe}>
              <input type="hidden" name="token" value={token} />
              <Button type="submit">Unsubscribe</Button>
            </form>
          </>
        ) : (
          <>
            <h1 className={styles.title}>This link is missing something</h1>
            <p className={styles.message}>
              Open the unsubscribe link straight from one of my emails.
            </p>
            <ButtonLink href="/">Return to poems</ButtonLink>
          </>
        )}
      </div>
    </div>
  );
}
