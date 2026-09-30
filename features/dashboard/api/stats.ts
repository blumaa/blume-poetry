import { createClient } from '@/lib/supabase/client';

export interface DashboardStats {
  poems: number;
  subscribers: number;
  drafts: number;
  comments: number;
}

/** Admin dashboard counts. Any failed count throws rather than reading as zero. */
export async function fetchStats(): Promise<DashboardStats> {
  const supabase = createClient();
  const head = { count: 'exact', head: true } as const;

  const [poems, subscribers, drafts, comments] = await Promise.all([
    supabase.from('poems').select('*', head).throwOnError(),
    supabase.from('subscribers').select('*', head).eq('status', 'active').throwOnError(),
    supabase.from('poems').select('*', head).eq('status', 'draft').throwOnError(),
    supabase.from('comments').select('*', head).throwOnError(),
  ]);

  return {
    poems: poems.count ?? 0,
    subscribers: subscribers.count ?? 0,
    drafts: drafts.count ?? 0,
    comments: comments.count ?? 0,
  };
}
