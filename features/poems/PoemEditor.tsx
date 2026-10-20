'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import type { RichTextEditorRef } from '@/components/admin/RichTextEditor';
import { RichTextEditor } from '@/components/admin/LazyRichTextEditor';
import { PoemContent } from '@/components/PoemContent';
import { Button, ConfirmDialog, Field, Input, Tab, TabList, Tabs } from '@/components/mds';
import { COLLECTION_CHOICES } from '@/lib/collections';
import { formatDate } from '@/lib/date';
import type { PoemCollection, PoemRow, PoemStatus } from '@/lib/supabase/types';
import { invalidateKeys, queryKeys, staleAfterWrite } from '@/lib/queryKeys';
import { savePoemFlow } from './savePoemFlow';
import { ChoiceFieldset } from './ChoiceFieldset';
import { NotifySwitch, notifyAvailability } from './NotifySwitch';
import styles from './PoemEditor.module.css';
import { setFlashToast } from '@/lib/flashToast';

// Preview component that matches PoemDisplay exactly
function PoemPreview({ title, subtitle, html }: { title: string; subtitle: string; html: string }) {
  return (
    <article className={styles.previewArticle}>
      {/* Title */}
      <header className={styles.previewHeader}>
        <h1 className={styles.previewTitle}>
          {title || 'Untitled'}
        </h1>
        {subtitle && (
          <p className={styles.previewSubtitle}>
            {subtitle}
          </p>
        )}
        <time className={styles.previewTime}>
          {formatDate(new Date())}
        </time>
      </header>

      {/* PoemRow body - uses shared PoemContent component */}
      <PoemContent html={html} />
    </article>
  );
}

const STATUS_CHOICES = [
  { value: 'draft', label: 'Draft' },
  { value: 'published', label: 'Published' },
] as const;

// Kinky poems live at /kinky, reachable only by its URL.
interface PoemEditorProps {
  /** Absent for a new poem. */
  poem?: PoemRow;
}

function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 80);
}

// Format date for datetime-local input (YYYY-MM-DDTHH:mm)
function formatDateForInput(dateString: string | undefined): string {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toISOString().slice(0, 16);
}

