'use client';

import { useMemo, useState } from 'react';
import { Chip, ChipBar, Input, SegmentedControl, Skeleton, Stack, Text } from '@/components/mds';
import { Icon } from '@/components/icons';
import type { EmojiCategory, EmojiChoice } from './api/emoji';
import { CATEGORIES } from './categories';
import { EmojiCell } from './EmojiCell';
import { emojiGrid } from './emojiGrid';
import { quickRow, recentEmoji, rememberEmoji, storedTone, storeTone, TONES, type Tone } from './emojiPrefs';
import styles from './ReactionPicker.module.css';

export interface ReactionPickerProps {
  emoji: readonly EmojiChoice[];
  onSelect: (char: string) => void;
  /** Every emoji this reader already left here. */
  selected?: readonly string[];
  /** The catalogue is still on its way: ghosts, not an empty grid. */
  loading?: boolean;
  /** A pick is being written; the grid stays on screen but takes no more. */
  pending?: boolean;
}

/* Enough to fill the grid before the catalogue lands. */
const GHOSTS = 24;
const NONE: readonly string[] = [];

const TONE_OPTIONS = TONES.map((tone) => ({
  value: String(tone),
  label: tone === 0 ? '✋' : `✋${String.fromCodePoint(0x1f3fa + tone)}`,
}));

export function ReactionPicker({
  emoji,
  onSelect,
  selected = NONE,
  loading = false,
  pending = false,
}: ReactionPickerProps) {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<EmojiCategory>('smileys');
  const [tone, setTone] = useState<Tone>(storedTone);
  const [recent] = useState(recentEmoji);

  const searching = query.trim() !== '';
  const shown = useMemo(() => emojiGrid(emoji, { query, category, tone }), [emoji, query, category, tone]);

  const quick = useMemo(() => {
    const byChar = new Map(emoji.map((item) => [item.char, item]));
    // A recent emoji the catalogue dropped drops out.
    const recentChoices = recent.flatMap((char) => byChar.get(char) ?? []);
    return quickRow(recentChoices, emoji.filter((item) => item.quick));
  }, [emoji, recent]);

  const pick = (char: string) => {
    rememberEmoji(char);
    onSelect(char);
  };

  const chooseTone = (value: string) => {
    const next = TONES.find((item) => String(item) === value) ?? 0;
    setTone(next);
    storeTone(next);
  };

  const cell = (item: EmojiChoice) => (
    <EmojiCell
      key={item.char}
      char={item.char}
      name={item.name}
      selected={selected.includes(item.char)}
      disabled={pending}
      onSelect={pick}
    />
  );

  return (
    <Stack>
      {quick.length > 0 && (
        <div role="group" aria-label="Quick reactions" className={styles.quick}>
          {quick.map(cell)}
        </div>
      )}

      <Input
        type="search"
        aria-label="Search emoji"
        placeholder="Search emoji"
        iconLeft={<Icon name="search" />}
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        clearLabel="Clear search"
        onClear={() => setQuery('')}
      />

      <ChipBar aria-label="Emoji categories">
        {CATEGORIES.map(({ key, glyph, label }) => (
          <Chip
            key={key}
            selected={!searching && key === category}
            aria-label={label}
            onClick={() => {
              setCategory(key);
              setQuery('');
            }}
          >
            {glyph}
          </Chip>
        ))}
      </ChipBar>

      <SegmentedControl label="Skin tone" size="sm" value={String(tone)} onChange={chooseTone} options={TONE_OPTIONS} />

      {/* The sheet's body is the one scroller; a second one here would swallow the swipe. */}
      {loading ? (
        <div className={styles.grid} aria-busy="true">
          {Array.from({ length: GHOSTS }, (_, i) => (
            <Skeleton key={i} variant="rect" className={styles.ghost} />
          ))}
        </div>
      ) : shown.length === 0 ? (
        <Text variant="meta" tone="muted" className={styles.empty}>
          No emoji match that
        </Text>
      ) : (
        <div role="group" aria-label="Emoji" className={styles.grid} aria-busy={pending || undefined}>
          {shown.map(cell)}
        </div>
      )}
    </Stack>
  );
}
