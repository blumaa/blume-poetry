import { readFileSync } from 'fs';
import { join } from 'path';
import { CATEGORIES } from './categories';

/* The catalogue's rows are the source of truth for which tab an emoji is on. */
const rows = readFileSync(
  join(process.cwd(), 'supabase/migrations/20261127000100_emoji_catalogue_rows.sql'),
  'utf8'
);

function categoryOf(char: string): string | undefined {
  const line = rows.split('\n').find((l) => l.startsWith(`  ('${char}', `));
  return line?.match(/^  \('[^']+', '(?:[^']|'')*', '([a-z]+)'/)?.[1];
}

describe('picker tabs', () => {
  it.each(CATEGORIES.map((c) => [c.key, c.glyph]))(
    'the %s chip shows an emoji from that tab',
    (key, glyph) => {
      expect(categoryOf(glyph)).toBe(key);
    }
  );

  it('the catalogue files every heart under smileys, not symbols', () => {
    expect(categoryOf('❤️')).toBe('smileys');
  });
});
