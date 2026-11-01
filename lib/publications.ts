import { cache } from 'react';
import { getCachedPublicationClient } from './supabase/anon';

/** A credit: a poem that appeared in a journal. */
export interface Publication {
  id: string;
  /** The title as the journal printed it. */
  poemTitle: string;
  journal: string;
  /** The published piece, when it is online. */
  url: string | null;
  /** YYYY-MM-01: shown as month and year. */
  publishedOn: string;
  /** The poem's page on the site; null when it has none the public can read. */
  poemSlug: string | null;
}

/* Newest first. The embedded poem is read under the anon key, so RLS returns
   it only when it is a published main poem; a draft or kinky poem comes back
   null and the credit is listed without a link. Throws on a database error,
   so ISR keeps the last good page. */
export const getPublications = cache(async (): Promise<Publication[]> => {
  const { data } = await getCachedPublicationClient()
    .from('publications')
    .select('id, poem_title, journal, url, published_on, poem:poems(slug)')
    .order('published_on', { ascending: false })
    .throwOnError();

  return data.map((row) => ({
    id: row.id,
    poemTitle: row.poem_title,
    journal: row.journal,
    url: row.url,
    publishedOn: row.published_on,
    poemSlug: row.poem?.slug ?? null,
  }));
});

/** One journal issue: the poems a journal published in one month. */
export interface PublicationGroup {
  journal: string;
  publishedOn: string;
  poems: Publication[];
}

/* Groups credits by journal and month, in the order given. */
export function groupPublications(publications: Publication[]): PublicationGroup[] {
  const groups = new Map<string, Publication[]>();
  for (const publication of publications) {
    const key = `${publication.journal}\u0000${publication.publishedOn}`;
    groups.set(key, [...(groups.get(key) ?? []), publication]);
  }

  return [...groups.values()].map((poems) => ({
    journal: poems[0].journal,
    publishedOn: poems[0].publishedOn,
    poems,
  }));
}
