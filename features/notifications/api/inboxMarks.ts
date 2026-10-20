import { createClient } from '@/lib/supabase/client';
import { NO_MARKS, type InboxMarks } from '../inbox';

interface MarksRow {
  last_seen_at: string | null;
  cleared_at: string | null;
}

const toMarks = (row: MarksRow | null): InboxMarks =>
  row ? { lastSeen: row.last_seen_at, clearedAt: row.cleared_at } : NO_MARKS;

/** The signed-in admin's marks; none until the first save. */
export async function fetchInboxMarks(): Promise<InboxMarks> {
  const { data } = await createClient()
    .from('admin_inbox')
    .select('last_seen_at, cleared_at')
    .maybeSingle()
    .throwOnError();
  return toMarks(data);
}

/** Every save marks read up to `lastSeen`; a clear also hides up to `clearedAt`. */
export interface MarksAdvance {
  lastSeen: string;
  clearedAt?: string;
}

/** Moves the marks forward (the server never moves one back); answers the saved marks. */
export async function advanceInboxMarks({ lastSeen, clearedAt }: MarksAdvance): Promise<InboxMarks> {
  const { data } = await createClient()
    .rpc('advance_inbox_marks', { p_last_seen: lastSeen, p_cleared: clearedAt })
    .throwOnError();
  return toMarks(data);
}
