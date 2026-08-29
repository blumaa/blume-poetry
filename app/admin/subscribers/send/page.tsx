'use client';

import { useEffect, useState, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { RichTextEditor, RichTextEditorRef } from '@/components/admin/RichTextEditor';
import { Button, ConfirmDialog, Field, Input, Select, Tab, TabList, Tabs, useToast } from '@/components/mds';
import { PoemContent } from '@/components/PoemContent';
import { sanitizeNewsletterHtml } from '@/lib/sanitize';
import { contentToHtml } from '@/lib/poemHtml';
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
  const [mobileTab, setMobileTab] = useState<'compose' | 'preview'>('compose');
  const router = useRouter();
  const editorRef = useRef<RichTextEditorRef>(null);
  const { toast } = useToast();

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
      toast({ title: 'Please enter a subject', tone: 'danger' });
      return;
    }
    if (!bodyText.trim()) {
      toast({ title: 'Please enter body content', tone: 'danger' });
      return;
    }
    if (!testEmail) {
      toast({ title: 'Please enter a test email', tone: 'danger' });
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
        toast({ title: 'Test email sent', tone: 'success' });
      } else {
        toast({ title: data.error || 'Failed to send test email', tone: 'danger' });
      }
    } catch {
      toast({ title: 'An unexpected error occurred', tone: 'danger' });
    } finally {
      setIsSending(false);
    }
  };

  const handleSendAllClick = () => {
    if (!subject.trim()) {
      toast({ title: 'Please enter a subject', tone: 'danger' });
      return;
    }
    if (!bodyText.trim()) {
      toast({ title: 'Please enter body content', tone: 'danger' });
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
        toast({ title: data.message, tone: 'success' });
      } else {
        toast({ title: data.error || 'Failed to send emails', tone: 'danger' });
      }
    } catch {
      toast({ title: 'An unexpected error occurred', tone: 'danger' });
    } finally {
      setIsSending(false);
    }
  };

  const selectedPoem = poems.find((p) => p.id === selectedPoemId);

  // Sanitize HTML before rendering to prevent XSS
  const sanitizedBodyHtml = useMemo(() => sanitizeNewsletterHtml(bodyHtml), [bodyHtml]);

  if (isLoading) {
    return <div className="text-tertiary">Loading...</div>;
  }

  return (
    <div>
      <h1 className="text-2xl mb-6 text-primary">Send Newsletter</h1>

      {/* Mobile tab toggle. Panels stay outside Tabs: on desktop both show
          side by side, which TabPanel's single-active rule can't express. */}
      <div className="lg:hidden mb-6">
        <Tabs value={mobileTab} onChange={(value) => setMobileTab(value as 'compose' | 'preview')}>
          <TabList label="Newsletter editor">
            <Tab value="compose">Compose</Tab>
            <Tab value="preview">Preview</Tab>
          </TabList>
        </Tabs>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left: Compose */}
        <div className={`space-y-6 ${mobileTab !== 'compose' ? 'hidden lg:block' : ''}`}>
          {/* Subject */}
          <Field label="Subject">
            <Input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Newsletter subject..."
            />
          </Field>

          {/* Body */}
          <div>
            <label className="block text-sm font-medium mb-2 text-primary">
              Body
            </label>
            <div className="bg-surface border border-border rounded-lg p-4">
              <RichTextEditor
                ref={editorRef}
                onChange={handleEditorChange}
                minHeight="200px"
                className="min-h-[200px]"
              />
            </div>
          </div>

          {/* Poem Attachment (Optional) */}
          <Field label="Attach Poem" hint="Optional">
            <Select value={selectedPoemId} onChange={(e) => setSelectedPoemId(e.target.value)}>
              <option value="">None</option>
              {poems.map((poem) => (
                <option key={poem.id} value={poem.id}>
                  {poem.title}
                </option>
              ))}
            </Select>
          </Field>

          {/* Subscriber Info */}
          <div className="p-4 bg-surface-secondary rounded-lg">
            <div className="text-sm text-tertiary">
              Active subscribers: <strong className="text-primary">{subscriberCount}</strong>
            </div>
          </div>

          {/* Test Email */}
          <div className="p-4 border border-border rounded-lg">
            <h3 className="font-medium mb-3 text-primary">Send Test Email</h3>
            <div className="flex flex-col sm:flex-row gap-2">
              <Input
                type="email"
                aria-label="Test email address"
                value={testEmail}
                onChange={(e) => setTestEmail(e.target.value)}
                placeholder="test@example.com"
                className="flex-1"
              />
              <Button variant="secondary" onClick={handleSendTest} loading={isSending}>
                Send Test
              </Button>
            </div>
          </div>

          {/* Send Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
            <Button
              onClick={handleSendAllClick}
              loading={isSending}
              disabled={subscriberCount === 0}
            >
              {`Send to ${subscriberCount} Subscribers`}
            </Button>
            <Button variant="secondary" onClick={() => router.back()}>
              Cancel
            </Button>
          </div>
        </div>

        {/* Right: Preview */}
        <div className={mobileTab !== 'preview' ? 'hidden lg:block' : ''}>
          <h3 className="text-sm font-medium mb-3 text-primary">Preview</h3>
          <div className="bg-surface border border-border rounded-lg p-6 min-h-[400px]">
            {subject || sanitizedBodyHtml || selectedPoem ? (
              <div>
                {/* Subject Preview */}
                {subject && (
                  <h2 className="text-xl mb-4 pb-4 border-b border-border text-primary">
                    {subject}
                  </h2>
                )}

                {/* Body Preview */}
                {sanitizedBodyHtml && (
                  <div
                    className="prose prose-lg max-w-none text-primary [&_p]:mb-0 [&_p]:min-h-[1.5em] leading-relaxed"
                    dangerouslySetInnerHTML={{ __html: sanitizedBodyHtml }}
                  />
                )}

                {/* Poem Preview */}
                {selectedPoem && (
                  <div className={bodyHtml ? 'mt-6 pt-6 border-t border-border' : ''}>
                    <h3 className="text-lg font-medium mb-3 text-primary">
                      {selectedPoem.title}
                    </h3>
                    <PoemContent html={contentToHtml(selectedPoem.content || selectedPoem.plain_text || '')} />
                    <div className="mt-4 text-sm text-accent">
                      Read on Blumenous Poetry &rarr;
                    </div>
                  </div>
                )}

                {/* Footer Preview */}
                <div className="mt-8 pt-4 border-t border-border text-center text-sm text-tertiary">
                  <p>Blumenous Poetry</p>
                  <p className="underline">Unsubscribe</p>
                </div>
              </div>
            ) : (
              <div className="text-tertiary text-center pt-20">
                Start composing to see preview
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Send confirmation modal */}
      <ConfirmDialog
        open={showSendConfirm}
        onClose={() => setShowSendConfirm(false)}
        onConfirm={handleSendAllConfirm}
        title="Send Newsletter"
        description={`Are you sure you want to send this newsletter to ${subscriberCount} subscriber${subscriberCount !== 1 ? 's' : ''}? This action cannot be undone.`}
        confirmLabel="Send Newsletter"
        cancelLabel="Cancel"
        tone="warning"
      />
    </div>
  );
}
