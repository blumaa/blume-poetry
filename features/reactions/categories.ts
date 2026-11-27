import type { EmojiCategory } from './api/emoji';

/** The picker's tabs. Each chip shows an emoji from its own tab — kinbaku's
    symbols chip showed ❤️, which Unicode files under smileys. */
export const CATEGORIES: readonly { key: EmojiCategory; glyph: string; label: string }[] = [
  { key: 'smileys', glyph: '😀', label: 'Smileys' },
  { key: 'people', glyph: '👋', label: 'People' },
  { key: 'nature', glyph: '🐻', label: 'Nature' },
  { key: 'food', glyph: '🍔', label: 'Food' },
  { key: 'travel', glyph: '🚗', label: 'Travel' },
  { key: 'activities', glyph: '⚽', label: 'Activities' },
  { key: 'objects', glyph: '💡', label: 'Objects' },
  { key: 'symbols', glyph: '🔣', label: 'Symbols' },
  { key: 'flags', glyph: '🏳️', label: 'Flags' },
];
