'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  PublicationForm,
  deletePublication,
  fetchAdminPublications,
  revalidatePublications,
} from '@/features/publications';
import { Button, ConfirmDialog, DataTable, Modal, ModalBody, ModalHeader, useToast } from '@/components/mds';
import type { PublicationRow } from '@/lib/supabase/types';
import { formatMonthYear } from '@/lib/date';
import { invalidateKeys, queryKeys, staleAfterWrite } from '@/lib/queryKeys';
import styles from './page.module.css';

/* null = closed, 'new' = adding, a row = editing it. */
type Editing = PublicationRow | 'new' | null;

export default function AdminPublicationsPage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [editing, setEditing] = useState<Editing>(null);
  const [deleteTarget, setDeleteTarget] = useState<PublicationRow | null>(null);

  const { data: publications = [], isPending, isError } = useQuery({
    queryKey: queryKeys.admin.publications(),
    queryFn: fetchAdminPublications,
  });

  const invalidatePublications = () => invalidateKeys(queryClient, staleAfterWrite.publications());

  const deleteMutation = useMutation({
    mutationFn: async (target: PublicationRow) => {
      await deletePublication(target.id);
      await revalidatePublications();
    },
    onSuccess: (_data, target) => toast({ title: `"${target.poem_title}" deleted`, tone: 'success' }),
    onError: (error) => toast({ title: error.message, tone: 'danger' }),
    onSettled: invalidatePublications,
  });

  const closeForm = () => setEditing(null);
  const onSaved = () => {
    closeForm();
    invalidatePublications();
  };

  return (
    <div>
      <div className={styles.header}>
        <h1 className={styles.title}>Publications</h1>
        <Button size="sm" onClick={() => setEditing('new')}>
          New Publication
        </Button>
      </div>

      {isPending ? (
        <div className={styles.loadingText}>Loading publications...</div>
      ) : isError ? (
        <div className={styles.emptyState}>Failed to load publications</div>
      ) : publications.length === 0 ? (
        <div className={styles.emptyState}>No publications yet.</div>
      ) : (
        <DataTable
          label="Publications"
          columns={[
            { key: 'poem', header: 'Poem', cell: (p: PublicationRow) => p.poem_title },
            { key: 'journal', header: 'Journal', cell: (p: PublicationRow) => p.journal },
            { key: 'published', header: 'Published', cell: (p: PublicationRow) => formatMonthYear(p.published_on) },
          ]}
          rows={publications}
          rowKey={(p) => p.id}
          rowLabel={(p) => p.poem_title}
          actionsHeader="Actions"
          rowActions={(p) => (
            <div className={styles.rowActions}>
              <Button variant="secondary" size="sm" onClick={() => setEditing(p)} aria-label={`Edit ${p.poem_title}`}>
                Edit
              </Button>
              <Button variant="danger" size="sm" onClick={() => setDeleteTarget(p)} aria-label={`Delete ${p.poem_title}`}>
                Delete
              </Button>
            </div>
          )}
        />
      )}

      <Modal open={editing !== null} onClose={closeForm} label={editing === 'new' ? 'New Publication' : 'Edit Publication'}>
        <ModalHeader>{editing === 'new' ? 'New Publication' : 'Edit Publication'}</ModalHeader>
        <ModalBody>
          {editing !== null && (
            <PublicationForm
              key={editing === 'new' ? 'new' : editing.id}
              publication={editing === 'new' ? undefined : editing}
              onSaved={onSaved}
              onCancel={closeForm}
            />
          )}
        </ModalBody>
      </Modal>

      <ConfirmDialog
        target={deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={(target) => deleteMutation.mutateAsync(target)}
        title="Delete Publication"
        description={`Delete "${deleteTarget?.poem_title}" in ${deleteTarget?.journal}? This cannot be undone.`}
        confirmLabel="Delete"
        cancelLabel="Cancel"
        tone="danger"
      />
    </div>
  );
}
