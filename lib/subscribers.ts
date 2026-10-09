import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database, SubscriberRow } from '@/lib/supabase/types';
import { verifyUnsubscribeToken } from '@/lib/unsubscribeToken';

export type UpsertSubscriberResult =
  | { outcome: 'already_active' }
  | { outcome: 'reactivated' | 'inserted'; subscriber: SubscriberRow };

/**
 * Subscribes an email in one atomic call
 * (supabase/migrations/20261009000700_tighten_columns.sql): inserts it, or
 * reactivates an unsubscribed row, or reports it already active. The
 * function lowercases and trims the email, so every lookup matches.
 *
 * Shared by the public /api/subscribe route and the admin "add subscriber"
 * route. Database errors throw.
 */
export async function upsertSubscriber(
  client: SupabaseClient<Database>,
  email: string,
  notifyNewPoems: boolean = true
): Promise<UpsertSubscriberResult> {
  const { data } = await client
    .rpc('upsert_subscriber', { p_email: email, p_notify_new_poems: notifyNewPoems })
    .single()
    .throwOnError();

  if (data.outcome === 'already_active') return { outcome: 'already_active' };
  return {
    outcome: data.outcome as 'inserted' | 'reactivated',
    subscriber: data.subscriber,
  };
}

/**
 * Unsubscribes the address a signed unsubscribe token was issued for. Returns
 * false, touching nothing, when the token is missing or forged. Shared by the
 * one-click POST and the confirm page. Database errors throw.
 */
export async function unsubscribeByToken(
  client: SupabaseClient<Database>,
  token: string | null
): Promise<boolean> {
  const email = token ? verifyUnsubscribeToken(token) : null;
  if (!email) return false;

  await client
    .from('subscribers')
    .update({ status: 'unsubscribed' })
    .eq('email', email)
    .throwOnError();
  return true;
}
