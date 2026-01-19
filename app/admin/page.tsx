'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useToast } from '@/components/Toast';

export default function AdminDashboard() {
  const [stats, setStats] = useState({ poems: 0, subscribers: 0, drafts: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const { showToast } = useToast();

  useEffect(() => {
    const supabase = createClient();

    async function fetchStats() {
      const [poemsResult, subscribersResult, draftsResult] = await Promise.all([
        supabase.from('poems').select('*', { count: 'exact', head: true }),
        supabase.from('subscribers').select('*', { count: 'exact', head: true }).eq('status', 'active'),
        supabase.from('poems').select('*', { count: 'exact', head: true }).eq('status', 'draft'),
      ]);

      setStats({
        poems: poemsResult.count || 0,
        subscribers: subscribersResult.count || 0,
        drafts: draftsResult.count || 0,
      });
      setIsLoading(false);
    }

    fetchStats();
  }, []);

  const statCards = [
    { label: 'Total Poems', value: stats.poems, href: '/admin/poems' },
    { label: 'Drafts', value: stats.drafts, href: '/admin/poems?status=draft' },
    { label: 'Subscribers', value: stats.subscribers, href: '/admin/subscribers' },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl text-[var(--text-primary)]">Dashboard</h1>
        <Link
          href="/admin/poems/new"
          className="px-4 py-2 bg-[var(--accent)] text-white rounded hover:bg-[var(--accent-hover)] transition-colors"
        >
          New Poem
        </Link>
      </div>

      {isLoading ? (
        <div className="text-[var(--text-tertiary)]">Loading stats...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {statCards.map((card) => (
            <Link
              key={card.label}
              href={card.href}
              className="p-6 bg-[var(--bg-primary)] rounded-lg border border-[var(--border)] hover:border-[var(--accent)] transition-colors"
            >
              <div className="text-3xl font-semibold mb-1 text-[var(--text-primary)]">{card.value}</div>
              <div className="text-[var(--text-tertiary)]">{card.label}</div>
            </Link>
          ))}
        </div>
      )}

      <div className="mt-8">
        <h2 className="text-lg mb-4 text-[var(--text-primary)]">Quick Actions</h2>
        <div className="flex flex-wrap gap-4">
          <Link
            href="/admin/poems/new"
            className="px-4 py-2 border border-[var(--border)] rounded hover:border-[var(--accent)] transition-colors text-[var(--text-primary)]"
          >
            Create New Poem
          </Link>
          <Link
            href="/admin/subscribers/send"
            className="px-4 py-2 border border-[var(--border)] rounded hover:border-[var(--accent)] transition-colors text-[var(--text-primary)]"
          >
            Send Newsletter
          </Link>
          <Link
            href="/admin/analytics"
            className="px-4 py-2 border border-[var(--border)] rounded hover:border-[var(--accent)] transition-colors text-[var(--text-primary)]"
          >
            Email Analytics
          </Link>
          <button
            onClick={() => showToast('Test toast - this should be visible!', 'success')}
            className="px-4 py-2 border border-green-500 rounded hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors text-green-600"
          >
            Test Toast
          </button>
        </div>
      </div>
    </div>
  );
}
