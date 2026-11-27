import type { EmojiCategory, EmojiChoice } from './api/emoji';
import type { Tone } from './emojiPrefs';

export interface GridFilter {
  query: string;
  category: EmojiCategory;
  tone: Tone;
}

/** Bases of one category, or of all when searching. The chosen tone's variant
    stands in under the base's name. */
export function emojiGrid(catalogue: readonly EmojiChoice[], filter: GridFilter): EmojiChoice[] {
  const needle = filter.query.trim().toLowerCase();
  const toned = new Map<string, string>();
  if (filter.tone !== 0) {
    for (const item of catalogue) {
      if (item.base !== null && item.tone === filter.tone) toned.set(item.base, item.char);
    }
  }

  const matches = (item: EmojiChoice) =>
    needle
      ? item.name.toLowerCase().includes(needle) || item.tags.some((tag) => tag.toLowerCase().includes(needle))
      : item.category === filter.category;

  const grid: EmojiChoice[] = [];
  for (const item of catalogue) {
    if (item.base !== null || !matches(item)) continue;
    const char = toned.get(item.char);
    grid.push(char === undefined ? item : { ...item, char });
  }
  return grid;
}
