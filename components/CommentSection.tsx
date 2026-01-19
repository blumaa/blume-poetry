'use client';

import { useState, useEffect, useRef } from 'react';
import { useToast } from '@/components/Toast';
import { createClient } from '@/lib/supabase/client';
import { ConfirmModal } from '@/components/ConfirmModal';

interface Comment {
  id: string;
  author_name: string;
  content: string;
  created_at: string;
}

interface CommentSectionProps {
  slug: string;
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

export function CommentSection({ slug }: CommentSectionProps) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Comment | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const { showToast } = useToast();

  useEffect(() => {
    // Check if user is admin
    const supabase = createClient();
    const adminEmail = process.env.NEXT_PUBLIC_ADMIN_EMAIL || 'desmond.blume@gmail.com';

    supabase.auth.getUser().then(({ data: { user } }) => {
      setIsAdmin(user?.email === adminEmail);
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
    <div className="mt-8 pt-8 border-t border-[var(--border)]">
      <h2 className="text-lg font-medium mb-6 text-[var(--text-primary)]">Comments</h2>

      <CommentForm slug={slug} onCommentAdded={handleNewComment} />

      {isLoading ? (
        <p className="text-[var(--text-secondary)] mt-6">Loading comments...</p>
      ) : error ? (
        <p className="text-red-600 mt-6">{error}</p>
      ) : comments.length === 0 ? (
        <p className="text-[var(--text-secondary)] mt-6">No comments yet. Be the first to share your thoughts!</p>
      ) : (
        <div className="space-y-6 mt-8">
          {comments.map((comment) => (
            <div key={comment.id} className="border-b border-[var(--border)] pb-6 last:border-b-0">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-[var(--text-primary)]">{comment.author_name}</span>
                  <span className="text-[var(--text-tertiary)] text-sm">{formatDate(comment.created_at)}</span>
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
              <p className="text-[var(--text-primary)] whitespace-pre-wrap">{comment.content}</p>
            </div>
          ))}
        </div>
      )}

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

interface CommentFormProps {
  slug: string;
  onCommentAdded: (comment: Comment) => void;
}

function CommentForm({ slug, onCommentAdded }: CommentFormProps) {
  const [name, setName] = useState('');
  const [content, setContent] = useState('');
  const [honeypot, setHoneypot] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const formLoadTime = useRef(Date.now());
  const { showToast } = useToast();

  // Remember name for returning visitors
  useEffect(() => {
    const savedName = localStorage.getItem('comment_name');
    if (savedName) {
      setName(savedName);
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim() || !content.trim()) {
      showToast('Please fill in both name and comment', 'error');
      return;
    }

    setIsSubmitting(true);

    // Save name for next time
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
        formLoadTime.current = Date.now(); // Reset for next comment
        showToast('Comment posted!', 'success');
      }
    } catch {
      showToast('Failed to post comment. Please try again.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="comment-name" className="block text-sm font-medium mb-1 text-[var(--text-primary)]">
          Name
        </label>
        <input
          id="comment-name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Your name"
          maxLength={100}
          className="w-full px-4 py-3 border border-[var(--border)] rounded bg-[var(--bg-primary)] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/20 min-h-[44px]"
        />
      </div>

      <div>
        <label htmlFor="comment-content" className="block text-sm font-medium mb-1 text-[var(--text-primary)]">
          Comment
        </label>
        <textarea
          id="comment-content"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Share your thoughts..."
          rows={4}
          maxLength={2000}
          className="w-full px-4 py-3 border border-[var(--border)] rounded bg-[var(--bg-primary)] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/20 resize-y min-h-[100px]"
        />
      </div>

      {/* Honeypot field - hidden from users, bots fill it out */}
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

      <button
        type="submit"
        disabled={isSubmitting}
        className="px-6 py-3 bg-[var(--accent)] text-white rounded hover:bg-[var(--accent-hover)] transition-colors disabled:opacity-50 min-h-[44px] font-medium"
      >
        {isSubmitting ? 'Posting...' : 'Post Comment'}
      </button>
    </form>
  );
}
