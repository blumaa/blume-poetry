'use client';

import { useState, useEffect, useRef } from 'react';
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
  const [comments, setComments] = useState<Comment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Comment | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    const supabase = createClient();

    supabase.auth.getUser().then(({ data: { user } }) => {
      setIsAdmin(isAdminEmail(user?.email));
    });
  }, []);

  useEffect(() => {
    fetch(`/api/poems/${slug}/comments`)
      .then((res) => res.json())
      .then((data) => {
        setComments(data.comments || []);
        setIsLoading(false);
      })
      .catch(() => {
        setError('Failed to load comments');
        setIsLoading(false);
      });
  }, [slug]);

  const handleNewComment = (comment: Comment) => {
    setComments((prev) => [comment, ...prev]);
    onModalClose?.();
  };

  const handleDeleteConfirm = async (target: Comment) => {
    const res = await fetch(`/api/admin/comments/${target.id}`, {
      method: 'DELETE',
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({ error: 'Failed to delete comment' }));
      throw new Error(data.error || 'Failed to delete comment');
    }

    setComments((prev) => prev.filter((c) => c.id !== target.id));
    toast({ title: 'Comment deleted', tone: 'success' });
  };

  return (
    <div>
      {isLoading ? (
        <div className={styles.divider}>
          <SkeletonComment />
        </div>
      ) : error ? (
        <div className={styles.divider}>
          <p className={styles.errorText}>{error}</p>
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
        <CommentModal
          onClose={() => onModalClose?.()}
          slug={slug}
          onCommentAdded={handleNewComment}
        />
      )}

      <ConfirmDialog
        target={deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDeleteConfirm}
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
  onCommentAdded: (comment: Comment) => void;
}

/* Mounted per open (see call site), so initializers run at open time. */
function CommentModal({ onClose, slug, onCommentAdded }: CommentModalProps) {
  const [name, setName] = useState(() => localStorage.getItem('comment_name') ?? '');
  const [content, setContent] = useState('');
  const [honeypot, setHoneypot] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  // Spam check: server rejects submits too soon after the form appeared.
  const formLoadTime = useRef(0);
  const { toast } = useToast();

  useEffect(() => {
    formLoadTime.current = Date.now();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim() || !content.trim()) {
      toast({ title: 'Please fill in both name and comment', tone: 'danger' });
      return;
    }

    setIsSubmitting(true);
    localStorage.setItem('comment_name', name.trim());

    const visitorId = getVisitorId();

    try {
      const res = await fetch(`/api/poems/${slug}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          visitorId,
          authorName: name.trim(),
          content: content.trim(),
          honeypot,
          timestamp: formLoadTime.current,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast({ title: data.error || 'Failed to post comment', tone: 'danger' });
        return;
      }

      if (data.comment) {
        onCommentAdded(data.comment);
        setContent('');
        toast({ title: 'Comment posted!', tone: 'success' });
      }
    } catch {
      toast({ title: 'Failed to post comment. Please try again.', tone: 'danger' });
    } finally {
      setIsSubmitting(false);
    }
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
          <Button type="button" variant="secondary" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" loading={isSubmitting}>
            {isSubmitting ? 'Posting...' : 'Post Comment'}
          </Button>
        </div>
      </form>
      </ModalBody>
    </Modal>
  );
}
