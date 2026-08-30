'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { Button, Card, CardBody } from '@/components/mds';
import { SkeletonCard } from '@/components/Skeleton';
import styles from './page.module.css';

async function fetchStats() {
  const supabase = createClient();
  const [poemsResult, subscribersResult, draftsResult, commentsResult] = await Promise.all([
    supabase.from('poems').select('*', { count: 'exact', head: true }),
    supabase.from('subscribers').select('*', { count: 'exact', head: true }).eq('status', 'active'),
    supabase.from('poems').select('*', { count: 'exact', head: true }).eq('status', 'draft'),
    supabase.from('comments').select('*', { count: 'exact', head: true }),
  ]);

  return {
    poems: poemsResult.count || 0,
    subscribers: subscribersResult.count || 0,
    drafts: draftsResult.count || 0,
    comments: commentsResult.count || 0,
  };
}

export default function AdminDashboard() {
  const { data, isPending } = useQuery({
    queryKey: ['admin', 'stats'],
    queryFn: fetchStats,
  });
  const stats = data ?? { poems: 0, subscribers: 0, drafts: 0, comments: 0 };

  const statCards = [
    { label: 'Total Poems', value: stats.poems, href: '/admin/poems' },
    { label: 'Drafts', value: stats.drafts, href: '/admin/poems?status=draft' },
    { label: 'Subscribers', value: stats.subscribers, href: '/admin/subscribers' },
    { label: 'Comments', value: stats.comments, href: '/admin/comments' },
  ];

  return (
    <div>
      <div className={styles.header}>
        <h1 className={styles.title}>Dashboard</h1>
        <Button as={Link} href="/admin/poems/new">
          New Poem
        </Button>
      </div>

      {isPending ? (
        <div className={styles.statGrid}>
          <div className={styles.statCardWrap}><SkeletonCard /></div>
          <div className={styles.statCardWrap}><SkeletonCard /></div>
          <div className={styles.statCardWrap}><SkeletonCard /></div>
          <div className={styles.statCardWrap}><SkeletonCard /></div>
        </div>
      ) : (
        <div className={styles.statGrid}>
          {statCards.map((card) => (
            <Card
              key={card.label}
              as={Link}
              href={card.href}
              className={styles.statCardWrap}
            >
              <CardBody>
                <div className={styles.statValue}>{card.value}</div>
                <div className={styles.statLabel}>{card.label}</div>
              </CardBody>
            </Card>
          ))}
        </div>
      )}

      <div className={styles.quickActions}>
        <h2 className={styles.quickActionsTitle}>Quick Actions</h2>
        <div className={styles.quickActionsRow}>
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
