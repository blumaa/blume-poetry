'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { RichTextEditor, RichTextEditorRef } from '@/components/admin/RichTextEditor';
import { ConfirmModal } from '@/components/ConfirmModal';
import { useToast } from '@/components/Toast';
import type { Poem } from '@/lib/supabase/types';

export default function SendNewsletterPage() {
  const [poems, setPoems] = useState<Poem[]>([]);
  const [subject, setSubject] = useState('');
  const [bodyHtml, setBodyHtml] = useState('');
  const [bodyText, setBodyText] = useState('');
  const [selectedPoemId, setSelectedPoemId] = useState<string>('');
  const [testEmail, setTestEmail] = useState('');
  const [subscriberCount, setSubscriberCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [showSendConfirm, setShowSendConfirm] = useState(false);
  const router = useRouter();
  const editorRef = useRef<RichTextEditorRef>(null);
  const { showToast } = useToast();

  useEffect(() => {
    const supabase = createClient();

    async function fetchData() {
      // Fetch recent published poems
      const { data: poemsData } = await supabase
        .from('poems')
        .select('*')
        .eq('status', 'published')
        .order('published_at', { ascending: false })
        .limit(20);

      setPoems((poemsData as Poem[]) || []);

      // Get subscriber count
      const { count } = await supabase
        .from('subscribers')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'active');

      setSubscriberCount(count || 0);
      setIsLoading(false);
    }

    fetchData();
  }, []);

  const handleEditorChange = (html: string, text: string) => {
    setBodyHtml(html);
    setBodyText(text);
  };

  const handleSendTest = async () => {
    if (!subject.trim()) {
      showToast('Please enter a subject', 'error');
      return;
    }
    if (!bodyText.trim()) {
      showToast('Please enter body content', 'error');
      return;
    }
    if (!testEmail) {
      showToast('Please enter a test email', 'error');
      return;
    }

    setIsSending(true);

    try {
      const response = await fetch('/api/admin/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject,
          bodyHtml,
          bodyText,
          poemId: selectedPoemId || undefined,
          testEmail,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        showToast('Test email sent', 'success');
      } else {
        showToast(data.error || 'Failed to send test email', 'error');
      }
    } catch {
      showToast('An unexpected error occurred', 'error');
    } finally {
      setIsSending(false);
    }
  };

  const handleSendAllClick = () => {
    if (!subject.trim()) {
      showToast('Please enter a subject', 'error');
      return;
    }
    if (!bodyText.trim()) {
      showToast('Please enter body content', 'error');
      return;
    }
    setShowSendConfirm(true);
  };

  const handleSendAllConfirm = async () => {
    setShowSendConfirm(false);
    setIsSending(true);

    try {
      const response = await fetch('/api/admin/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject,
          bodyHtml,
          bodyText,
          poemId: selectedPoemId || undefined,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        showToast(data.message, 'success');
      } else {
        showToast(data.error || 'Failed to send emails', 'error');
      }
    } catch {
      showToast('An unexpected error occurred', 'error');
    } finally {
      setIsSending(false);
    }
  };

  const selectedPoem = poems.find((p) => p.id === selectedPoemId);

  if (isLoading) {
    return <div className="text-[var(--text-tertiary)]">Loading...</div>;
  }

  return (
    <div>
      <h1 className="text-2xl mb-6 text-[var(--text-primary)]">Send Newsletter</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left: Compose */}
        <div className="space-y-6">
          {/* Subject */}
          <div>
            <label htmlFor="subject" className="block text-sm font-medium mb-2 text-[var(--text-primary)]">
              Subject
            </label>
            <input
              id="subject"
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Newsletter subject..."
              className="w-full px-4 py-2 border border-[var(--border)] rounded bg-[var(--bg-primary)] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/20"
            />
          </div>

          {/* Body */}
          <div>
            <label className="block text-sm font-medium mb-2 text-[var(--text-primary)]">
              Body
            </label>
            <div className="bg-[var(--bg-primary)] border border-[var(--border)] rounded-lg p-4">
              <RichTextEditor
                ref={editorRef}
                onChange={handleEditorChange}
                minHeight="200px"
                className="min-h-[200px]"
              />
            </div>
          </div>

          {/* Poem Attachment (Optional) */}
          <div>
            <label htmlFor="poem" className="block text-sm font-medium mb-2 text-[var(--text-primary)]">
              Attach Poem <span className="text-[var(--text-tertiary)] font-normal">(optional)</span>
            </label>
            <select
              id="poem"
              value={selectedPoemId}
              onChange={(e) => setSelectedPoemId(e.target.value)}
              className="w-full px-4 py-2 border border-[var(--border)] rounded bg-[var(--bg-primary)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/20"
            >
              <option value="">None</option>
              {poems.map((poem) => (
                <option key={poem.id} value={poem.id}>
                  {poem.title}
                </option>
              ))}
            </select>
          </div>

          {/* Subscriber Info */}
          <div className="p-4 bg-[var(--bg-secondary)] rounded-lg">
            <div className="text-sm text-[var(--text-tertiary)]">
              Active subscribers: <strong className="text-[var(--text-primary)]">{subscriberCount}</strong>
            </div>
          </div>

          {/* Test Email */}
          <div className="p-4 border border-[var(--border)] rounded-lg">
            <h3 className="font-medium mb-3 text-[var(--text-primary)]">Send Test Email</h3>
            <div className="flex gap-2">
              <label htmlFor="test-email" className="sr-only">
                Test email address
              </label>
              <input
                id="test-email"
                type="email"
                value={testEmail}
                onChange={(e) => setTestEmail(e.target.value)}
                placeholder="test@example.com"
                className="flex-1 px-3 py-2 border border-[var(--border)] rounded bg-[var(--bg-primary)] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/20"
              />
              <button
                onClick={handleSendTest}
                disabled={isSending}
                className="px-4 py-2 border border-[var(--border)] rounded hover:border-[var(--accent)] transition-colors disabled:opacity-50 text-[var(--text-primary)]"
              >
                {isSending ? 'Sending...' : 'Send Test'}
              </button>
            </div>
          </div>

          {/* Send Buttons */}
          <div className="flex gap-4">
            <button
              onClick={handleSendAllClick}
              disabled={isSending || subscriberCount === 0}
              className="px-6 py-2 bg-[var(--accent)] text-white rounded hover:bg-[var(--accent-hover)] transition-colors disabled:opacity-50"
            >
              {isSending ? 'Sending...' : `Send to ${subscriberCount} Subscribers`}
            </button>
            <button
              onClick={() => router.back()}
              className="px-6 py-2 border border-[var(--border)] rounded hover:border-[var(--accent)] transition-colors text-[var(--text-primary)]"
            >
              Cancel
            </button>
          </div>
        </div>

        {/* Right: Preview */}
        <div>
          <h3 className="text-sm font-medium mb-3 text-[var(--text-primary)]">Preview</h3>
          <div className="bg-[var(--bg-primary)] border border-[var(--border)] rounded-lg p-6 min-h-[400px]">
            {subject || bodyHtml || selectedPoem ? (
              <div>
                {/* Subject Preview */}
                {subject && (
                  <h2 className="text-xl mb-4 pb-4 border-b border-[var(--border)] text-[var(--text-primary)]">
                    {subject}
                  </h2>
                )}

                {/* Body Preview */}
                {bodyHtml && (
                  <div
                    className="prose prose-lg max-w-none text-[var(--text-primary)] [&_p]:mb-0 [&_p]:min-h-[1.5em] leading-relaxed"
                    style={{ fontFamily: 'var(--font-serif)' }}
                    dangerouslySetInnerHTML={{ __html: bodyHtml }}
                  />
                )}

                {/* Poem Preview */}
                {selectedPoem && (
                  <div className={bodyHtml ? 'mt-6 pt-6 border-t border-[var(--border)]' : ''}>
                    <h3 className="text-lg font-medium mb-3 text-[var(--text-primary)]">
                      {selectedPoem.title}
                    </h3>
                    <div
                      className="whitespace-pre-line text-[var(--text-primary)] leading-relaxed"
                      style={{ fontFamily: 'var(--font-serif)' }}
                    >
                      {selectedPoem.plain_text || selectedPoem.content}
                    </div>
                    <div className="mt-4 text-sm text-[var(--accent)]">
                      Read on Blumenous Poetry &rarr;
                    </div>
                  </div>
                )}

                {/* Footer Preview */}
                <div className="mt-8 pt-4 border-t border-[var(--border)] text-center text-sm text-[var(--text-tertiary)]">
                  <p>Blumenous Poetry</p>
                  <p className="underline">Unsubscribe</p>
                </div>
              </div>
            ) : (
              <div className="text-[var(--text-tertiary)] text-center pt-20">
                Start composing to see preview
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Send confirmation modal */}
      <ConfirmModal
        isOpen={showSendConfirm}
        onClose={() => setShowSendConfirm(false)}
        onConfirm={handleSendAllConfirm}
        title="Send Newsletter"
        message={`Are you sure you want to send this newsletter to ${subscriberCount} subscriber${subscriberCount !== 1 ? 's' : ''}? This action cannot be undone.`}
        confirmText="Send Newsletter"
        variant="warning"
        isLoading={isSending}
      />
    </div>
  );
}
