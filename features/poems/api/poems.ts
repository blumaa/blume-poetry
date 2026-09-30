import { apiFetch } from '@/lib/apiFetch';
import { createClient } from '@/lib/supabase/client';
import type { Poem } from '@/lib/poems';
import type { PoemInsert, PoemRow } from '@/lib/supabase/types';

export type PoemStatusFilter = 'draft' | 'published';

export interface NotifyResult {
  sent: number;
  alreadyNotified?: boolean;
}

/** Admin list, newest first. An unknown status means all poems. */
export async function fetchAdminPoems(status: string | null): Promise<PoemRow[]> {
  let query = createClient()
    .from('poems')
    .select('*')
    .order('published_at', { ascending: false });

  if (status === 'draft' || status === 'published') {
    query = query.eq('status', status);
  }

  const { data } = await query.throwOnError();
  return data;
}

/** null when no poem has the id. */
export async function fetchPoemById(id: string): Promise<PoemRow | null> {
  const { data } = await createClient()
    .from('poems')
    .select('*')
    .eq('id', id)
    .maybeSingle()
    .throwOnError();
  return data;
}

/** Inserts when `id` is null, else updates. Returns the poem's id. */
export async function savePoem(id: string | null, poem: PoemInsert): Promise<string> {
  const table = createClient().from('poems');
  const query = id ? table.update(poem).eq('id', id) : table.insert(poem);
  const { data } = await query.select<'id', { id: string }>('id').single().throwOnError();
  return data.id;
}

export async function setPoemPinned(id: string, pinned: boolean): Promise<void> {
  await createClient().from('poems').update({ pinned }).eq('id', id).throwOnError();
}

export async function deletePoem(id: string): Promise<void> {
  await createClient().from('poems').delete().eq('id', id).throwOnError();
}

/** Busts the cached poem reads and the given paths so the public site shows the change. */
export async function revalidatePoems(paths: string[]): Promise<void> {
  await apiFetch('/api/admin/revalidate', { method: 'POST', json: { paths } });
}

/** Emails subscribers about a poem. The server skips poems already sent. */
export async function notifyPoem(poemId: string): Promise<NotifyResult> {
  return apiFetch<NotifyResult>('/api/admin/notify-poem', { method: 'POST', json: { poemId } });
}

export async function searchPoems(query: string): Promise<Poem[]> {
  const { poems } = await apiFetch<{ poems: Poem[] }>(
    `/api/poems/search?q=${encodeURIComponent(query)}`
  );
  return poems;
}
