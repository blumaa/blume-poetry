import { readStored, writeStored } from '@/lib/browserStorage';

const RECENT_MAX = 8;

/** 0 is the yellow default; 1–5 are the Fitzpatrick tones the catalogue's `tone` names. */
export type Tone = 0 | 1 | 2 | 3 | 4 | 5;
export const TONES: readonly Tone[] = [0, 1, 2, 3, 4, 5];

export function recentEmoji(): string[] {
  try {
    const value: unknown = JSON.parse(readStored('recentEmoji') ?? '[]');
    return Array.isArray(value) && value.every((item) => typeof item === 'string')
      ? value.slice(0, RECENT_MAX)
      : [];
  } catch {
    // Not JSON (another build wrote it): no recents, not a broken picker.
    return [];
  }
}

export function rememberEmoji(char: string): void {
  const next = [char, ...recentEmoji().filter((item) => item !== char)].slice(0, RECENT_MAX);
  writeStored('recentEmoji', JSON.stringify(next));
}

export function storedTone(): Tone {
  const value = Number(readStored('emojiTone'));
  return TONES.find((tone) => tone === value) ?? 0;
}

export function storeTone(tone: Tone): void {
  writeStored('emojiTone', String(tone));
}

/** Recent first, then the catalogue's quick ones; each once, eight at most. */
export function quickRow<T extends { char: string }>(recent: readonly T[], quick: readonly T[]): T[] {
  const seen = new Set<string>();
  return [...recent, ...quick]
    .filter((item) => !seen.has(item.char) && seen.add(item.char))
    .slice(0, RECENT_MAX);
}
