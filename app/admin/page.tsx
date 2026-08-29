'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Button, Card, CardBody } from '@/components/mds';
import { SkeletonCard } from '@/components/Skeleton';

export default function AdminDashboard() {
  const [stats, setStats] = useState({ poems: 0, subscribers: 0, drafts: 0, comments: 0 });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();

    async function fetchStats() {
      const [poemsResult, subscribersResult, draftsResult, commentsResult] = await Promise.all([
        supabase.from('poems').select('*', { count: 'exact', head: true }),
        supabase.from('subscribers').select('*', { count: 'exact', head: true }).eq('status', 'active'),
        supabase.from('poems').select('*', { count: 'exact', head: true }).eq('status', 'draft'),
        supabase.from('comments').select('*', { count: 'exact', head: true }),
      ]);

      setStats({
        poems: poemsResult.count || 0,
        subscribers: subscribersResult.count || 0,
        drafts: draftsResult.count || 0,
        comments: commentsResult.count || 0,
      });
      setIsLoading(false);
    }

    fetchStats();
  }, []);

  const statCards = [
    { label: 'Total Poems', value: stats.poems, href: '/admin/poems' },
    { label: 'Drafts', value: stats.drafts, href: '/admin/poems?status=draft' },
    { label: 'Subscribers', value: stats.subscribers, href: '/admin/subscribers' },
    { label: 'Comments', value: stats.comments, href: '/admin/comments' },
  ];

  return (
    <div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-8">
        <h1 className="text-2xl text-primary">Dashboard</h1>
        <Button as={Link} href="/admin/poems/new">
          New Poem
        </Button>
      </div>

      {isLoading ? (
        <div className="flex gap-3 overflow-x-auto pb-2 md:grid md:grid-cols-4 md:overflow-visible md:pb-0">
          <div className="min-w-[140px] flex-shrink-0 md:min-w-0"><SkeletonCard /></div>
          <div className="min-w-[140px] flex-shrink-0 md:min-w-0"><SkeletonCard /></div>
          <div className="min-w-[140px] flex-shrink-0 md:min-w-0"><SkeletonCard /></div>
          <div className="min-w-[140px] flex-shrink-0 md:min-w-0"><SkeletonCard /></div>
        </div>
      ) : (
        <div className="flex gap-3 overflow-x-auto pb-2 md:grid md:grid-cols-4 md:overflow-visible md:pb-0">
          {statCards.map((card) => (
            <Card
              key={card.label}
              as={Link}
              href={card.href}
              className="min-w-[140px] flex-shrink-0 md:min-w-0"
            >
              <CardBody>
                <div className="text-3xl font-semibold mb-1 text-primary">{card.value}</div>
                <div className="text-tertiary text-sm">{card.label}</div>
              </CardBody>
            </Card>
          ))}
        </div>
      )}

      <div className="mt-8">
        <h2 className="text-lg mb-4 text-primary">Quick Actions</h2>
        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
          <Button as={Link} href="/admin/poems/new" variant="secondary">
            Create New Poem
          </Button>
          <Button as={Link} href="/admin/subscribers/send" variant="secondary">
            Send Newsletter
          </Button>
        </div>
      </div>
    </div>
  );
}
