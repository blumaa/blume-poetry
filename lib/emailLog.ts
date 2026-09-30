import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/supabase/types';

type EmailLogInsert = Database['public']['Tables']['email_logs']['Insert'];

/**
 * Records a finished send in email_logs. The emails have already gone out, so
 * a failed write is reported, not thrown: throwing would tell the admin the
 * send failed and invite a duplicate send.
 */
export async function recordEmailSend(client: SupabaseClient<Database>, entry: EmailLogInsert) {
  const { error } = await client.from('email_logs').insert(entry);
  if (error) console.error('Failed to record email send:', error);
}
