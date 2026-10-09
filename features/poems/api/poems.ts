import { apiFetch } from '@/lib/apiFetch';
import { createClient } from '@/lib/supabase/client';
import type { PoemSearchHit } from '@/lib/poems';
import type { PoemInsert, PoemRow } from '@/lib/supabase/types';

export interface NotifyResult {
  sent: number;
  alreadyNotified?: boolean;
}

/** A row of the admin list: no body, plain_text only for search. */
export type AdminPoem = Pick<
  PoemRow,
  'id' | 'slug' | 'title' | 'status' | 'pinned' | 'published_at' | 'plain_text'
>;

/** Admin list, newest first. An unknown status means all poems. */
export async function fetchAdminPoems(status: string | null): Promise<AdminPoem[]> {
  let query = createClient()
    .from('poems')
    .select('id, slug, title, status, pinned, published_at, plain_text')
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

/** Inserts when `id` is null, else updates. Returns the row as saved. */
export async function savePoem(id: string | null, poem: PoemInsert): Promise<PoemRow> {
  const table = createClient().from('poems');
  const query = id ? table.update(poem).eq('id', id) : table.insert(poem);
  const { data } = await query.select('*').single().throwOnError();
  return data;
}

export async function setPoemPinned(id: string, pinned: boolean): Promise<void> {
  await createClient().from('poems').update({ pinned }).eq('id', id).throwOnError();
}

export async function deletePoem(id: string): Promise<void> {
  await createClient().from('poems').delete().eq('id', id).throwOnError();
}

/** Busts the cached poem reads so the public site shows the change. */
export async function revalidatePoems(): Promise<void> {
  await apiFetch('/api/admin/revalidate', { method: 'POST' });
}

/** Emails subscribers about a poem. The server skips poems already sent. */
export async function notifyPoem(poemId: string): Promise<NotifyResult> {
  return apiFetch<NotifyResult>('/api/admin/notify-poem', { method: 'POST', json: { poemId } });
}

export async function searchPoems(query: string): Promise<PoemSearchHit[]> {
  const { poems } = await apiFetch<{ poems: PoemSearchHit[] }>(
    `/api/poems/search?q=${encodeURIComponent(query)}`
  );
  return poems;
}
