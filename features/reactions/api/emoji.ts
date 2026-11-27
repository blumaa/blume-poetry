import { createClient } from '@/lib/supabase/client';
import type { Database } from '@/lib/supabase/types';

export type EmojiCategory = Database['public']['Enums']['emoji_category'];

export interface EmojiChoice {
  char: string;
  name: string;
  tags: readonly string[];
  category: EmojiCategory;
  /** The untoned emoji a skin-tone variant belongs to; null for a base. */
  base: string | null;
  tone: number | null;
  /** In the picker's quick row before the reader has recent ones. */
  quick: boolean;
}

/* PostgREST's default max-rows; the catalogue is several pages of it. */
const PAGE = 1000;

/** The whole catalogue in Unicode order. Public read (RLS emoji_read). */
export async function fetchEmojiCatalogue(): Promise<readonly EmojiChoice[]> {
  const rows: EmojiChoice[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data } = await createClient()
      .from('emoji')
      .select('char, name, tags, category, base, tone, quick')
      .order('sort_order', { ascending: true })
      .range(from, from + PAGE - 1)
      .throwOnError();

    rows.push(...data);
    if (data.length < PAGE) return rows;
  }
}
