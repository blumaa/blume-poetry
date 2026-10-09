import Link from 'next/link';
import type { Poem, PoemMeta } from '@/lib/poems';
import { formatDate } from '@/lib/date';
import { PoemContent } from './PoemContent';
import { PoemActions } from './PoemActions';
import { PoemGestures } from './PoemGestures';
import styles from './PoemDisplay.module.css';

interface PoemDisplayProps {
  poem: Poem;
  prevPoem?: PoemMeta | null;
  nextPoem?: PoemMeta | null;
}

/* Server component: the poem renders and sanitizes on the server, and only
   the gestures and the like/comment controls ship as client code. */
export function PoemDisplay({ poem, prevPoem, nextPoem }: PoemDisplayProps) {
  return (
    <article className={`page-content ${styles.article}`}>
      <PoemGestures prevSlug={prevPoem?.slug} nextSlug={nextPoem?.slug} />

      <nav className={styles.nav}>
        {nextPoem ? (
          <Link href={`/poem/${nextPoem.slug}`} className={styles.navLink}>
            <span className={styles.navArrowLeft}>←</span>
            <span>next poem</span>
          </Link>
        ) : (
          <span />
        )}
        {prevPoem ? (
          <Link href={`/poem/${prevPoem.slug}`} className={styles.navLinkRight}>
            <span>previous poem</span>
            <span className={styles.navArrowRight}>→</span>
          </Link>
        ) : (
          <span />
        )}
      </nav>

      <header className={styles.header}>
        <h1 className={styles.title}>{poem.title}</h1>
        {poem.subtitle && <p className={styles.subtitle}>{poem.subtitle}</p>}
        <time className={styles.date} dateTime={poem.publishedAt}>
          {formatDate(poem.publishedAt)}
        </time>
      </header>

      <PoemContent html={poem.content} />

      {/* Keyed: moving to another poem starts with the comment form closed. */}
      <PoemActions key={poem.slug} slug={poem.slug} />
    </article>
  );
}
