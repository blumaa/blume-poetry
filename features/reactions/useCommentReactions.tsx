'use client';

import { useState, type ReactNode } from 'react';
import { ReactionBar } from './ReactionBar';
import { ReactionPickerSheet } from './ReactionPickerSheet';
import { usePoemReactions, useToggleReaction } from './useReactions';

const NONE = { counts: [], mine: [] } as const;

export interface CommentReactionControls {
  /** The row of reactions under one comment. */
  bar: (comment: { id: string; author: string }) => ReactNode;
  /** The one picker for the whole thread. */
  picker: ReactNode;
}

/** Reactions for a poem's thread: one query, one toggle, one picker sheet. */
export function useCommentReactions(slug: string): CommentReactionControls {
  const [pickingFor, setPickingFor] = useState<string | null>(null);
  const { data } = usePoemReactions(slug);
  const toggle = useToggleReaction(slug);

  const of = (commentId: string) => data?.[commentId] ?? NONE;
  const pendingOn = toggle.isPending ? toggle.variables.commentId : null;

  const react = (commentId: string, emoji: string) =>
    toggle.mutate({ commentId, emoji }, { onSuccess: () => setPickingFor(null) });

  return {
    bar: ({ id, author }) => (
      <ReactionBar
        label={`Reactions to ${author}’s comment`}
        reactions={of(id).counts}
        mine={of(id).mine}
        onSelect={(emoji) => react(id, emoji)}
        onAdd={() => setPickingFor(id)}
        pending={pendingOn === id}
      />
    ),
    picker: (
      <ReactionPickerSheet
        open={pickingFor !== null}
        onClose={() => setPickingFor(null)}
        onSelect={(emoji) => pickingFor !== null && react(pickingFor, emoji)}
        selected={pickingFor === null ? [] : of(pickingFor).mine}
        pending={pendingOn !== null && pendingOn === pickingFor}
      />
    ),
  };
}
