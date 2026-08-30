'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Badge, Button, Chip, ChipGroup, ConfirmDialog, DataTable, Input, useToast } from '@/components/mds';
import type { Poem } from '@/lib/supabase/types';
import { SkeletonList } from '@/components/Skeleton';
import { formatDate } from '@/lib/date';
import styles from './page.module.css';

export default function AdminPoemsPage() {
  const [poems, setPoems] = useState<Poem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<Poem | null>(null);
  const searchParams = useSearchParams();
  const statusFilter = searchParams.get('status');
  const router = useRouter();
  const { toast } = useToast();

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

  // Show toast from sessionStorage (e.g., after creating/editing a poem)
  useEffect(() => {
    const toastData = sessionStorage.getItem('toast');
    if (toastData) {
      sessionStorage.removeItem('toast');
      try {
        const { message, type } = JSON.parse(toastData);
        toast({ title: message, tone: type === 'error' ? 'danger' : 'success' });
      } catch {
        // Invalid toast data, ignore
      }
    }
  }, [toast]);

  useEffect(() => {
    const supabase = createClient();

    async function fetchPoems() {
      let query = supabase
        .from('poems')
        .select('*')
        .order('published_at', { ascending: false });

      if (statusFilter === 'draft' || statusFilter === 'published') {
        query = query.eq('status', statusFilter);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching poems:', error);
      } else {
        setPoems((data as Poem[]) || []);
      }
      setIsLoading(false);
    }

    fetchPoems();
  }, [statusFilter]);

  const handleTogglePin = async (poem: Poem) => {
    const supabase = createClient();
    const newPinned = !poem.pinned;
    const { error: pinError } = await supabase
      .from('poems')
      .update({ pinned: newPinned })
      .eq('id', poem.id);

    if (pinError) {
      toast({ title: pinError.message, tone: 'danger' });
    } else {
      setPoems((current) =>
        current.map((p) => (p.id === poem.id ? { ...p, pinned: newPinned } : p))
      );
      await fetch('/api/admin/revalidate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paths: [] }),
      });
      toast({ title: newPinned ? `"${poem.title}" pinned` : `"${poem.title}" unpinned`, tone: 'success' });
    }
  };

  const handleDeleteClick = (poem: Poem) => {
    setDeleteTarget(poem);
  };

  const handleDeleteConfirm = async (target: Poem) => {
    const supabase = createClient();
    const { error: deleteError } = await supabase.from('poems').delete().eq('id', target.id);

    if (deleteError) {
      throw new Error(deleteError.message);
    }

    setPoems((currentPoems) => currentPoems.filter((p) => p.id !== target.id));
    await fetch('/api/admin/revalidate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ paths: [`/poem/${target.slug}`] }),
    });
    toast({ title: `"${target.title}" deleted`, tone: 'success' });
  };

  return (
    <div>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerTop}>
          <h1 className={styles.title}>Poems</h1>
          <Button as={Link} href="/admin/poems/new" size="sm">
            New Poem
          </Button>
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

      {isLoading ? (
        <SkeletonList count={8} />
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
              cell: (poem: Poem) => (
                <span className={styles.titleCell}>
                  {poem.pinned && (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" className={styles.pinIcon} aria-label="Pinned">
                      <path d="M16 12V4h1V2H7v2h1v8l-2 2v2h5.2v6h1.6v-6H18v-2l-2-2z" />
                    </svg>
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
              cell: (poem: Poem) => (
                <Badge tone={poem.status === 'published' ? 'success' : 'warning'}>
                  {poem.status}
                </Badge>
              ),
            },
            {
              key: 'published',
              header: 'Published',
              cell: (poem: Poem) => formatDate(poem.published_at),
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
                onClick={() => handleTogglePin(poem)}
                aria-label={poem.pinned ? 'Unpin poem' : 'Pin poem'}
              >
                {poem.pinned ? 'Unpin' : 'Pin'}
              </Button>
              <Button as={Link} href={`/admin/poems/${poem.id}/edit`} variant="secondary" size="sm">
                Edit
              </Button>
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
        onConfirm={handleDeleteConfirm}
        title="Delete Poem"
        description={`Are you sure you want to delete "${deleteTarget?.title}"? This action cannot be undone.`}
        confirmLabel="Delete"
        cancelLabel="Cancel"
        tone="danger"
      />
    </div>
  );
}
