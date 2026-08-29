'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { createClient } from '@/lib/supabase/client';
import type { RichTextEditorRef } from './RichTextEditor';
import { PoemContent } from '@/components/PoemContent';
import { Button, Checkbox, ConfirmDialog, Field, Input, Radio, Tab, TabList, Tabs } from '@/components/mds';
import { formatDate } from '@/lib/date';
import type { Poem, NewPoem } from '@/lib/supabase/types';
import styles from './PoemEditor.module.css';

const RichTextEditor = dynamic(
  () => import('./RichTextEditor').then((m) => m.RichTextEditor),
  { ssr: false, loading: () => <div className={styles.previewSkeleton} /> }
);

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

      {/* Poem body - uses shared PoemContent component */}
      <PoemContent html={html} />
    </article>
  );
}

interface PoemEditorProps {
  poem?: Poem;
  isNew?: boolean;
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

export function PoemEditor({ poem, isNew = false }: PoemEditorProps) {
  const [title, setTitle] = useState(poem?.title || '');
  const [subtitle, setSubtitle] = useState(poem?.subtitle || '');
  const [status, setStatus] = useState<'draft' | 'published'>(poem?.status || 'draft');
  const [publishedAt, setPublishedAt] = useState(formatDateForInput(poem?.published_at));
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPreview, setIsPreview] = useState(false);
  const [contentHtml, setContentHtml] = useState(poem?.content || '');
  const [contentText, setContentText] = useState(poem?.plain_text || '');
  const router = useRouter();
  const editorRef = useRef<RichTextEditorRef>(null);

  // A poem is only ever announced once — the server stamps `notified_at` when
  // it sends. So the offer is available while that stamp is missing, but it
  // only defaults to on for the save that actually publishes the poem.
  const isPublishTransition = status === 'published' && poem?.status !== 'published';
  const canNotify = status === 'published' && !poem?.notified_at;
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
    const supabase = createClient();

    try {
      // Use the date from input, or default to now if empty
      const finalPublishedAt = publishedAt
        ? new Date(publishedAt).toISOString()
        : new Date().toISOString();

      const poemData: NewPoem = {
        title: title.trim(),
        subtitle: subtitle.trim() || null,
        slug,
        content: contentHtml,
        plain_text: contentText,
        status,
        published_at: finalPublishedAt,
      };

      // `.select<...>('id')` so a brand-new poem's id is available to the
      // notification call below without a second round trip.
      const { data: saved, error: saveError } = isNew
        ? await supabase.from('poems').insert(poemData).select<'id', { id: string }>('id').single()
        : await supabase
            .from('poems')
            .update(poemData)
            .eq('id', poem!.id)
            .select<'id', { id: string }>('id')
            .single();
      if (saveError) throw saveError;

      // Revalidate pages so the change shows up
      await fetch('/api/admin/revalidate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paths: [`/poem/${slug}`] }),
      });

      let message = isNew ? `"${title.trim()}" created` : 'Changes saved';
      let type: 'success' | 'error' = 'success';

      // The poem is already saved at this point. A failed send is reported as
      // its own problem rather than rolling anything back, so the admin knows
      // exactly which half went wrong.
      if (willNotify && saved?.id) {
        try {
          const res = await fetch('/api/admin/notify-poem', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ poemId: saved.id }),
          });
          const result = await res.json();
          if (!res.ok) throw new Error(result.error || 'Failed to email subscribers');

          message = result.alreadyNotified
            ? `${message}. Subscribers had already been emailed about this poem`
            : `${message}. Emailed ${result.sent} subscriber${result.sent === 1 ? '' : 's'}`;
        } catch (err) {
          type = 'error';
          message = `Saved, but the email failed: ${err instanceof Error ? err.message : 'unknown error'}`;
        }
      }

      sessionStorage.setItem('toast', JSON.stringify({ message, type }));
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
        {/* Status */}
        <fieldset>
          <legend className={styles.statusLegend}>Status</legend>
          <div className={styles.radioRow}>
            <Radio
              name="status"
              label="Draft"
              checked={status === 'draft'}
              onChange={() => setStatus('draft')}
            />
            <Radio
              name="status"
              label="Published"
              checked={status === 'published'}
              onChange={() => setStatus('published')}
            />
          </div>
        </fieldset>

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
      {canNotify && (
        <Checkbox
          checked={notifySubscribers}
          onChange={(e) => setNotifyOverride(e.target.checked)}
          label={
            <>
              Email subscribers about this poem
              <span className={styles.notifyHint}>
                Goes to everyone with new-poem emails turned on. Only ever sent once per poem.
              </span>
            </>
          }
        />
      )}

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
