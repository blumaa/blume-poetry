'use client';

import { useState, useEffect, useRef } from 'react';
import { useToast } from '@/components/Toast';
import { createClient } from '@/lib/supabase/client';
import { ConfirmModal } from '@/components/ConfirmModal';
import { Modal } from '@/components/Modal';
import { SkeletonComment } from '@/components/Skeleton';
import { isAdminEmail } from '@/lib/config';

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

function getVisitorId(): string {
  if (typeof window === 'undefined') return '';

  let id = localStorage.getItem('visitor_id');
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem('visitor_id', id);
  }
  return id;
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
  const [isDeleting, setIsDeleting] = useState(false);
  const { showToast } = useToast();

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

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;

    setIsDeleting(true);
    try {
      const res = await fetch(`/api/admin/comments/${deleteTarget.id}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        const data = await res.json();
        showToast(data.error || 'Failed to delete comment', 'error');
        return;
      }

      setComments((prev) => prev.filter((c) => c.id !== deleteTarget.id));
      showToast('Comment deleted', 'success');
      setDeleteTarget(null);
    } catch {
      showToast('Failed to delete comment', 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="mt-8 pt-8 border-t border-border">
      {isLoading ? (
        <SkeletonComment />
      ) : error ? (
        <p className="text-red-600">{error}</p>
      ) : comments.length === 0 ? (
        <p className="text-secondary text-center py-8">No comments yet. Be the first to share your thoughts!</p>
      ) : (
        <div className="space-y-6">
          {comments.map((comment) => (
            <div key={comment.id} className="border-b border-border pb-6 last:border-b-0">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-primary">{comment.author_name}</span>
                  <span className="text-tertiary text-sm">{formatDate(comment.created_at)}</span>
                </div>
                {isAdmin && (
                  <button
                    onClick={() => setDeleteTarget(comment)}
                    className="text-sm text-red-600 hover:text-red-700"
                    aria-label="Delete comment"
                  >
                    Delete
                  </button>
                )}
              </div>
              <p className="text-primary whitespace-pre-wrap">{comment.content}</p>
            </div>
          ))}
        </div>
      )}

      <CommentModal
        isOpen={isModalOpen}
        onClose={() => onModalClose?.()}
        slug={slug}
        onCommentAdded={handleNewComment}
      />

      <ConfirmModal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDeleteConfirm}
        title="Delete Comment"
        message={`Are you sure you want to delete this comment by "${deleteTarget?.author_name}"?`}
        confirmText="Delete"
        variant="danger"
        isLoading={isDeleting}
      />
    </div>
  );
}

interface CommentModalProps {
  isOpen: boolean;
  onClose: () => void;
  slug: string;
  onCommentAdded: (comment: Comment) => void;
}

function CommentModal({ isOpen, onClose, slug, onCommentAdded }: CommentModalProps) {
  const [name, setName] = useState('');
  const [content, setContent] = useState('');
  const [honeypot, setHoneypot] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const formLoadTime = useRef(Date.now());
  const { showToast } = useToast();

  useEffect(() => {
    const savedName = localStorage.getItem('comment_name');
    if (savedName) {
      setName(savedName);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      formLoadTime.current = Date.now();
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim() || !content.trim()) {
      showToast('Please fill in both name and comment', 'error');
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
        showToast(data.error || 'Failed to post comment', 'error');
        return;
      }

      if (data.comment) {
        onCommentAdded(data.comment);
        setContent('');
        showToast('Comment posted!', 'success');
      }
    } catch {
      showToast('Failed to post comment. Please try again.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add a Comment">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="comment-name" className="block text-sm font-medium mb-1 text-primary">
            Name
          </label>
          <input
            id="comment-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your name"
            maxLength={100}
            className="w-full px-3 py-2 border border-border rounded bg-surface text-primary placeholder:text-tertiary focus:outline-none focus:border-accent min-h-[44px]"
          />
        </div>

        <div>
          <label htmlFor="comment-content" className="block text-sm font-medium mb-1 text-primary">
            Comment
          </label>
          <textarea
            id="comment-content"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Share your thoughts..."
            rows={4}
            maxLength={2000}
            className="w-full px-3 py-2 border border-border rounded bg-surface text-primary placeholder:text-tertiary focus:outline-none focus:border-accent resize-y min-h-[100px]"
          />
        </div>

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

        <div className="flex gap-3 justify-end pt-2">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="px-4 py-2 border border-border rounded hover:bg-hover transition-colors text-primary min-h-[44px]"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-4 py-2 bg-accent text-white rounded hover:bg-accent-hover transition-colors disabled:opacity-50 min-h-[44px]"
          >
            {isSubmitting ? 'Posting...' : 'Post Comment'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
