import type { Comment } from './api/comments';

interface CommentBase {
  id: string;
  replies?: ThreadComment[];
}

export interface LiveComment extends CommentBase {
  removed?: false;
  author: string;
  body: string;
  createdAt: string;
}

export interface RemovedComment extends CommentBase {
  removed: true;
}

export type ThreadComment = LiveComment | RemovedComment;

/* Rows in written order become a tree. A removed comment stays as a tombstone
   only while something live hangs from it; a reply whose parent is absent is
   dropped. */
export function buildThread(comments: readonly Comment[]): ThreadComment[] {
  const nodes = new Map<string, ThreadComment>(comments.map((c) => [c.id, node(c)]));
  const roots: ThreadComment[] = [];

  for (const comment of comments) {
    const self = nodes.get(comment.id)!;
    if (comment.parent_id === null) {
      roots.push(self);
      continue;
    }
    const parent = nodes.get(comment.parent_id);
    if (parent) parent.replies = [...(parent.replies ?? []), self];
  }

  return prune(roots);
}

export function liveCount(comments: readonly Comment[]): number {
  return comments.filter((c) => c.removed_at === null).length;
}

function node(comment: Comment): ThreadComment {
  if (comment.removed_at !== null) return { id: comment.id, removed: true };
  return {
    id: comment.id,
    author: comment.author_name,
    body: comment.content,
    createdAt: comment.created_at,
  };
}

function prune(nodes: readonly ThreadComment[]): ThreadComment[] {
  return nodes.flatMap((n) => {
    const replies = prune(n.replies ?? []);
    if (n.removed === true && replies.length === 0) return [];
    const rest = { ...n };
    delete rest.replies;
    return [replies.length === 0 ? rest : { ...rest, replies }];
  });
}
