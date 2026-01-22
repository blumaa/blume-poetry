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

  const filteredPoems = poems.filter((poem) =>
    poem.title.toLowerCase().includes(search.toLowerCase()) ||
    poem.plain_text?.toLowerCase().includes(search.toLowerCase())
  );

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
      showToast(`"${deleteTarget.title}" deleted`, 'success');
      setDeleteTarget(null);
      setIsDeleting(false);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl text-primary">Poems</h1>
          <div className="flex gap-2 text-sm">
            <Link
              href="/admin/poems"
              className={`px-3 py-1 rounded ${!statusFilter ? 'bg-accent text-white' : 'border border-border text-primary'}`}
            >
              All
            </Link>
            <Link
              href="/admin/poems?status=published"
              className={`px-3 py-1 rounded ${statusFilter === 'published' ? 'bg-accent text-white' : 'border border-border text-primary'}`}
            >
              Published
            </Link>
            <Link
              href="/admin/poems?status=draft"
              className={`px-3 py-1 rounded ${statusFilter === 'draft' ? 'bg-accent text-white' : 'border border-border text-primary'}`}
            >
              Drafts
            </Link>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <label htmlFor="admin-search-poems" className="sr-only">
            Search poems
          </label>
          <input
            id="admin-search-poems"
            type="text"
            placeholder="Search poems..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="px-3 py-2 text-sm border border-border rounded bg-surface text-primary placeholder:text-tertiary focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"
          />
          <Link
            href="/admin/poems/new"
            className="px-4 py-2 bg-accent text-white rounded hover:bg-accent-hover transition-colors"
          >
            New Poem
          </Link>
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
        <div className="bg-surface rounded-lg border border-border overflow-hidden">
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
                    <Link
                      href={`/poem/${poem.slug}`}
                      className="text-primary hover:text-accent transition-colors"
                      target="_blank"
                    >
                      {poem.title}
                    </Link>
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
