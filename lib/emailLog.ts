import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/supabase/types';

type Client = SupabaseClient<Database>;
type EmailLogStatus = Database['public']['Enums']['email_log_status'];

/**
 * Logs a whole-list send before the first mail goes out. Throws on failure:
 * nothing has been sent yet, so failing the request is safe.
 */
export async function startEmailLog(
  client: Client,
  entry: { subject: string; poem_id: string | null }
): Promise<string> {
  const { data } = await client
    .from('email_logs')
    .insert({ ...entry, status: 'sending' })
    .select('id')
    .single()
    .throwOnError();
  return data.id;
}

function outcomeStatus({ sent, failed }: { sent: number; failed: string[] }): EmailLogStatus {
  if (sent === 0) return 'failed';
  return failed.length > 0 ? 'partial' : 'sent';
}

/**
 * Records how the send ended. The emails have already gone out, so a failed
 * write is reported, not thrown: throwing would tell the admin the send failed
 * and invite a duplicate send.
 */
export async function finishEmailLog(
  client: Client,
  id: string,
  result: { sent: number; failed: string[] }
) {
  const { error } = await client
    .from('email_logs')
    .update({ status: outcomeStatus(result), recipient_count: result.sent })
    .eq('id', id);
  if (error) console.error('Failed to finish email log:', error);
}
