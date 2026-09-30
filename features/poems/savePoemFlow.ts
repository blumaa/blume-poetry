import type { FlashToast } from '@/lib/flashToast';
import type { PoemInsert } from '@/lib/supabase/types';
import { notifyPoem, revalidatePoems, savePoem } from './api/poems';

interface SavePoemFlowInput {
  /** null for a new poem. */
  id: string | null;
  poem: PoemInsert & { slug: string };
  /** Email subscribers after saving. */
  notify: boolean;
}

const reason = (error: unknown) => (error instanceof Error ? error.message : 'unknown error');

/**
 * Saves the poem, then refreshes the public site and optionally emails
 * subscribers. A failed save throws. Once saved, nothing is rolled back: each
 * failed follow-up is named in the returned toast so the admin knows which
 * half went wrong.
 */
export async function savePoemFlow({ id, poem, notify }: SavePoemFlowInput): Promise<FlashToast> {
  const savedId = await savePoem(id, poem);
  const failures: string[] = [];
  let message = id ? 'Changes saved' : `"${poem.title}" created`;

  try {
    await revalidatePoems([`/poem/${poem.slug}`]);
  } catch (error) {
    failures.push(`the site refresh failed: ${reason(error)}`);
  }

  if (notify) {
    try {
      const result = await notifyPoem(savedId);
      message = result.alreadyNotified
        ? `${message}. Subscribers had already been emailed about this poem`
        : `${message}. Emailed ${result.sent} subscriber${result.sent === 1 ? '' : 's'}`;
    } catch (error) {
      failures.push(`the email failed: ${reason(error)}`);
    }
  }

  return failures.length > 0
    ? { title: `Saved, but ${failures.join('; ')}`, tone: 'danger' }
    : { title: message, tone: 'success' };
}
