'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { SubscribeModal } from '@/components/SubscribeModal';
import { Badge, Button, Checkbox, Chip, ChipGroup, ConfirmDialog, DataTable, useToast } from '@/components/mds';
import type { Subscriber } from '@/lib/supabase/types';
import { formatDate } from '@/lib/date';
import styles from './page.module.css';

async function loadSubscribers(
  filter: 'all' | 'active' | 'unsubscribed'
): Promise<Subscriber[]> {
  const supabase = createClient();
  let query = supabase
    .from('subscribers')
    .select('*')
    .order('subscribed_at', { ascending: false });

  if (filter !== 'all') {
    query = query.eq('status', filter);
  }

  const { data, error } = await query;

  if (error) throw new Error(error.message);
  return (data as Subscriber[]) || [];
}

async function deleteSubscriber(id: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from('subscribers').delete().eq('id', id);
  if (error) throw new Error(error.message);
}

async function updateNotifyNewPoems(id: string, next: boolean): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from('subscribers')
    .update({ notify_new_poems: next })
    .eq('id', id);
  if (error) throw new Error(error.message);
}

export default function AdminSubscribersPage() {
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<'all' | 'active' | 'unsubscribed'>('active');
  const [deleteTarget, setDeleteTarget] = useState<Subscriber | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const { toast } = useToast();

  const { data: subscribers = [], isPending } = useQuery({
    queryKey: ['admin', 'subscribers', filter],
    queryFn: () => loadSubscribers(filter),
  });

  // Invalidate every filter's list — a write changes them all.
  const invalidateSubscribers = () =>
    queryClient.invalidateQueries({ queryKey: ['admin', 'subscribers'] });

  const deleteMutation = useMutation({
    mutationFn: (target: Subscriber) => deleteSubscriber(target.id),
    onSuccess: (_data, target) => toast({ title: `"${target.email}" deleted`, tone: 'success' }),
    onSettled: invalidateSubscribers,
  });

  /* Flip one subscriber's new-poem preference. Deterministic: writes an
     absolute value taken from the row on screen; the checkbox moves only
     after the refetch confirms the write. */
  const notifyMutation = useMutation({
    mutationFn: (subscriber: Subscriber) =>
      updateNotifyNewPoems(subscriber.id, !subscriber.notify_new_poems),
    onSuccess: (_data, subscriber) =>
      toast({
        title: !subscriber.notify_new_poems
          ? `"${subscriber.email}" will get new-poem emails`
          : `"${subscriber.email}" will not get new-poem emails`,
        tone: 'success',
      }),
    onError: (error) =>
      toast({ title: error instanceof Error ? error.message : 'Update failed', tone: 'danger' }),
    onSettled: invalidateSubscribers,
  });

  const handleDeleteClick = (subscriber: Subscriber) => {
    setDeleteTarget(subscriber);
  };

  const handleExportCSV = () => {
    const csv = [
      'Email,Status,Subscribed At,Verified,New Poem Emails',
      ...subscribers.map((s) =>
        `${s.email},${s.status},${s.subscribed_at},${s.verified},${s.notify_new_poems}`
      ),
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `subscribers-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: `Exported ${subscribers.length} subscribers`, tone: 'success' });
  };

  const handleAddSuccess = () => {
    toast({ title: 'Subscriber added', tone: 'success' });
    invalidateSubscribers();
  };

  return (
    <div>
      {/* Header - stacks on mobile */}
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <h1 className={styles.title}>Subscribers</h1>
          <Button
            iconOnly
            size="sm"
            shape="pill"
            onClick={() => setShowAddModal(true)}
            aria-label="Add subscriber"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 5v14M5 12h14" />
            </svg>
          </Button>
          <ChipGroup>
            <Chip selected={filter === 'active'} onClick={() => setFilter('active')}>
              Active
            </Chip>
            <Chip selected={filter === 'unsubscribed'} onClick={() => setFilter('unsubscribed')}>
              Unsubscribed
            </Chip>
            <Chip selected={filter === 'all'} onClick={() => setFilter('all')}>
              All
            </Chip>
          </ChipGroup>
        </div>
        <div className={styles.headerRight}>
          <Button variant="secondary" size="sm" onClick={handleExportCSV} className={styles.headerButton}>
            Export CSV
          </Button>
          <Button as={Link} href="/admin/subscribers/send" size="sm" className={styles.headerButton}>
            Send Newsletter
          </Button>
        </div>
      </div>

      {isPending ? (
        <div className={styles.loadingText}>Loading subscribers...</div>
      ) : subscribers.length === 0 ? (
        <div className={styles.emptyState}>
          No subscribers found.
        </div>
      ) : (
        <>
          <DataTable
            label="Subscribers"
            columns={[
              {
                key: 'email',
                header: 'Email',
                cell: (subscriber: Subscriber) => (
                  <span className={styles.emailCell}>{subscriber.email}</span>
                ),
              },
              {
                key: 'status',
                header: 'Status',
                cell: (subscriber: Subscriber) => (
                  <Badge tone={subscriber.status === 'active' ? 'success' : 'neutral'}>
                    {subscriber.status}
                  </Badge>
                ),
              },
              {
                key: 'subscribed',
                header: 'Subscribed',
                cell: (subscriber: Subscriber) => formatDate(subscriber.subscribed_at),
              },
              {
                key: 'verified',
                header: 'Verified',
                cell: (subscriber: Subscriber) =>
                  subscriber.verified ? <Badge tone="success">Yes</Badge> : 'No',
              },
              {
                key: 'notify',
                header: 'New poems',
                cell: (subscriber: Subscriber) => (
                  <Checkbox
                    label={`New poem emails for ${subscriber.email}`}
                    labelHidden
                    checked={subscriber.notify_new_poems}
                    onChange={() => notifyMutation.mutate(subscriber)}
                    disabled={notifyMutation.isPending && notifyMutation.variables?.id === subscriber.id}
                  />
                ),
              },
            ]}
            rows={subscribers}
            rowKey={(subscriber) => subscriber.id}
            rowLabel={(subscriber) => subscriber.email}
            actionsHeader="Actions"
            rowActions={(subscriber) => (
              <Button variant="danger" size="sm" onClick={() => handleDeleteClick(subscriber)}>
                Delete
              </Button>
            )}
          />
          <div className={styles.footerCount}>
            {subscribers.length} subscriber{subscribers.length !== 1 ? 's' : ''}
          </div>
        </>
      )}

      {/* Delete confirmation modal */}
      <ConfirmDialog
        target={deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={(target) => deleteMutation.mutateAsync(target)}
        title="Delete Subscriber"
        description={`Are you sure you want to delete "${deleteTarget?.email}"? This action cannot be undone.`}
        confirmLabel="Delete"
        cancelLabel="Cancel"
        tone="danger"
      />

      {/* Add subscriber modal */}
      <SubscribeModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSuccess={handleAddSuccess}
        isAdmin
      />
    </div>
  );
}
