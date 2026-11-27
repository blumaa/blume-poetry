import type { EmojiChoice } from './api/emoji';
import { emojiGrid } from './emojiGrid';

const row = (char: string, extra: Partial<EmojiChoice> = {}): EmojiChoice => ({
  char,
  name: char,
  tags: [],
  category: 'smileys',
  base: null,
  tone: null,
  quick: false,
  ...extra,
});

const CATALOGUE: EmojiChoice[] = [
  row('😀', { name: 'Grinning face', tags: ['happy'] }),
  row('👍', { name: 'Thumbs up', category: 'people', tags: ['yes'] }),
  row('👍🏻', { name: 'Thumbs up: light', category: 'people', base: '👍', tone: 1 }),
  row('👍🏽', { name: 'Thumbs up: medium', category: 'people', base: '👍', tone: 3 }),
  row('🌙', { name: 'Crescent moon', category: 'travel', tags: ['night'] }),
];

const chars = (grid: EmojiChoice[]) => grid.map((e) => e.char);

describe('emojiGrid', () => {
  it('shows one category, bases only', () => {
    expect(chars(emojiGrid(CATALOGUE, { query: '', category: 'people', tone: 0 }))).toEqual(['👍']);
  });

  it('swaps in the chosen tone where one exists, under the base name', () => {
    expect(emojiGrid(CATALOGUE, { query: '', category: 'people', tone: 3 })).toEqual([
      expect.objectContaining({ char: '👍🏽', name: 'Thumbs up' }),
    ]);
  });

  it('keeps an emoji with no toned form as it is', () => {
    expect(chars(emojiGrid(CATALOGUE, { query: '', category: 'smileys', tone: 3 }))).toEqual(['😀']);
  });

  it('searches every category, by name and by tag, ignoring case', () => {
    expect(chars(emojiGrid(CATALOGUE, { query: 'NIGHT', category: 'smileys', tone: 0 }))).toEqual(['🌙']);
    expect(chars(emojiGrid(CATALOGUE, { query: 'thumbs', category: 'smileys', tone: 0 }))).toEqual(['👍']);
  });

  it('does not match toned variants on their own names', () => {
    expect(emojiGrid(CATALOGUE, { query: 'medium', category: 'smileys', tone: 0 })).toEqual([]);
  });
});
