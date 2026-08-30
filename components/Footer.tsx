import Link from 'next/link';
import styles from './Footer.module.css';

export function Footer() {
  return (
    <footer className={styles.footer}>
      <div className={styles.inner}>
        <span>© 2026 Desmond Blume</span>
        <span>·</span>
        <Link
          href="/about"
          className={styles.link}
        >
          About
        </Link>
        <span>·</span>
        <Link
          href="/privacy"
          className={styles.link}
        >
          Privacy
        </Link>
      </div>
    </footer>
  );
}
