import { apiFetch } from '@/lib/apiFetch';
import { createClient } from '@/lib/supabase/client';
import type { PoemRow, SubscriberRow } from '@/lib/supabase/types';

export type SubscriberFilter = 'all' | 'active' | 'unsubscribed';

export interface SubscribeInput {
  email: string;
  notifyNewPoems: boolean;
}

/** What the send page's poem picker and preview show. */
export type SendPoem = Pick<PoemRow, 'id' | 'title' | 'content' | 'plain_text'>;

export interface SendData {
  poems: SendPoem[];
  subscriberCount: number;
}

export interface NewsletterInput {
  subject: string;
  bodyHtml: string;
  bodyText: string;
  poemId?: string;
  /** Sends only to this address when set. */
  testEmail?: string;
}

/** Admin list, newest first. */
export async function fetchSubscribers(filter: SubscriberFilter): Promise<SubscriberRow[]> {
  let query = createClient()
    .from('subscribers')
    .select('*')
    .order('subscribed_at', { ascending: false });

  if (filter !== 'all') {
    query = query.eq('status', filter);
  }

  const { data } = await query.throwOnError();
  return data;
}

export async function deleteSubscriber(id: string): Promise<void> {
  await createClient().from('subscribers').delete().eq('id', id).throwOnError();
}

export async function setNotifyNewPoems(id: string, notify: boolean): Promise<void> {
  await createClient()
    .from('subscribers')
    .update({ notify_new_poems: notify })
    .eq('id', id)
    .throwOnError();
}

/** A visitor signs themselves up. */
export async function subscribe(input: SubscribeInput): Promise<void> {
  await apiFetch('/api/subscribe', { method: 'POST', json: input });
}

/** The admin adds someone. The preference is theirs to set, so only the email goes. */
export async function addSubscriber(email: string): Promise<void> {
  await apiFetch('/api/admin/subscribers', { method: 'POST', json: { email } });
}

/** Recent published poems to attach, and how many people a send reaches. */
export async function fetchSendData(): Promise<SendData> {
  const supabase = createClient();

  const [{ data: poems }, { count }] = await Promise.all([
    supabase
      .from('poems')
      .select('id, title, content, plain_text')
      .eq('status', 'published')
      .order('published_at', { ascending: false })
      .limit(20)
      .throwOnError(),
    supabase
      .from('subscribers')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'active')
      .throwOnError(),
  ]);

  return { poems, subscriberCount: count ?? 0 };
}

export async function sendNewsletter(input: NewsletterInput): Promise<{ message?: string }> {
  return apiFetch<{ message?: string }>('/api/admin/send-email', { method: 'POST', json: input });
}
