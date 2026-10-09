'use client';

import Link from 'next/link';
import { useEffect, useEffectEvent, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Badge, Button, ButtonLink, Chip, ChipGroup, ConfirmDialog, DataTable, Input, useToast } from '@/components/mds';
import { SkeletonList } from '@/components/Skeleton';
import { formatDate } from '@/lib/date';
import { takeFlashToast } from '@/lib/flashToast';
import { invalidateKeys, queryKeys, staleAfterWrite } from '@/lib/queryKeys';
import { deletePoem, fetchAdminPoems, revalidatePoems, setPoemPinned, type AdminPoem } from '@/features/poems';
import { Icon } from '@/components/icons';
import styles from './page.module.css';

export default function AdminPoemsPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<AdminPoem | null>(null);
  const searchParams = useSearchParams();
  const statusFilter = searchParams.get('status');
  const router = useRouter();
  const { toast } = useToast();

  const { data: poems = [], isPending, isError } = useQuery({
    queryKey: queryKeys.admin.poems(statusFilter),
    queryFn: () => fetchAdminPoems(statusFilter),
  });

  const invalidatePoems = () => invalidateKeys(queryClient, staleAfterWrite.poems());

  /* Deterministic: pin state moves only after the refetch confirms the write. */
  const pinMutation = useMutation({
    mutationFn: async (poem: AdminPoem) => {
      await setPoemPinned(poem.id, !poem.pinned);
      await revalidatePoems();
    },
    onSuccess: (_data, poem) =>
      toast({
        title: !poem.pinned ? `"${poem.title}" pinned` : `"${poem.title}" unpinned`,
        tone: 'success',
      }),
    onError: (error) => toast({ title: error.message, tone: 'danger' }),
    onSettled: invalidatePoems,
  });

  const deleteMutation = useMutation({
    mutationFn: async (target: AdminPoem) => {
      await deletePoem(target.id);
      await revalidatePoems();
    },
    onSuccess: (_data, target) => toast({ title: `"${target.title}" deleted`, tone: 'success' }),
    onError: (error) => toast({ title: error.message, tone: 'danger' }),
    onSettled: invalidatePoems,
  });

  const filteredPoems = poems
    .filter((poem) =>
      poem.title.toLowerCase().includes(search.toLowerCase()) ||
      poem.plain_text?.toLowerCase().includes(search.toLowerCase())
    )
    .sort((a, b) => {
      if (a.pinned && !b.pinned) return -1;
      if (!a.pinned && b.pinned) return 1;
      return 0;
    });

  // Show a toast handed over by the editor after save, once on arrival.
  const showFlashToast = useEffectEvent(() => {
    const flash = takeFlashToast();
    if (flash) toast(flash);
  });

  useEffect(() => {
    showFlashToast();
  }, []);

  const handleDeleteClick = (poem: AdminPoem) => {
    setDeleteTarget(poem);
  };

  return (
    <div>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerTop}>
          <h1 className={styles.title}>Poems</h1>
          <ButtonLink href="/admin/poems/new" size="sm">
            New Poem
          </ButtonLink>
        </div>
        <div className={styles.filters}>
          <ChipGroup>
            <Chip selected={!statusFilter} onClick={() => router.push('/admin/poems')}>
              All
            </Chip>
            <Chip
              selected={statusFilter === 'published'}
              onClick={() => router.push('/admin/poems?status=published')}
            >
              Published
            </Chip>
            <Chip
              selected={statusFilter === 'draft'}
              onClick={() => router.push('/admin/poems?status=draft')}
            >
              Drafts
            </Chip>
          </ChipGroup>
          <Input
            type="search"
            size="sm"
            aria-label="Search poems"
            placeholder="Search poems..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onClear={() => setSearch('')}
            clearLabel="Clear search"
            className={styles.searchInput}
          />
        </div>
      </div>

      {isPending ? (
        <SkeletonList count={8} />
      ) : isError ? (
        <div className={styles.emptyState}>Failed to load poems</div>
      ) : poems.length === 0 ? (
        <div className={styles.emptyState}>
          No poems found. <Link href="/admin/poems/new" className={styles.emptyLink}>Create your first poem</Link>
        </div>
      ) : filteredPoems.length === 0 ? (
        <div className={styles.emptyState}>
          No poems matching &ldquo;{search}&rdquo;
        </div>
      ) : (
        <DataTable
          label="Poems"
          columns={[
            {
              key: 'title',
              header: 'Title',
              cell: (poem: AdminPoem) => (
                <span className={styles.titleCell}>
                  {poem.pinned && (
                    <Icon name="pin" size="sm" label="Pinned" className={styles.pinIcon} />
                  )}
                  <Link
                    href={`/poem/${poem.slug}`}
                    className={styles.poemLink}
                    target="_blank"
                  >
                    {poem.title}
                  </Link>
                </span>
              ),
            },
            {
              key: 'status',
              header: 'Status',
              cell: (poem: AdminPoem) => (
                <Badge tone={poem.status === 'published' ? 'success' : 'warning'}>
                  {poem.status}
                </Badge>
              ),
            },
            {
              key: 'published',
              header: 'Published',
              cell: (poem: AdminPoem) => formatDate(poem.published_at),
            },
          ]}
          rows={filteredPoems}
          rowKey={(poem) => poem.id}
          rowLabel={(poem) => poem.title}
          actionsHeader="Actions"
          rowActions={(poem) => (
            <div className={styles.rowActions}>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => pinMutation.mutate(poem)}
                aria-label={poem.pinned ? 'Unpin poem' : 'Pin poem'}
              >
                {poem.pinned ? 'Unpin' : 'Pin'}
              </Button>
              <ButtonLink href={`/admin/poems/${poem.id}/edit`} variant="secondary" size="sm">
                Edit
              </ButtonLink>
              <Button variant="danger" size="sm" onClick={() => handleDeleteClick(poem)}>
                Delete
              </Button>
            </div>
          )}
        />
      )}

      {/* Delete confirmation modal */}
      <ConfirmDialog
        target={deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={(target) => deleteMutation.mutateAsync(target)}
        title="Delete Poem"
        description={`Are you sure you want to delete "${deleteTarget?.title}"? This action cannot be undone.`}
        confirmLabel="Delete"
        cancelLabel="Cancel"
        tone="danger"
      />
    </div>
  );
}
