import Link from 'next/link';
import type { Poem, PoemMeta } from '@/lib/poems';
import { formatDate } from '@/lib/date';
import { poemHref } from '@/lib/collections';
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
  // Neighbours come from the poem's own collection.
  const prevHref = prevPoem ? poemHref(poem.collection, prevPoem.slug) : undefined;
  const nextHref = nextPoem ? poemHref(poem.collection, nextPoem.slug) : undefined;

  return (
    <article className={`page-content ${styles.article}`}>
      <PoemGestures prevHref={prevHref} nextHref={nextHref} />

      <nav className={styles.nav}>
        {nextHref ? (
          <Link href={nextHref} className={styles.navLink}>
            <span className={styles.navArrowLeft}>←</span>
            <span>next poem</span>
          </Link>
        ) : (
          <span />
        )}
        {prevHref ? (
          <Link href={prevHref} className={styles.navLinkRight}>
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
