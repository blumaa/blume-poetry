import type { Metadata } from 'next';
import Link from 'next/link';
import { SITE_NAME } from '@/lib/brand';
import { poemHref } from '@/lib/collections';
import { formatMonthYear } from '@/lib/date';
import { getPublications, groupPublications, type Publication } from '@/lib/publications';
import styles from './page.module.css';

export const revalidate = 3600;

export const metadata: Metadata = {
  title: 'Publications',
  description: `Where poems from ${SITE_NAME} by Desmond Blume have been published`,
  alternates: {
    canonical: '/publications',
  },
};

/* The published piece when it is online, else the poem's page on this site. */
function PoemTitle({ poem }: { poem: Publication }) {
  if (poem.url) {
    return (
      <a href={poem.url} className={styles.link} target="_blank" rel="noopener noreferrer">
        {poem.poemTitle}
      </a>
    );
  }
  if (poem.poemSlug) {
    return (
      <Link href={poemHref('main', poem.poemSlug)} className={styles.link}>
        {poem.poemTitle}
      </Link>
    );
  }
  return poem.poemTitle;
}

export default async function PublicationsPage() {
  const groups = groupPublications(await getPublications());

  return (
    <article className={`page-content ${styles.article}`}>
      <header className={styles.header}>
        <h1 className={styles.title}>Publications</h1>
      </header>

      {groups.length === 0 ? (
        <p className={styles.empty}>No publications yet.</p>
      ) : (
        <ul className={styles.list} aria-label="Publications">
          {groups.map((group) => (
            <li key={`${group.journal}-${group.publishedOn}`} className={styles.item}>
              <div className={styles.meta}>
                <span className={styles.journal}>{group.journal}</span>
                <time dateTime={group.publishedOn.slice(0, 7)} className={styles.date}>
                  {formatMonthYear(group.publishedOn)}
                </time>
              </div>
              <ul className={styles.poems}>
                {group.poems.map((poem) => (
                  <li key={poem.id} className={styles.poem}>
                    <PoemTitle poem={poem} />
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      )}
    </article>
  );
}
