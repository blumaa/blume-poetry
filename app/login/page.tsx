import { SITE_NAME } from '@/lib/brand';
import type { Metadata } from 'next';
import { LoginForm } from '@/components/auth/LoginForm';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import styles from './page.module.css';

export const metadata: Metadata = {
  title: 'Login',
};

export default async function LoginPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect('/admin');
  }

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