export function PoemEditor({ poem }: PoemEditorProps) {
  const isNew = !poem;
  const [title, setTitle] = useState(poem?.title || '');
  const [subtitle, setSubtitle] = useState(poem?.subtitle || '');
  const [status, setStatus] = useState<PoemStatus>(poem?.status ?? 'draft');
  const [collection, setCollection] = useState<PoemCollection>(poem?.collection ?? 'main');
  const [publishedAt, setPublishedAt] = useState(formatDateForInput(poem?.published_at));
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPreview, setIsPreview] = useState(false);
  const [contentHtml, setContentHtml] = useState(poem?.content || '');
  const [contentText, setContentText] = useState(poem?.plain_text || '');
  const router = useRouter();
  const queryClient = useQueryClient();
  const editorRef = useRef<RichTextEditorRef>(null);

  // The email defaults to on only for the save that actually publishes the poem.
  const isPublishTransition = status === 'published' && poem?.status !== 'published';
  const { canNotify, hint: notifyHint } = notifyAvailability({
    status,
    collection,
    notifiedAt: poem?.notified_at,
  });
  // Null means "admin hasn't said" — follow the transition. Once they touch
  // the box their answer sticks, even if they toggle the status around.
  const [notifyOverride, setNotifyOverride] = useState<boolean | null>(null);
  const notifySubscribers = notifyOverride ?? isPublishTransition;
  const [showNotifyConfirm, setShowNotifyConfirm] = useState(false);
  const willNotify = canNotify && notifySubscribers;

  const handleEditorChange = (html: string, text: string) => {
    setContentHtml(html);
    setContentText(text);
  };

  /**
   * Emailing the whole list can't be undone, so the confirm step stands
   * between the button and the send. Saving without a send goes straight
   * through.
   */
  const handleSaveClick = () => {
    if (willNotify) {
      setShowNotifyConfirm(true);
      return;
    }
    handleSave();
  };

  const handleSave = async () => {
    if (!title.trim()) {
      setError('Title is required');
      return;
    }

    if (!contentText.trim()) {
      setError('Content is required');
      return;
    }

    setIsSaving(true);
    setError(null);

    const slug = poem?.slug || generateSlug(title);

    try {
      // Use the date from input, or default to now if empty
      const finalPublishedAt = publishedAt
        ? new Date(publishedAt).toISOString()
        : new Date().toISOString();

      const { poem: saved, flash } = await savePoemFlow({
        id: poem?.id ?? null,
        poem: {
          title: title.trim(),
          subtitle: subtitle.trim() || null,
          slug,
          content: contentHtml,
          plain_text: contentText,
          status,
          collection,
          published_at: finalPublishedAt,
        },
        notify: willNotify,
      });

      // Mark only: each read refetches when next mounted, not the edit page
      // we are leaving. Then the saved row, as the server returned it, is the
      // poem's cache entry, so reopening the editor needs no fetch.
      await invalidateKeys(queryClient, staleAfterWrite.poems(), { refetchType: 'none' });
      queryClient.setQueryData(queryKeys.admin.poem(saved.id), saved);
      setFlashToast(flash);
      router.push('/admin/poems');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save poem');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className={styles.form}>
      {/* Title */}
      <Field label="Title">
        <Input
          size="lg"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Poem title..."
        />
      </Field>

      {/* Subtitle */}
      <Field label="Subtitle" hint="Optional">
        <Input
          value={subtitle}
          onChange={(e) => setSubtitle(e.target.value)}
          placeholder="Optional subtitle..."
        />
      </Field>

      {/* Status and Date Row */}
      <div className={styles.statusDateRow}>
        <ChoiceFieldset
          legend="Status"
          name="status"
          choices={STATUS_CHOICES}
          value={status}
          onChange={setStatus}
        />
        <ChoiceFieldset
          legend="Collection"
          name="collection"
          choices={COLLECTION_CHOICES}
          value={collection}
          onChange={setCollection}
        />

        {/* Published Date */}
        <div className={styles.dateField}>
          <Field label="Published Date">
            <Input
              type="datetime-local"
              value={publishedAt}
              onChange={(e) => setPublishedAt(e.target.value)}
            />
          </Field>
        </div>
      </div>

      {/* Notify subscribers */}
      <NotifySwitch
        canNotify={canNotify}
        hint={notifyHint}
        checked={notifySubscribers}
        onChange={setNotifyOverride}
      />

      {/* Editor / Preview toggle. No TabPanel: both views share the one
          container below, which renders conditionally. */}
      <Tabs
        value={isPreview ? 'preview' : 'edit'}
        onChange={(value) => setIsPreview(value === 'preview')}
      >
        <TabList label="Poem editor">
          <Tab value="edit">Edit</Tab>
          <Tab value="preview">Preview</Tab>
        </TabList>
      </Tabs>

      {/* Content */}
      <div className={styles.contentBox}>
        {isPreview ? (
          contentHtml ? (
            <PoemPreview title={title} subtitle={subtitle} html={contentHtml} />
          ) : (
            <div className={styles.emptyContent}>
              No content yet...
            </div>
          )
        ) : (
          <RichTextEditor
            ref={editorRef}
            content={contentHtml}
            onChange={handleEditorChange}
            minHeight="300px"
            className={styles.editorMinHeight}
          />
        )}
      </div>

      {/* Error */}
      {error && (
        <div className={styles.errorText}>{error}</div>
      )}

      {/* Actions */}
      <div className={styles.actionsRow}>
        <Button onClick={handleSaveClick} loading={isSaving}>
          {isNew ? 'Create Poem' : 'Save Changes'}
        </Button>
        <Button variant="secondary" onClick={() => router.back()}>
          Cancel
        </Button>
      </div>

      <ConfirmDialog
        open={showNotifyConfirm}
        onClose={() => setShowNotifyConfirm(false)}
        onConfirm={() => handleSave()}
        title="Email subscribers?"
        description={`Saving will publish "${title.trim() || 'this poem'}" and email every subscriber who has new-poem emails turned on. Email can't be recalled.`}
        confirmLabel="Save and send"
        cancelLabel="Cancel"
        tone="warning"
      />
    </div>
  );
}
