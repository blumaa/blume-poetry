import { cache } from 'react';
import type { Database } from './supabase/types';
import { getAnonClient, getCachedPoemClient } from './supabase/anon';

export interface Poem {
  id: string;
  slug: string;
  title: string;
  subtitle: string | null;
  content: string;
  plainText: string;
  publishedAt: string;
  url: string;
}

/** Lightweight poem metadata for tree/navigation (no content) */
export interface PoemMeta {
  id: string;
  slug: string;
  title: string;
  subtitle: string | null;
  publishedAt: string;
  /** Last write to the row (a trigger keeps it). */
  updatedAt: string;
  url: string;
  pinned: boolean;
}

/** A search hit: what the sidebar lists. */
export interface PoemSearchHit {
  id: string;
  slug: string;
  title: string;
}

export interface TreeNode {
  id: string;
  label: string;
  type: 'folder' | 'poem';
  children?: TreeNode[];
  slug?: string;
  count?: number;
}

// Row shape shared by every query that selects the full poem column set
type PoemColumns = Pick<
  Database['public']['Tables']['poems']['Row'],
  'id' | 'slug' | 'title' | 'subtitle' | 'content' | 'plain_text' | 'published_at' | 'url'
>;

function mapPoemRow(row: PoemColumns): Poem {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    subtitle: row.subtitle,
    content: row.content,
    plainText: row.plain_text || '',
    publishedAt: row.published_at,
    url: row.url || '',
  };
}

/* Every read throws on a database error (throwOnError). During ISR a thrown
   error keeps the last good page; returning [] or "not found" instead would
   regenerate and cache an empty site or a 404 for a poem that exists. */

// Lightweight query for tree/navigation — only fetches metadata fields
export const getAllPoemsMeta = cache(async (): Promise<PoemMeta[]> => {
  const { data } = await getCachedPoemClient()
    .from('poems')
    .select('id, slug, title, subtitle, published_at, updated_at, url, pinned')
    .eq('status', 'published')
    .order('published_at', { ascending: false })
    .throwOnError();

  return data.map((row) => ({
    id: row.id,
    slug: row.slug,
    title: row.title,
    subtitle: row.subtitle,
    publishedAt: row.published_at,
    updatedAt: row.updated_at,
    url: row.url || '',
    pinned: row.pinned,
  }));
});

// Get a single poem by slug — cached: fetched twice per page (metadata + body)
export const getPoemBySlug = cache(async (slug: string): Promise<Poem | undefined> => {
  const { data } = await getCachedPoemClient()
    .from('poems')
    .select('id, slug, title, subtitle, content, plain_text, published_at, url')
    .eq('slug', slug)
    .eq('status', 'published')
    .maybeSingle()
    .throwOnError();

  return data ? mapPoemRow(data) : undefined;
});

// Get recent poems — queries directly with a DB-level limit
export const getRecentPoems = cache(async (count: number = 10): Promise<Poem[]> => {
  const { data } = await getCachedPoemClient()
    .from('poems')
    .select('id, slug, title, subtitle, content, plain_text, published_at, url')
    .eq('status', 'published')
    .order('published_at', { ascending: false })
    .limit(count)
    .throwOnError();

  return data.map(mapPoemRow);
});

// Shared, cached slug→id lookup for the like and comment routes. Published
// only: a draft's slug must not take likes or comments.
export const getPoemIdBySlug = cache(async (slug: string): Promise<string | null> => {
  const { data } = await getCachedPoemClient()
    .from('poems')
    .select('id')
    .eq('slug', slug)
    .eq('status', 'published')
    .maybeSingle()
    .throwOnError();

  return data?.id ?? null;
});

// Published poems whose title or text contains the query, newest first, at
// most 50. Matched in Postgres on trigram indexes
// (supabase/migrations/20261009000400_add_search_poems.sql).
export async function searchPoems(query: string): Promise<PoemSearchHit[]> {
  const { data } = await getAnonClient()
    .rpc('search_poems', { p_query: query })
    .throwOnError();
  return data;
}

