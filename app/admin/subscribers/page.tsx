'use client';

import Link from 'next/link';
import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { SubscribeModal } from '@/components/SubscribeModal';
import { Badge, Button, Checkbox, Chip, ChipGroup, ConfirmDialog, DataTable, useToast } from '@/components/mds';
import type { Subscriber } from '@/lib/supabase/types';
import { formatDate } from '@/lib/date';

export default function AdminSubscribersPage() {
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'active' | 'unsubscribed'>('active');
  const [deleteTarget, setDeleteTarget] = useState<Subscriber | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [savingNotifyId, setSavingNotifyId] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchSubscribers = useCallback(async () => {
    const supabase = createClient();
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
  }, [filter]);

  useEffect(() => {
    fetchSubscribers();
  }, [fetchSubscribers]);

  const handleDeleteClick = (subscriber: Subscriber) => {
    setDeleteTarget(subscriber);
  };

  const handleDeleteConfirm = async (target: Subscriber) => {
    const supabase = createClient();
    const { error: deleteError } = await supabase.from('subscribers').delete().eq('id', target.id);

    if (deleteError) {
      throw new Error(deleteError.message);
    }

    setSubscribers((current) => current.filter((s) => s.id !== target.id));
    toast({ title: `"${target.email}" deleted`, tone: 'success' });
  };

  /**
   * Flip one subscriber's new-poem preference. Writes an absolute value taken
   * from the row currently on screen, then updates local state on success —
   * no refetch, and nothing moves if the write is rejected.
   */
  const handleNotifyToggle = async (subscriber: Subscriber) => {
    const next = !subscriber.notify_new_poems;

    setSavingNotifyId(subscriber.id);
    const supabase = createClient();
    const { error } = await supabase
      .from('subscribers')
      .update({ notify_new_poems: next })
      .eq('id', subscriber.id);
    setSavingNotifyId(null);

    if (error) {
      toast({ title: error.message, tone: 'danger' });
      return;
    }

    setSubscribers((current) =>
      current.map((s) => (s.id === subscriber.id ? { ...s, notify_new_poems: next } : s))
    );
    toast({
      title: next
        ? `"${subscriber.email}" will get new-poem emails`
        : `"${subscriber.email}" will not get new-poem emails`,
      tone: 'success',
    });
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
    fetchSubscribers();
    toast({ title: 'Subscriber added', tone: 'success' });
  };

  return (
    <div>
      {/* Header - stacks on mobile */}
      <div className="flex flex-col gap-3 mb-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3 flex-wrap">
          <h1 className="text-2xl text-primary">Subscribers</h1>
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
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" onClick={handleExportCSV} className="flex-1 sm:flex-none">
            Export CSV
          </Button>
          <Button as={Link} href="/admin/subscribers/send" size="sm" className="flex-1 sm:flex-none">
            Send Newsletter
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="text-tertiary">Loading subscribers...</div>
      ) : subscribers.length === 0 ? (
        <div className="text-center py-12 text-tertiary">
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
                  <span className="text-primary">{subscriber.email}</span>
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
                    onChange={() => handleNotifyToggle(subscriber)}
                    disabled={savingNotifyId === subscriber.id}
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
          <div className="py-3 text-sm text-tertiary">
            {subscribers.length} subscriber{subscribers.length !== 1 ? 's' : ''}
          </div>
        </>
      )}

      {/* Delete confirmation modal */}
      <ConfirmDialog
        target={deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDeleteConfirm}
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
