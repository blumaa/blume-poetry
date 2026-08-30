'use client';

import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { Button, ConfirmDialog, Field, Input, Modal, ModalBody, ModalHeader, Textarea, useToast } from '@/components/mds';
import { SkeletonComment } from '@/components/Skeleton';
import { isAdminEmail } from '@/lib/config';
import { getVisitorId } from '@/lib/visitorId';
import styles from './CommentSection.module.css';

interface Comment {
  id: string;
  author_name: string;
  content: string;
  created_at: string;
}

interface CommentSectionProps {
  slug: string;
  isModalOpen?: boolean;
  onModalClose?: () => void;
}

async function fetchComments(slug: string): Promise<Comment[]> {
  const res = await fetch(`/api/poems/${slug}/comments`);
  if (!res.ok) throw new Error('Failed to load comments');
  const data = await res.json();
  return data.comments || [];
}

async function fetchAuthUser() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

interface PostCommentInput {
  visitorId: string;
  authorName: string;
  content: string;
  honeypot: string;
  timestamp: number;
}

async function postComment(slug: string, input: PostCommentInput): Promise<void> {
  const res = await fetch(`/api/poems/${slug}/comments`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || 'Failed to post comment. Please try again.');
  }
}

async function deleteComment(id: string): Promise<void> {
  const res = await fetch(`/api/admin/comments/${id}`, {
    method: 'DELETE',
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({ error: 'Failed to delete comment' }));
    throw new Error(data.error || 'Failed to delete comment');
  }
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function CommentIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  );
}

export function CommentSection({ slug, isModalOpen = false, onModalClose }: CommentSectionProps) {
  const queryClient = useQueryClient();
  const [deleteTarget, setDeleteTarget] = useState<Comment | null>(null);
  const { toast } = useToast();
  const commentsKey = ['poems', slug, 'comments'];

  const { data: comments, isPending, isError } = useQuery({
    queryKey: commentsKey,
    queryFn: () => fetchComments(slug),
  });

  const { data: authUser } = useQuery({
    queryKey: ['auth', 'user'],
    queryFn: fetchAuthUser,
  });
  const isAdmin = isAdminEmail(authUser?.email);

  /* Deterministic: the comment disappears only after the server confirms
     the delete and the refetch returns. */
  const deleteMutation = useMutation({
    mutationFn: (target: Comment) => deleteComment(target.id),
    onSuccess: () => toast({ title: 'Comment deleted', tone: 'success' }),
    onSettled: () => queryClient.invalidateQueries({ queryKey: commentsKey }),
  });

  return (
    <div>
      {isPending ? (
        <div className={styles.divider}>
          <SkeletonComment />
        </div>
      ) : isError ? (
        <div className={styles.divider}>
          <p className={styles.errorText}>Failed to load comments</p>
        </div>
      ) : comments.length > 0 ? (
        <div className={styles.commentsList}>
          {comments.map((comment) => (
            <div key={comment.id} className={styles.commentItem}>
              <div className={styles.commentHeader}>
                <div className={styles.commentMeta}>
                  <span className={styles.author}>{comment.author_name}</span>
                  <span className={styles.commentDate}>{formatDate(comment.created_at)}</span>
                </div>
                {isAdmin && (
                  <button
                    onClick={() => setDeleteTarget(comment)}
                    className={styles.deleteButton}
                    aria-label="Delete comment"
                  >
                    Delete
                  </button>
                )}
              </div>
              <p className={styles.commentContent}>{comment.content}</p>
            </div>
          ))}
        </div>
      ) : null}

      {/* Mounted only while open so state (saved name, spam timer) seeds
          fresh on each open via initializers instead of effects. */}
      {isModalOpen && (
        <CommentModal onClose={() => onModalClose?.()} slug={slug} />
      )}

      <ConfirmDialog
        target={deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={(target) => deleteMutation.mutateAsync(target)}
        title="Delete Comment"
        description={`Are you sure you want to delete this comment by "${deleteTarget?.author_name}"?`}
        confirmLabel="Delete"
        cancelLabel="Cancel"
        tone="danger"
      />
    </div>
  );
}

interface CommentModalProps {
  onClose: () => void;
  slug: string;
}

/* Mounted per open (see call site), so initializers run at open time. */
function CommentModal({ onClose, slug }: CommentModalProps) {
  const queryClient = useQueryClient();
  const [name, setName] = useState(() => localStorage.getItem('comment_name') ?? '');
  const [content, setContent] = useState('');
  const [honeypot, setHoneypot] = useState('');
  // Spam check: server rejects submits too soon after the form appeared.
  const formLoadTime = useRef(0);
  const { toast } = useToast();

  useEffect(() => {
    formLoadTime.current = Date.now();
  }, []);

  /* Deterministic: the new comment appears only via the refetch after the
     server accepts it; the modal closes once that refetch settles. */
  const postMutation = useMutation({
    mutationFn: (input: PostCommentInput) => postComment(slug, input),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['poems', slug, 'comments'] });
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

    localStorage.setItem('comment_name', name.trim());

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
        <div className="sr-only" aria-hidden="true">
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
        </div>

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
