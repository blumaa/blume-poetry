import { SITE_NAME } from '@/lib/brand';
import type { Metadata } from 'next';
import { LoginForm } from '@/features/auth';
import Link from 'next/link';
import styles from './page.module.css';

export const metadata: Metadata = {
  title: 'Login',
};

/* The proxy sends a signed-in admin straight to /admin. */
export default function LoginPage() {
  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <div className={styles.header}>
          <Link href="/" className={styles.brand}>
            {SITE_NAME}
          </Link>
          <p className={styles.subtitle}>Admin Login</p>
        </div>

        <div className={styles.panel}>
          <LoginForm />
        </div>

        <p className={styles.footer}>
          <Link href="/" className={styles.backLink}>
            &larr; Back to site
          </Link>
        </p>
      </div>
    </div>
  );
}
