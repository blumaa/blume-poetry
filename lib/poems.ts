import { createClient } from '@supabase/supabase-js';
import type { Database } from './supabase/types';

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

export interface TreeNode {
  id: string;
  label: string;
  type: 'folder' | 'poem';
  children?: TreeNode[];
  slug?: string;
  count?: number;
}

function getSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
  return createClient<Database>(supabaseUrl, supabaseKey);
}

// Get all poems sorted by date (newest first)
export async function getAllPoems(): Promise<Poem[]> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('poems')
    .select('id, slug, title, subtitle, content, plain_text, published_at, url')
    .eq('status', 'published')
    .order('published_at', { ascending: false });

  if (error || !data) {
    console.error('Error fetching poems:', error);
    return [];
  }

  return data.map((row) => ({
    id: row.id,
    slug: row.slug,
    title: row.title,
    subtitle: row.subtitle,
    content: row.content,
    plainText: row.plain_text || '',
    publishedAt: row.published_at,
    url: row.url || '',
  }));
}

// Get a single poem by slug
export async function getPoemBySlug(slug: string): Promise<Poem | undefined> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('poems')
    .select('id, slug, title, subtitle, content, plain_text, published_at, url')
    .eq('slug', slug)
    .eq('status', 'published')
    .single();

  if (error || !data) {
    return undefined;
  }

  return {
    id: data.id,
    slug: data.slug,
    title: data.title,
    subtitle: data.subtitle,
    content: data.content,
    plainText: data.plain_text || '',
    publishedAt: data.published_at,
    url: data.url || '',
  };
}

// Get recent poems
export async function getRecentPoems(count: number = 10): Promise<Poem[]> {
  const poems = await getAllPoems();
  return poems.slice(0, count);
}

// Search poems by title or content
export async function searchPoems(query: string): Promise<Poem[]> {
  const q = query.toLowerCase();
  const poems = await getAllPoems();
  return poems.filter(
    (p) =>
      p.title.toLowerCase().includes(q) ||
      p.content.toLowerCase().includes(q)
  );
}

// Detect series from poem titles
function detectSeries(poems: Poem[]): Map<string, Poem[]> {
  const series = new Map<string, Poem[]>();

  const patterns = [
    { regex: /^Diary of a Programmer/i, name: 'Diary of a Programmer' },
    { regex: /^Moon (Over|Poem|Meditation)/i, name: 'Moon Poems' },
    { regex: /^Sun Over/i, name: 'Sun Poems' },
  ];

  for (const poem of poems) {
    for (const pattern of patterns) {
      if (pattern.regex.test(poem.title)) {
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
function groupByYear(poems: Poem[]): Map<string, Poem[]> {
  const years = new Map<string, Poem[]>();

  for (const poem of poems) {
    const year = new Date(poem.publishedAt).getFullYear().toString();
    if (!years.has(year)) {
      years.set(year, []);
    }
    years.get(year)!.push(poem);
  }

  return years;
}

// Build the tree structure for navigation
export async function buildPoemTree(): Promise<TreeNode[]> {
  const poems = await getAllPoems();
  const series = detectSeries(poems);
  const years = groupByYear(poems);

  const tree: TreeNode[] = [];

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

// Get all poem slugs (for static generation)
export async function getAllPoemSlugs(): Promise<string[]> {
  const poems = await getAllPoems();
  return poems.map((p) => p.slug);
}

// Get adjacent poems for navigation
export async function getAdjacentPoems(slug: string): Promise<{ prev: Poem | null; next: Poem | null }> {
  const poems = await getAllPoems();
  const index = poems.findIndex((p) => p.slug === slug);

  return {
    prev: index > 0 ? poems[index - 1] : null,
    next: index < poems.length - 1 ? poems[index + 1] : null,
  };
}
