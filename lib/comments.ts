import { getCachedCommentClient } from './supabase/anon';
import type { CommentRow } from './supabase/types';

/** What a reader sees of a comment. Never the email or visitor id. */
export const COMMENT_COLUMNS = 'id, parent_id, author_name, content, created_at, removed_at';

/** A removed comment comes back with empty name and words and `removed_at` set. */
export type Comment = Pick<
  CommentRow,
  'id' | 'parent_id' | 'author_name' | 'content' | 'created_at' | 'removed_at'
>;

/** A poem's comments in written order (a reply never precedes what it
    answers), removed ones as tombstones. Cached; comment writes expire it. */
export async function getPoemComments(poemId: string): Promise<Comment[]> {
  const { data } = await getCachedCommentClient()
    .from('comments')
    .select(COMMENT_COLUMNS)
    .eq('poem_id', poemId)
    .order('created_at', { ascending: true })
    .throwOnError();
  return data;
}
