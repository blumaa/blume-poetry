'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  SubscribeModal,
  deleteSubscriber,
  fetchSubscribers,
  setNotifyNewPoems,
  type SubscriberFilter,
} from '@/features/subscribers';
import { Badge, Button, ButtonLink, Checkbox, Chip, ChipGroup, ConfirmDialog, DataTable, useToast } from '@/components/mds';
import type { SubscriberRow } from '@/lib/supabase/types';
import { formatDate } from '@/lib/date';
import { invalidateKeys, queryKeys, staleAfterWrite } from '@/lib/queryKeys';
import { Icon } from '@/components/icons';
import styles from './page.module.css';

export default function AdminSubscribersPage() {
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<SubscriberFilter>('active');
  const [deleteTarget, setDeleteTarget] = useState<SubscriberRow | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const { toast } = useToast();

  const { data: subscribers = [], isPending, isError } = useQuery({
    queryKey: queryKeys.admin.subscribers(filter),
    queryFn: () => fetchSubscribers(filter),
  });

  const invalidateSubscribers = () => invalidateKeys(queryClient, staleAfterWrite.subscribers());

  const deleteMutation = useMutation({
    mutationFn: (target: SubscriberRow) => deleteSubscriber(target.id),
    onSuccess: (_data, target) => toast({ title: `"${target.email}" deleted`, tone: 'success' }),
    onSettled: invalidateSubscribers,
  });

  /* Flip one subscriber's new-poem preference. Deterministic: writes an
     absolute value taken from the row on screen; the checkbox moves only
     after the refetch confirms the write. */
  const notifyMutation = useMutation({
    mutationFn: (subscriber: SubscriberRow) =>
      setNotifyNewPoems(subscriber.id, !subscriber.notify_new_poems),
    onSuccess: (_data, subscriber) =>
      toast({
        title: !subscriber.notify_new_poems
          ? `"${subscriber.email}" will get new-poem emails`
          : `"${subscriber.email}" will not get new-poem emails`,
        tone: 'success',
      }),
    onError: (error) => toast({ title: error.message, tone: 'danger' }),
    onSettled: invalidateSubscribers,
  });

  const handleDeleteClick = (subscriber: SubscriberRow) => {
    setDeleteTarget(subscriber);
  };

  const handleExportCSV = () => {
    const csv = [
      'Email,Status,Subscribed At,New Poem Emails',
      ...subscribers.map((s) =>
        `${s.email},${s.status},${s.subscribed_at},${s.notify_new_poems}`
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
            <Icon name="add" />
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
          <ButtonLink href="/admin/subscribers/send" size="sm" className={styles.headerButton}>
            Send Newsletter
          </ButtonLink>
        </div>
      </div>

      {isPending ? (
        <div className={styles.loadingText}>Loading subscribers...</div>
      ) : isError ? (
        <div className={styles.emptyState}>Failed to load subscribers</div>
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
                cell: (subscriber: SubscriberRow) => (
                  <span className={styles.emailCell}>{subscriber.email}</span>
                ),
              },
              {
                key: 'status',
                header: 'Status',
                cell: (subscriber: SubscriberRow) => (
                  <Badge tone={subscriber.status === 'active' ? 'success' : 'neutral'}>
                    {subscriber.status}
                  </Badge>
                ),
              },
              {
                key: 'subscribed',
                header: 'Subscribed',
                cell: (subscriber: SubscriberRow) => formatDate(subscriber.subscribed_at),
              },
              {
                key: 'notify',
                header: 'New poems',
                cell: (subscriber: SubscriberRow) => (
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
