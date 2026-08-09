import type { PostgrestError, SupabaseClient } from '@supabase/supabase-js';
import type { Database, Subscriber } from '@/lib/supabase/types';

type SubscribersClient = SupabaseClient<Database>;
type SubscriberUpdate = Database['public']['Tables']['subscribers']['Update'];

export type UpsertSubscriberResult =
  | { outcome: 'already_active' }
  | { outcome: 'reactivated'; data: Subscriber | null; error: PostgrestError | null }
  | { outcome: 'inserted'; data: Subscriber | null; error: PostgrestError | null };

/**
 * Shared check-existing -> reactivate-if-unsubscribed -> insert-if-new flow
 * used by both the public /api/subscribe endpoint and the admin "add
 * subscriber" endpoint.
 *
 * Always lowercases the email before lookup and insert. This is the fix for
 * a bug where the public route stored emails as-typed while the admin route
 * lowercased them — a subscriber added as `Foo@x.com` couldn't later
 * unsubscribe as `foo@x.com` because the lookup wouldn't match.
 *
 * `reactivateFields` lets each caller control what gets written when
 * reactivating a previously-unsubscribed row (the two routes update
 * different fields here); the insert-new fields are identical for both
 * callers so they aren't parameterized.
 *
 * `notifyNewPoems` is its own argument rather than part of
 * `reactivateFields` because it applies to both paths: whichever answer the
 * subscriber just gave wins over whatever an earlier signup left behind.
 */
export async function upsertSubscriber(
  client: SubscribersClient,
  rawEmail: string,
  reactivateFields: SubscriberUpdate,
  notifyNewPoems: boolean = true
): Promise<UpsertSubscriberResult> {
  const email = rawEmail.toLowerCase();

  const { data: existing } = await client
    .from('subscribers')
    .select('id, status')
    .eq('email', email)
    .single();

  if (existing) {
    if (existing.status === 'active') {
      return { outcome: 'already_active' };
    }

    const { data, error } = await client
      .from('subscribers')
      .update({ ...reactivateFields, notify_new_poems: notifyNewPoems })
      .eq('id', existing.id)
      // `.select<'*', Subscriber>('*')` instead of bare `.select()`: in the
      // installed postgrest-js version, a bare `.select()` after
      // `.update()`/`.insert()` resolves `data`'s type to `{}` instead of the
      // table row (a known upstream generic-inference gap — reproduces even
      // for a plain read). The explicit generic is a type-only assertion; the
      // runtime query ("*") is unchanged.
      .select<'*', Subscriber>('*')
      .single();

    return { outcome: 'reactivated', data, error };
  }

  const { data, error } = await client
    .from('subscribers')
    .insert({ email, status: 'active', verified: true, notify_new_poems: notifyNewPoems })
    .select<'*', Subscriber>('*')
    .single();

  return { outcome: 'inserted', data, error };
}
