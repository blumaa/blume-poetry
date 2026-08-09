'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { createClient } from '@/lib/supabase/client';
import type { RichTextEditorRef } from './RichTextEditor';
import { PoemContent } from '@/components/PoemContent';
import { ConfirmModal } from '@/components/ConfirmModal';
import { formatDate } from '@/lib/date';
import type { Poem, NewPoem } from '@/lib/supabase/types';

const RichTextEditor = dynamic(
  () => import('./RichTextEditor').then((m) => m.RichTextEditor),
  { ssr: false, loading: () => <div className="min-h-[300px] bg-surface border border-border rounded animate-pulse" /> }
);

// Preview component that matches PoemDisplay exactly
function PoemPreview({ title, subtitle, html }: { title: string; subtitle: string; html: string }) {
  return (
    <article className="max-w-2xl mx-auto">
      {/* Title */}
      <header className="mb-8">
        <h1 className="text-xl md:text-2xl font-normal text-primary leading-tight">
          {title || 'Untitled'}
        </h1>
        {subtitle && (
          <p className="text-base md:text-lg text-secondary mt-1 italic">
            {subtitle}
          </p>
        )}
        <time className="text-sm text-tertiary mt-2 block">
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
    <div className="space-y-6">
      {/* Title */}
      <div>
        <label htmlFor="title" className="block text-sm font-medium mb-2 text-primary">
          Title
        </label>
        <input
          id="title"
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Poem title..."
          className="w-full px-4 py-3 text-xl border border-border rounded bg-surface text-primary placeholder:text-tertiary focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"
        />
      </div>

      {/* Subtitle */}
      <div>
        <label htmlFor="subtitle" className="block text-sm font-medium mb-2 text-primary">
          Subtitle <span className="text-tertiary font-normal">(optional)</span>
        </label>
        <input
          id="subtitle"
          type="text"
          value={subtitle}
          onChange={(e) => setSubtitle(e.target.value)}
          placeholder="Optional subtitle..."
          className="w-full px-4 py-3 border border-border rounded bg-surface text-primary placeholder:text-tertiary focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"
        />
      </div>

      {/* Status and Date Row */}
      <div className="flex flex-col sm:flex-row gap-6">
        {/* Status */}
        <div>
          <label className="block text-sm font-medium mb-2 text-primary">Status</label>
          <div className="flex gap-4">
            <label className="flex items-center gap-2 cursor-pointer text-primary">
              <input
                type="radio"
                name="status"
                value="draft"
                checked={status === 'draft'}
                onChange={() => setStatus('draft')}
                className="accent-accent"
              />
              <span>Draft</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer text-primary">
              <input
                type="radio"
                name="status"
                value="published"
                checked={status === 'published'}
                onChange={() => setStatus('published')}
                className="accent-accent"
              />
              <span>Published</span>
            </label>
          </div>
        </div>

        {/* Published Date */}
        <div className="flex-1">
          <label htmlFor="published-date" className="block text-sm font-medium mb-2 text-primary">
            Published Date
          </label>
          <input
            id="published-date"
            type="datetime-local"
            value={publishedAt}
            onChange={(e) => setPublishedAt(e.target.value)}
            className="px-4 py-2 border border-border rounded bg-surface text-primary focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"
          />
        </div>
      </div>

      {/* Notify subscribers */}
      {canNotify && (
        <div>
          <label className="flex items-start gap-2 cursor-pointer text-primary">
            <input
              type="checkbox"
              checked={notifySubscribers}
              onChange={(e) => setNotifyOverride(e.target.checked)}
              className="accent-accent mt-1"
            />
            <span>
              Email subscribers about this poem
              <span className="block text-sm text-tertiary">
                Goes to everyone with new-poem emails turned on. Only ever sent once per poem.
              </span>
            </span>
          </label>
        </div>
      )}

      {/* Editor / Preview Toggle */}
      <div className="flex items-center gap-4 border-b border-border pb-2">
        <button
          onClick={() => setIsPreview(false)}
          className={`px-3 py-1 text-sm ${!isPreview ? 'text-accent border-b-2 border-accent' : 'text-tertiary'}`}
        >
          Edit
        </button>
        <button
          onClick={() => setIsPreview(true)}
          className={`px-3 py-1 text-sm ${isPreview ? 'text-accent border-b-2 border-accent' : 'text-tertiary'}`}
        >
          Preview
        </button>
      </div>

      {/* Content */}
      <div className="bg-surface border border-border rounded-lg p-6">
        {isPreview ? (
          contentHtml ? (
            <PoemPreview title={title} subtitle={subtitle} html={contentHtml} />
          ) : (
            <div className="text-tertiary text-center py-12">
              No content yet...
            </div>
          )
        ) : (
          <RichTextEditor
            ref={editorRef}
            content={contentHtml}
            onChange={handleEditorChange}
            minHeight="300px"
            className="min-h-[300px]"
          />
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="text-red-600 text-sm">{error}</div>
      )}

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
        <button
          onClick={handleSaveClick}
          disabled={isSaving}
          className="px-6 py-3 sm:py-2 bg-accent text-white rounded hover:bg-accent-hover transition-colors disabled:opacity-50"
        >
          {isSaving ? 'Saving...' : isNew ? 'Create Poem' : 'Save Changes'}
        </button>
        <button
          onClick={() => router.back()}
          className="px-6 py-3 sm:py-2 border border-border rounded hover:border-accent transition-colors text-primary"
        >
          Cancel
        </button>
      </div>

      <ConfirmModal
        isOpen={showNotifyConfirm}
        onClose={() => setShowNotifyConfirm(false)}
        onConfirm={() => {
          setShowNotifyConfirm(false);
          handleSave();
        }}
        title="Email subscribers?"
        message={`Saving will publish "${title.trim() || 'this poem'}" and email every subscriber who has new-poem emails turned on. Email can't be recalled.`}
        confirmText="Save and send"
        variant="warning"
        isLoading={isSaving}
      />
    </div>
  );
}
