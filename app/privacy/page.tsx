import type { Metadata } from 'next';
import { PageShell } from '@/components/PageShell';
import styles from './page.module.css';

export const metadata: Metadata = {
  title: 'Privacy Policy | Blumenous Poetry',
  description: 'Privacy policy for Blumenous Poetry',
  alternates: {
    canonical: '/privacy',
  },
};

export default function PrivacyPage() {
  return (
    <PageShell>
      <article className={`page-content ${styles.article}`}>
        <header className={styles.header}>
          <h1 className={styles.title}>
            Privacy Policy
          </h1>
        </header>

        <div className={styles.body}>
          <p>
            Blumenous Poetry collects minimal data to provide you with a better experience.
          </p>

          <h2 className={styles.heading}>Newsletter Subscription</h2>
          <p>
            If you subscribe to the newsletter, we collect your email address to send you
            occasional updates about new poems. You can unsubscribe at any time using the
            link in any email.
          </p>

          <h2 className={styles.heading}>Analytics</h2>
          <p>
            We use Vercel Analytics to understand how visitors use the site. This collects
            anonymous usage data and does not track individual users.
          </p>

          <h2 className={styles.heading}>Comments and Likes</h2>
          <p>
            Comments and likes are stored to display on the site. Comments include the
            name you provide and your message. No account is required.
          </p>

          <h2 className={styles.heading}>Contact</h2>
          <p>
            For any privacy concerns, contact{' '}
            <a
              href="mailto:desmond.blume@gmail.com"
              className={styles.link}
            >
              desmond.blume@gmail.com
            </a>
          </p>
        </div>
      </article>
    </PageShell>
  );
}
