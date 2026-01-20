/**
 * Script to scrape subtitles from Substack and update the database
 *
 * Run with:
 * npx tsx scripts/scrape-subtitles.ts
 *
 * Options:
 *   --dry-run    Preview changes without updating database
 */

import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { createClient } from '@supabase/supabase-js';
import type { Database } from '../lib/supabase/types';

const isDryRun = process.argv.includes('--dry-run');

interface PoemWithUrl {
  id: string;
  title: string;
  slug: string;
  subtitle: string | null;
  url: string | null;
}

// Patterns that are valid subtitles
const VALID_SUBTITLE_PATTERNS = [
  /^Diary of a Programmer\s*\d+$/i,
  /^Poems from the Pit\s*\d+$/i,
  /^for\s+.+$/i, // "For Leonora Carrington"
  /^after\s+.+$/i, // "after Istvan Örkény's tulip in crisis"
  /^:\s*.+$/, // Subtitles starting with colon
];

function isValidSubtitle(text: string): boolean {
  if (!text || text.length > 80) return false;
  // Reject text that looks like content previews (multiple sentences or ellipsis)
  if (text.includes('…') || text.includes('...')) return false;
  if ((text.match(/\./g) || []).length > 2) return false;

  return VALID_SUBTITLE_PATTERNS.some(pattern => pattern.test(text));
}

async function fetchSubtitle(url: string): Promise<string | null> {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
      },
    });

    if (!response.ok) {
      console.error(`  Failed to fetch ${url}: ${response.status}`);
      return null;
    }

    const html = await response.text();

    // Look for subtitle in meta tag first (most reliable)
    const ogDescMatch = html.match(/<meta[^>]*property="og:description"[^>]*content="([^"]+)"/i);
    if (ogDescMatch) {
      const desc = ogDescMatch[1].trim();
      if (isValidSubtitle(desc)) {
        // Clean up leading colon if present
        return desc.startsWith(':') ? desc.slice(1).trim() : desc;
      }
    }

    // Look for subtitle class in HTML
    const subtitleMatch = html.match(/<h3[^>]*class="[^"]*subtitle[^"]*"[^>]*>([^<]+)<\/h3>/i);
    if (subtitleMatch) {
      const text = subtitleMatch[1].trim();
      if (isValidSubtitle(text)) {
        return text.startsWith(':') ? text.slice(1).trim() : text;
      }
    }

    // Look for subtitle in the header structure
    const headerSubtitleMatch = html.match(
      /<p[^>]*class="[^"]*subtitle[^"]*"[^>]*>([^<]+)<\/p>/i
    );
    if (headerSubtitleMatch) {
      const text = headerSubtitleMatch[1].trim();
      if (isValidSubtitle(text)) {
        return text.startsWith(':') ? text.slice(1).trim() : text;
      }
    }

    return null;
  } catch (error) {
    console.error(`  Error fetching ${url}:`, error);
    return null;
  }
}

async function scrapeSubtitles() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing environment variables.');
    console.error('Please set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local');
    process.exit(1);
  }

  const supabase = createClient<Database>(supabaseUrl, supabaseServiceKey);

  // Get all poems with URLs
  const { data: poems, error } = await supabase
    .from('poems')
    .select('id, title, slug, subtitle, url')
    .not('url', 'is', null)
    .order('published_at', { ascending: false });

  if (error) {
    console.error('Error fetching poems:', error.message);
    process.exit(1);
  }

  console.log(`Found ${poems.length} poems with Substack URLs`);
  console.log(isDryRun ? '(DRY RUN - no changes will be made)\n' : '\n');

  const updates: { id: string; title: string; subtitle: string }[] = [];
  const alreadyHasSubtitle: string[] = [];
  const noSubtitleFound: string[] = [];

  for (let i = 0; i < poems.length; i++) {
    const poem = poems[i] as PoemWithUrl;
    console.log(`[${i + 1}/${poems.length}] ${poem.title}`);

    if (poem.subtitle) {
      console.log(`  Already has subtitle: "${poem.subtitle}"`);
      alreadyHasSubtitle.push(poem.title);
      continue;
    }

    if (!poem.url) {
      console.log('  No URL, skipping');
      noSubtitleFound.push(poem.title);
      continue;
    }

    const subtitle = await fetchSubtitle(poem.url);

    if (subtitle) {
      console.log(`  Found subtitle: "${subtitle}"`);
      updates.push({ id: poem.id, title: poem.title, subtitle });
    } else {
      console.log('  No subtitle found');
      noSubtitleFound.push(poem.title);
    }

    // Rate limit to be nice to Substack
    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  console.log('\n--- Summary ---');
  console.log(`Already had subtitles: ${alreadyHasSubtitle.length}`);
  console.log(`Found new subtitles: ${updates.length}`);
  console.log(`No subtitle found: ${noSubtitleFound.length}`);

  if (updates.length > 0) {
    console.log('\nSubtitles to update:');
    for (const update of updates) {
      console.log(`  - "${update.title}" → "${update.subtitle}"`);
    }

    if (!isDryRun) {
      console.log('\nUpdating database...');

      for (const update of updates) {
        const { error: updateError } = await supabase
          .from('poems')
          .update({ subtitle: update.subtitle })
          .eq('id', update.id);

        if (updateError) {
          console.error(`  Error updating "${update.title}":`, updateError.message);
        } else {
          console.log(`  Updated: "${update.title}"`);
        }
      }

      console.log('\nDatabase update complete!');
    } else {
      console.log('\n(Dry run - no changes made. Run without --dry-run to apply updates)');
    }
  }
}

scrapeSubtitles().catch(console.error);
