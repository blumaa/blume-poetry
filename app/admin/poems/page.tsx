'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { ConfirmModal } from '@/components/ConfirmModal';
import { useToast } from '@/components/Toast';
import type { Poem } from '@/lib/supabase/types';
import { SkeletonList } from '@/components/Skeleton';

export default function AdminPoemsPage() {
  const [poems, setPoems] = useState<Poem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<Poem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const searchParams = useSearchParams();
  const statusFilter = searchParams.get('status');
  const { showToast } = useToast();

  const filteredPoems = poems
    .filter((poem) =>
      poem.title.toLowerCase().includes(search.toLowerCase()) ||
      poem.plain_text?.toLowerCase().includes(search.toLowerCase())
    )
    .sort((a, b) => {
      if (a.pinned && !b.pinned) return -1;
      if (!a.pinned && b.pinned) return 1;
      return 0;
    });

  // Show toast from sessionStorage (e.g., after creating/editing a poem)
  useEffect(() => {
    const toastData = sessionStorage.getItem('toast');
    if (toastData) {
      sessionStorage.removeItem('toast');
      try {
        const { message, type } = JSON.parse(toastData);
        showToast(message, type);
      } catch {
        // Invalid toast data, ignore
      }
    }
  }, [showToast]);

  useEffect(() => {
    const supabase = createClient();

    async function fetchPoems() {
      let query = supabase
        .from('poems')
        .select('*')
        .order('published_at', { ascending: false });

      if (statusFilter === 'draft' || statusFilter === 'published') {
        query = query.eq('status', statusFilter);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching poems:', error);
      } else {
        setPoems((data as Poem[]) || []);
      }
      setIsLoading(false);
    }

    fetchPoems();
  }, [statusFilter]);

  const handleTogglePin = async (poem: Poem) => {
    const supabase = createClient();
    const newPinned = !poem.pinned;
    const { error: pinError } = await supabase
      .from('poems')
      .update({ pinned: newPinned })
      .eq('id', poem.id);

    if (pinError) {
      showToast(pinError.message, 'error');
    } else {
      setPoems((current) =>
        current.map((p) => (p.id === poem.id ? { ...p, pinned: newPinned } : p))
      );
      await fetch('/api/admin/revalidate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paths: [] }),
      });
      showToast(newPinned ? `"${poem.title}" pinned` : `"${poem.title}" unpinned`, 'success');
    }
  };

  const handleDeleteClick = (poem: Poem) => {
    setDeleteTarget(poem);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;

    setIsDeleting(true);
    const supabase = createClient();
    const { error: deleteError } = await supabase.from('poems').delete().eq('id', deleteTarget.id);

    if (deleteError) {
      showToast(deleteError.message, 'error');
      setIsDeleting(false);
    } else {
      setPoems((currentPoems) => currentPoems.filter((p) => p.id !== deleteTarget.id));
      await fetch('/api/admin/revalidate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paths: [`/poem/${deleteTarget.slug}`] }),
      });
      showToast(`"${deleteTarget.title}" deleted`, 'success');
      setDeleteTarget(null);
      setIsDeleting(false);
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="mb-4 md:mb-6 space-y-3">
        <div className="flex items-center justify-between">
          <h1 className="text-xl md:text-2xl text-primary">Poems</h1>
          <Link
            href="/admin/poems/new"
            className="px-3 py-1.5 text-sm bg-accent text-white rounded hover:bg-accent-hover transition-colors"
          >
            New Poem
          </Link>
        </div>
        <div className="space-y-3">
          <div className="flex gap-1.5 text-xs md:text-sm">
            <Link
              href="/admin/poems"
              className={`px-2.5 py-1 rounded ${!statusFilter ? 'bg-accent text-white' : 'border border-border text-primary'}`}
            >
              All
            </Link>
            <Link
              href="/admin/poems?status=published"
              className={`px-2.5 py-1 rounded ${statusFilter === 'published' ? 'bg-accent text-white' : 'border border-border text-primary'}`}
            >
              Published
            </Link>
            <Link
              href="/admin/poems?status=draft"
              className={`px-2.5 py-1 rounded ${statusFilter === 'draft' ? 'bg-accent text-white' : 'border border-border text-primary'}`}
            >
              Drafts
            </Link>
          </div>
          <label htmlFor="admin-search-poems" className="sr-only">
            Search poems
          </label>
          <input
            id="admin-search-poems"
            type="text"
            placeholder="Search poems..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full px-3 py-2.5 text-sm border border-border rounded-lg bg-surface text-primary placeholder:text-tertiary focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 md:max-w-xs"
          />
        </div>
      </div>

      {isLoading ? (
        <SkeletonList count={8} />
      ) : poems.length === 0 ? (
        <div className="text-center py-12 text-tertiary">
          No poems found. <Link href="/admin/poems/new" className="text-accent">Create your first poem</Link>
        </div>
      ) : filteredPoems.length === 0 ? (
        <div className="text-center py-12 text-tertiary">
          No poems matching &ldquo;{search}&rdquo;
        </div>
      ) : (
        <>
          {/* Mobile card list */}
          <div className="md:hidden space-y-2">
            {filteredPoems.map((poem) => (
              <div key={poem.id} className="bg-surface rounded-lg border border-border px-4 py-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 min-w-0">
                    {poem.pinned && (
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" className="text-accent flex-shrink-0" aria-label="Pinned">
                        <path d="M16 12V4h1V2H7v2h1v8l-2 2v2h5.2v6h1.6v-6H18v-2l-2-2z" />
                      </svg>
                    )}
                    <Link
                      href={`/poem/${poem.slug}`}
                      className="text-primary hover:text-accent transition-colors text-sm font-medium truncate"
                      target="_blank"
                    >
                      {poem.title}
                    </Link>
                  </div>
                  <span
                    className={`px-1.5 py-0.5 text-[10px] font-medium rounded flex-shrink-0 ${
                      poem.status === 'published'
                        ? 'bg-emerald-100 text-emerald-900 dark:bg-emerald-900/50 dark:text-emerald-100'
                        : 'bg-amber-100 text-amber-900 dark:bg-amber-900/50 dark:text-amber-100'
                    }`}
                  >
                    {poem.status}
                  </span>
                </div>
                <div className="flex items-center justify-between mt-3">
                  <span className="text-xs text-tertiary">
                    {new Date(poem.published_at).toLocaleDateString()}
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleTogglePin(poem)}
                      className={`p-2 rounded transition-colors ${
                        poem.pinned ? 'text-accent' : 'text-tertiary hover:text-accent'
                      }`}
                      aria-label={poem.pinned ? 'Unpin poem' : 'Pin poem'}
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M16 12V4h1V2H7v2h1v8l-2 2v2h5.2v6h1.6v-6H18v-2l-2-2z" />
                      </svg>
                    </button>
                    <Link
                      href={`/admin/poems/${poem.id}/edit`}
                      className="px-4 py-1.5 text-sm bg-accent text-white rounded hover:bg-accent-hover transition-colors"
                    >
                      Edit
                    </Link>
                    <button
                      onClick={() => handleDeleteClick(poem)}
                      className="p-2 text-tertiary hover:text-red-500 rounded transition-colors"
                      aria-label="Delete poem"
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop table */}
          <div className="hidden md:block bg-surface rounded-lg border border-border overflow-hidden">
            <table className="w-full">
              <thead className="bg-surface-secondary">
                <tr>
                  <th className="text-left p-4 font-medium text-primary">Title</th>
                  <th className="text-left p-4 font-medium text-primary">Status</th>
                  <th className="text-left p-4 font-medium text-primary">Published</th>
                  <th className="text-right p-4 font-medium text-primary">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredPoems.map((poem) => (
                  <tr key={poem.id} className="border-t border-border">
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        {poem.pinned && (
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" className="text-accent flex-shrink-0" aria-label="Pinned">
                            <path d="M16 12V4h1V2H7v2h1v8l-2 2v2h5.2v6h1.6v-6H18v-2l-2-2z" />
                          </svg>
                        )}
                        <Link
                          href={`/poem/${poem.slug}`}
                          className="text-primary hover:text-accent transition-colors"
                          target="_blank"
                        >
                          {poem.title}
                        </Link>
                      </div>
                    </td>
                    <td className="p-4">
                      <span
                        className={`px-2 py-1 text-xs font-medium rounded ${
                          poem.status === 'published'
                            ? 'bg-emerald-100 text-emerald-900 dark:bg-emerald-900/50 dark:text-emerald-100'
                            : 'bg-amber-100 text-amber-900 dark:bg-amber-900/50 dark:text-amber-100'
                        }`}
                      >
                        {poem.status}
                      </span>
                    </td>
                    <td className="p-4 text-tertiary">
                      {new Date(poem.published_at).toLocaleDateString()}
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex gap-2 justify-end">
                        <button
                          onClick={() => handleTogglePin(poem)}
                          className={`px-3 py-1 text-sm border rounded transition-colors ${
                            poem.pinned
                              ? 'border-accent text-accent hover:bg-accent/10'
                              : 'border-border text-primary hover:border-accent'
                          }`}
                          aria-label={poem.pinned ? 'Unpin poem' : 'Pin poem'}
                        >
                          {poem.pinned ? 'Unpin' : 'Pin'}
                        </button>
                        <Link
                          href={`/admin/poems/${poem.id}/edit`}
                          className="px-3 py-1 text-sm border border-border rounded hover:border-accent transition-colors text-primary"
                        >
                          Edit
                        </Link>
                        <button
                          onClick={() => handleDeleteClick(poem)}
                          className="px-3 py-1 text-sm border border-red-300 text-red-600 rounded hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* Delete confirmation modal */}
      <ConfirmModal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDeleteConfirm}
        title="Delete Poem"
        message={`Are you sure you want to delete "${deleteTarget?.title}"? This action cannot be undone.`}
        confirmText="Delete"
        variant="danger"
        isLoading={isDeleting}
      />
    </div>
  );
}
