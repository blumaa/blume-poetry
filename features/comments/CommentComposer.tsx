'use client';

import { useEffect, useRef, useState, type SubmitEvent, type RefObject } from 'react';
import { Button, Field, Inline, Input, Stack, Text, Textarea, VisuallyHidden } from '@/components/mds';
import { Icon } from '@/components/icons';
import { clearStored, writeStored } from '@/lib/browserStorage';
import { useStored } from '@/lib/useStored';
import type { PostCommentInput } from './api/comments';
import styles from './CommentComposer.module.css';

export type CommentDraft = Omit<PostCommentInput, 'visitorId' | 'parentId'>;

export interface CommentComposerProps {
  /** Resolves true once saved; the field then empties. */
  onSend: (draft: CommentDraft) => Promise<boolean>;
  sending: boolean;
  /** Present when answering a comment: the field opens under it, cursor in. */
  reply?: { name: string; onCancel: () => void };
  fieldRef?: RefObject<HTMLTextAreaElement | null>;
}

export function CommentComposer({ onSend, sending, reply, fieldRef }: CommentComposerProps) {
  const storedName = useStored('commentName');
  const storedEmail = useStored('commentEmail');
  const [nameDraft, setNameDraft] = useState<string | null>(null);
  const [emailDraft, setEmailDraft] = useState<string | null>(null);
  const [body, setBody] = useState('');
  const [honeypot, setHoneypot] = useState('');
  const [focused, setFocused] = useState(false);
  // Spam check: the server rejects a send too soon after the field appeared.
  const shownAt = useRef(0);
  const own = useRef<HTMLTextAreaElement>(null);
  const field = fieldRef ?? own;
  const replying = reply !== undefined;

  useEffect(() => {
    shownAt.current = Date.now();
  }, []);

  useEffect(() => {
    if (replying) field.current?.focus();
  }, [replying, field]);

  const nameValue = nameDraft ?? storedName ?? '';
  const name = nameValue.trim();
  const emailValue = emailDraft ?? storedEmail ?? '';
  const email = emailValue.trim();
  const text = body.trim();
  // The poem's field sits as one line until it is used.
  const open = replying || focused || body !== '';
  const label = replying ? 'Write a reply' : 'Add a comment';

  const submit = async (event: SubmitEvent) => {
    event.preventDefault();
    if (text === '' || name === '' || sending) return;

    writeStored('commentName', name);
    if (email === '') clearStored('commentEmail');
    else writeStored('commentEmail', email);
    if (await onSend({ authorName: name, content: text, email, honeypot, timestamp: shownAt.current })) {
      setBody('');
    }
  };

  return (
    <Stack
      as="form"
      onSubmit={submit}
      onFocus={() => setFocused(true)}
      autoComplete="off"
      aria-busy={sending || undefined}
    >
      {reply !== undefined && (
        <Inline justify="between">
          <Text variant="meta">Replying to {reply.name}</Text>

          <Button
            variant="ghost"
            size="sm"
            iconOnly
            iconLeft={<Icon name="close" />}
            aria-label="Stop replying"
            disabled={sending}
            onClick={reply.onCancel}
          />
        </Inline>
      )}

      <Textarea
        ref={field}
        rows={open ? 3 : 1}
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder={label}
        aria-label={label}
        maxLength={2000}
        disabled={sending}
      />

      {open && (
        <Field label="Name">
          <Input
            type="text"
            value={nameValue}
            onChange={(e) => setNameDraft(e.target.value)}
            placeholder="Your name"
            maxLength={100}
            disabled={sending}
          />
        </Field>
      )}

      {open && (
        <Field label="Email (optional)" hint="Only to tell you when someone replies. Never shown.">
          <Input
            type="email"
            value={emailValue}
            onChange={(e) => setEmailDraft(e.target.value)}
            placeholder="you@example.com"
            maxLength={254}
            disabled={sending}
          />
        </Field>
      )}

      <VisuallyHidden as="div" aria-hidden="true">
        <input
          type="text"
          name="website"
          aria-label="Website"
          value={honeypot}
          onChange={(e) => setHoneypot(e.target.value)}
          tabIndex={-1}
          autoComplete="off"
        />
      </VisuallyHidden>

      {open && (
        <Button
          type="submit"
          className={styles.send}
          disabled={text === '' || name === ''}
          loading={sending}
        >
          Send
        </Button>
      )}
    </Stack>
  );
}
