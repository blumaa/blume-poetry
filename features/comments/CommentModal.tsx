'use client';

import { useState, useEffect, useRef } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Button,
  Field,
  Input,
  Modal,
  ModalBody,
  ModalHeader,
  Textarea,
  VisuallyHidden,
  useToast,
} from '@/components/mds';
import { getVisitorId } from '@/lib/visitorId';
import { readStored, writeStored } from '@/lib/browserStorage';
import { queryKeys } from '@/lib/queryKeys';
import { postComment, type Comment, type PostCommentInput } from './api/comments';
import styles from './CommentModal.module.css';

interface CommentModalProps {
  onClose: () => void;
  slug: string;
}

/* Mounted per open (see call site), so initializers run at open time. */
export function CommentModal({ onClose, slug }: CommentModalProps) {
  const queryClient = useQueryClient();
  const [name, setName] = useState(() => readStored('commentName') ?? '');
  const [content, setContent] = useState('');
  const [honeypot, setHoneypot] = useState('');
  // Spam check: server rejects submits too soon after the form appeared.
  const formLoadTime = useRef(0);
  const { toast } = useToast();

  useEffect(() => {
    formLoadTime.current = Date.now();
  }, []);

  /* Deterministic: the comment appears only once the server has saved it,
     taken from the server's answer (no refetch). */
  const postMutation = useMutation({
    mutationFn: (input: PostCommentInput) => postComment(slug, input),
    onSuccess: (comment) => {
      queryClient.setQueryData<Comment[]>(queryKeys.poem.comments(slug), (current) => [
        comment,
        ...(current ?? []),
      ]);
      toast({ title: 'Comment posted!', tone: 'success' });
      onClose();
    },
    onError: (error) => {
      toast({
        title: error instanceof Error ? error.message : 'Failed to post comment. Please try again.',
        tone: 'danger',
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim() || !content.trim()) {
      toast({ title: 'Please fill in both name and comment', tone: 'danger' });
      return;
    }

    writeStored('commentName', name.trim());

    postMutation.mutate({
      visitorId: getVisitorId(),
      authorName: name.trim(),
      content: content.trim(),
      honeypot,
      timestamp: formLoadTime.current,
    });
  };

  return (
    <Modal open onClose={onClose} label="Add a Comment">
      <ModalHeader>Add a Comment</ModalHeader>
      <ModalBody>
      <form onSubmit={handleSubmit} className={styles.form}>
        <Field label="Name">
          <Input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your name"
            maxLength={100}
          />
        </Field>

        <Field label="Comment">
          <Textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Share your thoughts..."
            rows={4}
            maxLength={2000}
            showCount
          />
        </Field>

        {/* Honeypot field */}
        <VisuallyHidden as="div" aria-hidden="true">
          <label htmlFor="website">Website</label>
          <input
            id="website"
            type="text"
            name="website"
            value={honeypot}
            onChange={(e) => setHoneypot(e.target.value)}
            tabIndex={-1}
            autoComplete="off"
          />
        </VisuallyHidden>

        <div className={styles.formActions}>
          <Button type="button" variant="secondary" onClick={onClose} disabled={postMutation.isPending}>
            Cancel
          </Button>
          <Button type="submit" loading={postMutation.isPending}>
            {postMutation.isPending ? 'Posting...' : 'Post Comment'}
          </Button>
        </div>
      </form>
      </ModalBody>
    </Modal>
  );
}
