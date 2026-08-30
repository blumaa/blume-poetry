'use client';

import { useState, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { RichTextEditor, RichTextEditorRef } from '@/components/admin/RichTextEditor';
import { Button, ConfirmDialog, Field, Input, Select, Tab, TabList, Tabs, useToast } from '@/components/mds';
import { PoemContent } from '@/components/PoemContent';
import { sanitizeNewsletterHtml } from '@/lib/sanitize';
import { contentToHtml } from '@/lib/poemHtml';
import type { Poem } from '@/lib/supabase/types';
import styles from './page.module.css';

async function fetchSendData(): Promise<{ poems: Poem[]; subscriberCount: number }> {
  const supabase = createClient();

  // Recent published poems
  const { data: poemsData, error: poemsError } = await supabase
    .from('poems')
    .select('*')
    .eq('status', 'published')
    .order('published_at', { ascending: false })
    .limit(20);
  if (poemsError) throw new Error(poemsError.message);

  // Active subscriber count
  const { count, error: countError } = await supabase
    .from('subscribers')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'active');
  if (countError) throw new Error(countError.message);

  return { poems: (poemsData as Poem[]) || [], subscriberCount: count || 0 };
}

interface SendEmailInput {
  subject: string;
  bodyHtml: string;
  bodyText: string;
  poemId?: string;
  testEmail?: string;
}

async function sendEmail(input: SendEmailInput): Promise<{ message?: string }> {
  const response = await fetch('/api/admin/send-email', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'Failed to send emails');
  }
  return data;
}

export default function SendNewsletterPage() {
  const [subject, setSubject] = useState('');
  const [bodyHtml, setBodyHtml] = useState('');
  const [bodyText, setBodyText] = useState('');
  const [selectedPoemId, setSelectedPoemId] = useState<string>('');
  const [testEmail, setTestEmail] = useState('');
  const [showSendConfirm, setShowSendConfirm] = useState(false);
  const [mobileTab, setMobileTab] = useState<'compose' | 'preview'>('compose');
  const router = useRouter();
  const editorRef = useRef<RichTextEditorRef>(null);
  const { toast } = useToast();

  const { data: sendData, isPending: isLoading } = useQuery({
    queryKey: ['admin', 'send-data'],
    queryFn: fetchSendData,
  });
  const poems = sendData?.poems ?? [];
  const subscriberCount = sendData?.subscriberCount ?? 0;

  const testMutation = useMutation({
    mutationFn: sendEmail,
    onSuccess: () => toast({ title: 'Test email sent', tone: 'success' }),
    onError: (error) =>
      toast({
        title: error instanceof Error ? error.message : 'An unexpected error occurred',
        tone: 'danger',
      }),
  });

  const sendAllMutation = useMutation({
    mutationFn: sendEmail,
    onSuccess: (data) => toast({ title: data.message ?? 'Newsletter sent', tone: 'success' }),
    onError: (error) =>
      toast({
        title: error instanceof Error ? error.message : 'An unexpected error occurred',
        tone: 'danger',
      }),
  });

  const isSending = testMutation.isPending || sendAllMutation.isPending;

  const handleEditorChange = (html: string, text: string) => {
    setBodyHtml(html);
    setBodyText(text);
  };

  const handleSendTest = () => {
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

    testMutation.mutate({
      subject,
      bodyHtml,
      bodyText,
      poemId: selectedPoemId || undefined,
      testEmail,
    });
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
    sendAllMutation.mutate({
      subject,
      bodyHtml,
      bodyText,
      poemId: selectedPoemId || undefined,
    });
  };

  const selectedPoem = poems.find((p) => p.id === selectedPoemId);

  // Sanitize HTML before rendering to prevent XSS
  const sanitizedBodyHtml = useMemo(() => sanitizeNewsletterHtml(bodyHtml), [bodyHtml]);

  if (isLoading) {
    return <div className={styles.loadingText}>Loading...</div>;
  }

  return (
    <div>
      <h1 className={styles.title}>Send Newsletter</h1>

      {/* Mobile tab toggle. Panels stay outside Tabs: on desktop both show
          side by side, which TabPanel's single-active rule can't express. */}
      <div className={styles.mobileTabs}>
        <Tabs value={mobileTab} onChange={(value) => setMobileTab(value as 'compose' | 'preview')}>
          <TabList label="Newsletter editor">
            <Tab value="compose">Compose</Tab>
            <Tab value="preview">Preview</Tab>
          </TabList>
        </Tabs>
      </div>

      <div className={styles.grid}>
        {/* Left: Compose */}
        <div className={`${styles.composePane} ${mobileTab !== 'compose' ? styles.paneHidden : ''}`}>
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
            <label className={styles.fieldLabel}>
              Body
            </label>
            <div className={styles.editorWrap}>
              <RichTextEditor
                ref={editorRef}
                onChange={handleEditorChange}
                minHeight="200px"
                className={styles.editorMinHeight}
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
          <div className={styles.subscriberInfo}>
            <div className={styles.subscriberInfoText}>
              Active subscribers: <strong className={styles.subscriberCount}>{subscriberCount}</strong>
            </div>
          </div>

          {/* Test Email */}
          <div className={styles.testEmailBox}>
            <h3 className={styles.testEmailHeading}>Send Test Email</h3>
            <div className={styles.testEmailRow}>
              <Input
                type="email"
                aria-label="Test email address"
                value={testEmail}
                onChange={(e) => setTestEmail(e.target.value)}
                placeholder="test@example.com"
                className={styles.testEmailInput}
              />
              <Button variant="secondary" onClick={handleSendTest} loading={isSending}>
                Send Test
              </Button>
            </div>
          </div>

          {/* Send Buttons */}
          <div className={styles.sendButtonsRow}>
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
        <div className={mobileTab !== 'preview' ? styles.paneHidden : ''}>
          <h3 className={styles.previewHeading}>Preview</h3>
          <div className={styles.previewBox}>
            {subject || sanitizedBodyHtml || selectedPoem ? (
              <div>
                {/* Subject Preview */}
                {subject && (
                  <h2 className={styles.subjectPreview}>
                    {subject}
                  </h2>
                )}

                {/* Body Preview */}
                {sanitizedBodyHtml && (
                  <div
                    className={styles.previewBody}
                    dangerouslySetInnerHTML={{ __html: sanitizedBodyHtml }}
                  />
                )}

                {/* Poem Preview */}
                {selectedPoem && (
                  <div className={bodyHtml ? styles.poemPreviewWrap : ''}>
                    <h3 className={styles.poemPreviewTitle}>
                      {selectedPoem.title}
                    </h3>
                    <PoemContent html={contentToHtml(selectedPoem.content || selectedPoem.plain_text || '')} />
                    <div className={styles.poemPreviewCta}>
                      Read on Blumenous Poetry &rarr;
                    </div>
                  </div>
                )}

                {/* Footer Preview */}
                <div className={styles.footerPreview}>
                  <p>Blumenous Poetry</p>
                  <p className={styles.unsubscribeText}>Unsubscribe</p>
                </div>
              </div>
            ) : (
              <div className={styles.previewPlaceholder}>
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
