'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { SkeletonCard } from '@/components/Skeleton';

export default function AdminDashboard() {
  const [stats, setStats] = useState({ poems: 0, subscribers: 0, drafts: 0 });
  const [isLoading, setIsLoading] = useState(true);

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
        <h1 className="text-2xl text-primary">Dashboard</h1>
        <Link
          href="/admin/poems/new"
          className="px-4 py-2 bg-accent text-white rounded hover:bg-accent-hover transition-colors"
        >
          New Poem
        </Link>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {statCards.map((card) => (
            <Link
              key={card.label}
              href={card.href}
              className="p-6 bg-surface rounded-lg border border-border hover:border-accent transition-colors"
            >
              <div className="text-3xl font-semibold mb-1 text-primary">{card.value}</div>
              <div className="text-tertiary">{card.label}</div>
            </Link>
          ))}
        </div>
      )}

      <div className="mt-8">
        <h2 className="text-lg mb-4 text-primary">Quick Actions</h2>
        <div className="flex flex-wrap gap-4">
          <Link
            href="/admin/poems/new"
            className="px-4 py-2 border border-border rounded hover:border-accent transition-colors text-primary"
          >
            Create New Poem
          </Link>
          <Link
            href="/admin/subscribers/send"
            className="px-4 py-2 border border-border rounded hover:border-accent transition-colors text-primary"
          >
            Send Newsletter
          </Link>
        </div>
      </div>
    </div>
  );
}
