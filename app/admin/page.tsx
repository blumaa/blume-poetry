'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { fetchStats } from '@/features/dashboard';
import { queryKeys } from '@/lib/queryKeys';
import { ButtonLink, Card, CardBody } from '@/components/mds';
import { SkeletonCard } from '@/components/Skeleton';
import styles from './page.module.css';

export default function AdminDashboard() {
  const { data, isPending, isError } = useQuery({
    queryKey: queryKeys.admin.stats(),
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
        <ButtonLink href="/admin/poems/new">
          New Poem
        </ButtonLink>
      </div>

      {isPending ? (
        <div className={styles.statGrid}>
          <div className={styles.statCardWrap}><SkeletonCard /></div>
          <div className={styles.statCardWrap}><SkeletonCard /></div>
          <div className={styles.statCardWrap}><SkeletonCard /></div>
          <div className={styles.statCardWrap}><SkeletonCard /></div>
        </div>
      ) : isError ? (
        <p className={styles.errorText}>Failed to load stats</p>
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
          <ButtonLink href="/admin/poems/new" variant="secondary">
            Create New Poem
          </ButtonLink>
          <ButtonLink href="/admin/subscribers/send" variant="secondary">
            Send Newsletter
          </ButtonLink>
        </div>
      </div>
    </div>
  );
}
