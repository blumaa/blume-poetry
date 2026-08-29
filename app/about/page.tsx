import type { Metadata } from 'next';
import { PageShell } from '@/components/PageShell';
import styles from './page.module.css';

export const metadata: Metadata = {
  title: 'About | Blumenous Poetry',
  description: 'About Blumenous Poetry by Desmond Blume',
  alternates: {
    canonical: '/about',
  },
};

export default function AboutPage() {
  return (
    <PageShell>
      <article className={`page-content ${styles.article}`}>
        <header className={styles.header}>
          <h1 className={styles.title}>
            About
          </h1>
        </header>

        <div className={`poem-content ${styles.body}`}>
          <p className={styles.intro}>
            Blumenous Poetry, by Desmond Blume, is a collection of writings, sometimes dark,
            other times out there, usually influenced by the moon, never far from the truth,
            always full of farce.
          </p>

          <p>
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
