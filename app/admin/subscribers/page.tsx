'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { ConfirmModal } from '@/components/ConfirmModal';
import { useToast } from '@/components/Toast';
import type { Subscriber } from '@/lib/supabase/types';

export default function AdminSubscribersPage() {
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'active' | 'unsubscribed'>('active');
  const [deleteTarget, setDeleteTarget] = useState<Subscriber | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const { showToast } = useToast();

  useEffect(() => {
    const supabase = createClient();

    async function fetchSubscribers() {
      let query = supabase
        .from('subscribers')
        .select('*')
        .order('subscribed_at', { ascending: false });

      if (filter !== 'all') {
        query = query.eq('status', filter);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching subscribers:', error);
      } else {
        setSubscribers((data as Subscriber[]) || []);
      }
      setIsLoading(false);
    }

    fetchSubscribers();
  }, [filter]);

  const handleDeleteClick = (subscriber: Subscriber) => {
    setDeleteTarget(subscriber);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;

    setIsDeleting(true);
    const supabase = createClient();
    const { error: deleteError } = await supabase.from('subscribers').delete().eq('id', deleteTarget.id);

    if (deleteError) {
      showToast(deleteError.message, 'error');
      setIsDeleting(false);
    } else {
      setSubscribers((current) => current.filter((s) => s.id !== deleteTarget.id));
      showToast(`"${deleteTarget.email}" deleted`, 'success');
      setDeleteTarget(null);
      setIsDeleting(false);
    }
  };

  const handleExportCSV = () => {
    const csv = [
      'Email,Status,Subscribed At,Verified',
      ...subscribers.map((s) =>
        `${s.email},${s.status},${s.subscribed_at},${s.verified}`
      ),
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `subscribers-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showToast(`Exported ${subscribers.length} subscribers`, 'success');
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl text-[var(--text-primary)]">Subscribers</h1>
          <div className="flex gap-2 text-sm">
            <button
              onClick={() => setFilter('active')}
              className={`px-3 py-1 rounded ${filter === 'active' ? 'bg-[var(--accent)] text-white' : 'border border-[var(--border)] text-[var(--text-primary)]'}`}
            >
              Active
            </button>
            <button
              onClick={() => setFilter('unsubscribed')}
              className={`px-3 py-1 rounded ${filter === 'unsubscribed' ? 'bg-[var(--accent)] text-white' : 'border border-[var(--border)] text-[var(--text-primary)]'}`}
            >
              Unsubscribed
            </button>
            <button
              onClick={() => setFilter('all')}
              className={`px-3 py-1 rounded ${filter === 'all' ? 'bg-[var(--accent)] text-white' : 'border border-[var(--border)] text-[var(--text-primary)]'}`}
            >
              All
            </button>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleExportCSV}
            className="px-4 py-2 border border-[var(--border)] rounded hover:border-[var(--accent)] transition-colors text-[var(--text-primary)]"
          >
            Export CSV
          </button>
          <Link
            href="/admin/subscribers/send"
            className="px-4 py-2 bg-[var(--accent)] text-white rounded hover:bg-[var(--accent-hover)] transition-colors"
          >
            Send Newsletter
          </Link>
        </div>
      </div>

      {isLoading ? (
        <div className="text-[var(--text-tertiary)]">Loading subscribers...</div>
      ) : subscribers.length === 0 ? (
        <div className="text-center py-12 text-[var(--text-tertiary)]">
          No subscribers found.
        </div>
      ) : (
        <div className="bg-[var(--bg-primary)] rounded-lg border border-[var(--border)] overflow-hidden">
          <table className="w-full">
            <thead className="bg-[var(--bg-secondary)]">
              <tr>
                <th className="text-left p-4 font-medium text-[var(--text-primary)]">Email</th>
                <th className="text-left p-4 font-medium text-[var(--text-primary)]">Status</th>
                <th className="text-left p-4 font-medium text-[var(--text-primary)]">Subscribed</th>
                <th className="text-left p-4 font-medium text-[var(--text-primary)]">Verified</th>
                <th className="text-right p-4 font-medium text-[var(--text-primary)]">Actions</th>
              </tr>
            </thead>
            <tbody>
              {subscribers.map((subscriber) => (
                <tr key={subscriber.id} className="border-t border-[var(--border)]">
                  <td className="p-4 text-[var(--text-primary)]">{subscriber.email}</td>
                  <td className="p-4">
                    <span
                      className={`px-2 py-1 text-xs font-medium rounded ${
                        subscriber.status === 'active'
                          ? 'bg-emerald-100 text-emerald-900 dark:bg-emerald-900/50 dark:text-emerald-100'
                          : 'bg-zinc-200 text-zinc-800 dark:bg-zinc-700 dark:text-zinc-100'
                      }`}
                    >
                      {subscriber.status}
                    </span>
                  </td>
                  <td className="p-4 text-[var(--text-tertiary)]">
                    {new Date(subscriber.subscribed_at).toLocaleDateString()}
                  </td>
                  <td className="p-4">
                    {subscriber.verified ? (
                      <span className="text-emerald-600 dark:text-emerald-300 font-medium">Yes</span>
                    ) : (
                      <span className="text-[var(--text-tertiary)]">No</span>
                    )}
                  </td>
                  <td className="p-4 text-right">
                    <button
                      onClick={() => handleDeleteClick(subscriber)}
                      className="px-3 py-1 text-sm border border-red-300 text-red-600 rounded hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="p-4 bg-[var(--bg-secondary)] border-t border-[var(--border)] text-sm text-[var(--text-tertiary)]">
            {subscribers.length} subscriber{subscribers.length !== 1 ? 's' : ''}
          </div>
        </div>
      )}

      {/* Delete confirmation modal */}
      <ConfirmModal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDeleteConfirm}
        title="Delete Subscriber"
        message={`Are you sure you want to delete "${deleteTarget?.email}"? This action cannot be undone.`}
        confirmText="Delete"
        variant="danger"
        isLoading={isDeleting}
      />
    </div>
  );
}
