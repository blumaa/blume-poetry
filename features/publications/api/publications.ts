import { revalidateCache } from '@/lib/revalidate';
import { createClient } from '@/lib/supabase/client';
import type { PublicationInsert, PublicationRow } from '@/lib/supabase/types';

/** What the admin form writes. */
export type PublicationInput = Pick<
  PublicationInsert,
  'poem_id' | 'poem_title' | 'journal' | 'url' | 'published_on'
>;

/** Admin list, newest first. */
export async function fetchAdminPublications(): Promise<PublicationRow[]> {
  const { data } = await createClient()
    .from('publications')
    .select('*')
    .order('published_on', { ascending: false })
    .throwOnError();
  return data;
}

/** Inserts when `id` is null, else updates. Returns the row as saved. */
export async function savePublication(id: string | null, publication: PublicationInput): Promise<PublicationRow> {
  const table = createClient().from('publications');
  const query = id ? table.update(publication).eq('id', id) : table.insert(publication);
  const { data } = await query.select('*').single().throwOnError();
  return data;
}

export async function deletePublication(id: string): Promise<void> {
  await createClient().from('publications').delete().eq('id', id).throwOnError();
}

/** Busts the cached publications page so it shows the change. */
export function revalidatePublications(): Promise<void> {
  return revalidateCache('publications');
}