// Detect series from poem titles or subtitles
function detectSeries(poems: PoemMeta[]): Map<string, PoemMeta[]> {
  const series = new Map<string, PoemMeta[]>();

  const patterns = [
    { regex: /^Diary of a Programmer/i, name: 'Diary of a Programmer' },
    { regex: /^Poems from the Pit/i, name: 'Poems from the Pit' },
    { regex: /^Moon (Over|Poem|Meditation)/i, name: 'Moon Poems' },
    { regex: /^Sun Over/i, name: 'Sun Poems' },
  ];

  for (const poem of poems) {
    for (const pattern of patterns) {
      // Check both title and subtitle for series membership
      const matchesTitle = pattern.regex.test(poem.title);
      const matchesSubtitle = poem.subtitle && pattern.regex.test(poem.subtitle);

      if (matchesTitle || matchesSubtitle) {
        if (!series.has(pattern.name)) {
          series.set(pattern.name, []);
        }
        series.get(pattern.name)!.push(poem);
        break;
      }
    }
  }

  return series;
}

// Group poems by year
function groupByYear(poems: PoemMeta[]): Map<string, PoemMeta[]> {
  const years = new Map<string, PoemMeta[]>();

  for (const poem of poems) {
    const year = new Date(poem.publishedAt).getFullYear().toString();
    if (!years.has(year)) {
      years.set(year, []);
    }
    years.get(year)!.push(poem);
  }

  return years;
}

// The sidebar's navigation tree. Pure: the caller supplies the poems, newest first.
export function buildPoemTree(poems: PoemMeta[]): TreeNode[] {
  const series = detectSeries(poems);
  const years = groupByYear(poems);

  const tree: TreeNode[] = [];

  // Pinned poems (shown at top of sidebar)
  const pinnedPoems = poems.filter((p) => p.pinned);
  if (pinnedPoems.length > 0) {
    tree.push({
      id: 'pinned',
      label: 'Pinned',
      type: 'folder',
      count: pinnedPoems.length,
      children: pinnedPoems.map((p) => ({
        id: `pinned-${p.id}`,
        label: p.title,
        type: 'poem',
        slug: p.slug,
      })),
    });
  }

  // Recent poems
  tree.push({
    id: 'recent',
    label: 'Recent',
    type: 'folder',
    count: Math.min(10, poems.length),
    children: poems.slice(0, 10).map((p) => ({
      id: p.id,
      label: p.title,
      type: 'poem',
      slug: p.slug,
    })),
  });

  // Series
  if (series.size > 0) {
    const seriesNode: TreeNode = {
      id: 'series',
      label: 'Series',
      type: 'folder',
      children: [],
    };

    for (const [name, seriesPoems] of series) {
      seriesNode.children!.push({
        id: `series-${name}`,
        label: name,
        type: 'folder',
        count: seriesPoems.length,
        children: seriesPoems
          .sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime())
          .map((p) => ({
            id: p.id,
            label: p.title,
            type: 'poem',
            slug: p.slug,
          })),
      });
    }

    tree.push(seriesNode);
  }

  // By Year
  const yearsNode: TreeNode = {
    id: 'years',
    label: 'By Year',
    type: 'folder',
    children: [],
  };

  const sortedYears = Array.from(years.keys()).sort((a, b) => parseInt(b) - parseInt(a));
  for (const year of sortedYears) {
    const yearPoems = years.get(year)!;
    yearsNode.children!.push({
      id: `year-${year}`,
      label: year,
      type: 'folder',
      count: yearPoems.length,
      children: yearPoems.map((p) => ({
        id: p.id,
        label: p.title,
        type: 'poem',
        slug: p.slug,
      })),
    });
  }

  tree.push(yearsNode);

  // All poems A-Z
  tree.push({
    id: 'all',
    label: 'All Poems',
    type: 'folder',
    count: poems.length,
    children: [...poems]
      .sort((a, b) => a.title.localeCompare(b.title))
      .map((p) => ({
        id: p.id,
        label: p.title,
        type: 'poem',
        slug: p.slug,
      })),
  });

  return tree;
}

// Get all poem slugs (for static generation) — uses lightweight metadata query
export async function getAllPoemSlugs(): Promise<string[]> {
  const poems = await getAllPoemsMeta();
  return poems.map((p) => p.slug);
}

// Get adjacent poems for navigation — uses lightweight metadata query
// Poems are sorted newest-first, so "prev" (older, back in time) is the next
// index and "next" (newer, forward in time) is the previous index.
export async function getAdjacentPoems(slug: string): Promise<{ prev: PoemMeta | null; next: PoemMeta | null }> {
  const poems = await getAllPoemsMeta();
  const index = poems.findIndex((p) => p.slug === slug);
  if (index === -1) return { prev: null, next: null };

  return {
    prev: index < poems.length - 1 ? poems[index + 1] ?? null : null,
    next: index > 0 ? poems[index - 1] ?? null : null,
  };
}
