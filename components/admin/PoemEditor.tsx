'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { RichTextEditor, RichTextEditorRef } from './RichTextEditor';
import { PoemContent } from '@/components/PoemContent';
import type { Poem, NewPoem, UpdatePoem } from '@/lib/supabase/types';

// Preview component that matches PoemDisplay exactly
function PoemPreview({ title, subtitle, html }: { title: string; subtitle: string; html: string }) {
  return (
    <article className="max-w-2xl mx-auto">
      {/* Title */}
      <header className="mb-8">
        <h1 className="text-xl md:text-2xl font-normal text-[var(--text-primary)] leading-tight">
          {title || 'Untitled'}
        </h1>
        {subtitle && (
          <p className="text-base md:text-lg text-[var(--text-secondary)] mt-1 italic">
            {subtitle}
          </p>
        )}
        <time className="text-sm text-[var(--text-tertiary)] mt-2 block">
          {new Date().toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          })}
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

  const handleEditorChange = (html: string, text: string) => {
    setContentHtml(html);
    setContentText(text);
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

      if (isNew) {
        const newPoemData: NewPoem = {
          title: title.trim(),
          subtitle: subtitle.trim() || null,
          slug,
          content: contentHtml,
          plain_text: contentText,
          status,
          published_at: finalPublishedAt,
        };
        const { error: insertError } = await supabase.from('poems').insert(newPoemData);
        if (insertError) throw insertError;

        // Revalidate pages so new poem shows up
        await fetch('/api/admin/revalidate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ paths: [`/poem/${slug}`] }),
        });

        sessionStorage.setItem('toast', JSON.stringify({ message: `"${title.trim()}" created`, type: 'success' }));
        router.push('/admin/poems');
      } else {
        const updateData: UpdatePoem = {
          title: title.trim(),
          subtitle: subtitle.trim() || null,
          slug,
          content: contentHtml,
          plain_text: contentText,
          status,
          published_at: finalPublishedAt,
        };
        const { error: updateError } = await supabase.from('poems').update(updateData).eq('id', poem!.id);
        if (updateError) throw updateError;

        // Revalidate pages so changes show up
        await fetch('/api/admin/revalidate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ paths: [`/poem/${slug}`] }),
        });

        sessionStorage.setItem('toast', JSON.stringify({ message: 'Changes saved', type: 'success' }));
        router.push('/admin/poems');
      }
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
        <label htmlFor="title" className="block text-sm font-medium mb-2 text-[var(--text-primary)]">
          Title
        </label>
        <input
          id="title"
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Poem title..."
          className="w-full px-4 py-3 text-xl border border-[var(--border)] rounded bg-[var(--bg-primary)] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/20"
        />
      </div>

      {/* Subtitle */}
      <div>
        <label htmlFor="subtitle" className="block text-sm font-medium mb-2 text-[var(--text-primary)]">
          Subtitle <span className="text-[var(--text-tertiary)] font-normal">(optional)</span>
        </label>
        <input
          id="subtitle"
          type="text"
          value={subtitle}
          onChange={(e) => setSubtitle(e.target.value)}
          placeholder="Optional subtitle..."
          className="w-full px-4 py-3 border border-[var(--border)] rounded bg-[var(--bg-primary)] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/20"
        />
      </div>

      {/* Status and Date Row */}
      <div className="flex flex-col sm:flex-row gap-6">
        {/* Status */}
        <div>
          <label className="block text-sm font-medium mb-2 text-[var(--text-primary)]">Status</label>
          <div className="flex gap-4">
            <label className="flex items-center gap-2 cursor-pointer text-[var(--text-primary)]">
              <input
                type="radio"
                name="status"
                value="draft"
                checked={status === 'draft'}
                onChange={() => setStatus('draft')}
                className="accent-[var(--accent)]"
              />
              <span>Draft</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer text-[var(--text-primary)]">
              <input
                type="radio"
                name="status"
                value="published"
                checked={status === 'published'}
                onChange={() => setStatus('published')}
                className="accent-[var(--accent)]"
              />
              <span>Published</span>
            </label>
          </div>
        </div>

        {/* Published Date */}
        <div className="flex-1">
          <label htmlFor="published-date" className="block text-sm font-medium mb-2 text-[var(--text-primary)]">
            Published Date
          </label>
          <input
            id="published-date"
            type="datetime-local"
            value={publishedAt}
            onChange={(e) => setPublishedAt(e.target.value)}
            className="px-4 py-2 border border-[var(--border)] rounded bg-[var(--bg-primary)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/20"
          />
        </div>
      </div>

      {/* Editor / Preview Toggle */}
      <div className="flex items-center gap-4 border-b border-[var(--border)] pb-2">
        <button
          onClick={() => setIsPreview(false)}
          className={`px-3 py-1 text-sm ${!isPreview ? 'text-[var(--accent)] border-b-2 border-[var(--accent)]' : 'text-[var(--text-tertiary)]'}`}
        >
          Edit
        </button>
        <button
          onClick={() => setIsPreview(true)}
          className={`px-3 py-1 text-sm ${isPreview ? 'text-[var(--accent)] border-b-2 border-[var(--accent)]' : 'text-[var(--text-tertiary)]'}`}
        >
          Preview
        </button>
      </div>

      {/* Content */}
      <div className="bg-[var(--bg-primary)] border border-[var(--border)] rounded-lg p-6">
        {isPreview ? (
          contentHtml ? (
            <PoemPreview title={title} subtitle={subtitle} html={contentHtml} />
          ) : (
            <div className="text-[var(--text-tertiary)] text-center py-12">
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
      <div className="flex items-center gap-4">
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="px-6 py-2 bg-[var(--accent)] text-white rounded hover:bg-[var(--accent-hover)] transition-colors disabled:opacity-50"
        >
          {isSaving ? 'Saving...' : isNew ? 'Create Poem' : 'Save Changes'}
        </button>
        <button
          onClick={() => router.back()}
          className="px-6 py-2 border border-[var(--border)] rounded hover:border-[var(--accent)] transition-colors text-[var(--text-primary)]"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
