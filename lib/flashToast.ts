import { z } from 'zod';
import { clearStored, readStored, writeStored } from './browserStorage';

/* A toast raised on one page and shown on the next (e.g. save, then redirect).
   Session-scoped, read once. */
const flashToastSchema = z.object({
  title: z.string(),
  tone: z.enum(['success', 'danger']),
});

export type FlashToast = z.infer<typeof flashToastSchema>;

export function setFlashToast(toast: FlashToast): void {
  writeStored('flashToast', JSON.stringify(toast));
}

export function takeFlashToast(): FlashToast | null {
  const raw = readStored('flashToast');
  if (raw === null) return null;
  clearStored('flashToast');
  try {
    const parsed = flashToastSchema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : null;
  } catch {
    return null; // Not JSON: nothing worth showing.
  }
}
