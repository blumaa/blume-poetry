import { createClient } from '@/lib/supabase/client';

export interface Notification {
  id: string;
  type: 'comment' | 'like';
  created_at: string;
  poem: {
    slug: string;
    title: string;
  };
  // Comment-specific
  author_name?: string;
  content?: string;
}

const LIMIT = 20;

type PoemRef = Notification['poem'];

/* Supabase types a to-one join as object or array depending on the relation
   metadata; normalise to one poem or none. */
function onePoem(poem: PoemRef | PoemRef[] | null): PoemRef | null {
  return Array.isArray(poem) ? (poem[0] ?? null) : poem;
}

/** Latest comments and likes, merged newest first. */
export async function fetchActivity(): Promise<Notification[]> {
  const supabase = createClient();

  const [commentsResult, likesResult] = await Promise.all([
    supabase
      .from('comments')
      .select('id, author_name, content, created_at, poem:poems(slug, title)')
      .order('created_at', { ascending: false })
      .limit(LIMIT),
    supabase
      .from('likes')
      .select('id, created_at, poem:poems(slug, title)')
      .order('created_at', { ascending: false })
      .limit(LIMIT),
  ]);

  if (commentsResult.error) throw commentsResult.error;
  if (likesResult.error) throw likesResult.error;

  const commentNotifs = commentsResult.data.flatMap((c): Notification[] => {
    const poem = onePoem(c.poem);
    return poem
      ? [{
          id: `comment-${c.id}`,
          type: 'comment',
          created_at: c.created_at,
          poem,
          author_name: c.author_name,
          content: c.content,
        }]
      : [];
  });

  const likeNotifs = likesResult.data.flatMap((l): Notification[] => {
    const poem = onePoem(l.poem);
    return poem ? [{ id: `like-${l.id}`, type: 'like', created_at: l.created_at, poem }] : [];
  });

  // A row whose poem was deleted has no poem to link to, so it is skipped above.
  return [...commentNotifs, ...likeNotifs]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, LIMIT);
}
