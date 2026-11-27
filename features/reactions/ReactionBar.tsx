'use client';

import { useMemo, useState } from 'react';
import { Button, CountButton, Inline } from '@/components/mds';
import { Icon } from '@/components/icons';
import type { ReactionCount } from './api/reactions';
import styles from './ReactionBar.module.css';

export interface ReactionBarProps {
  /** Which comment the row counts: several rows stand on one page. */
  label: string;
  reactions: readonly ReactionCount[];
  /** Every emoji this reader left; tapping one takes it back. */
  mine?: readonly string[];
  onSelect: (emoji: string) => void;
  /** How many emoji show before the rest fold away. */
  max?: number;
  onAdd?: () => void;
  /** A reaction is being written; nothing here may be pressed until it lands. */
  pending?: boolean;
}

const NONE: readonly string[] = [];

const countLabel = (emoji: string, count: number) =>
  `${emoji}, ${count} ${count === 1 ? 'reaction' : 'reactions'}`;

export function ReactionBar({
  label,
  reactions,
  mine = NONE,
  onSelect,
  max = 6,
  onAdd,
  pending = false,
}: ReactionBarProps) {
  const [expanded, setExpanded] = useState(false);

  const ranked = useMemo(() => [...reactions].sort((a, b) => b.count - a.count), [reactions]);
  const shown = expanded ? ranked : ranked.slice(0, max);
  const hidden = ranked.length - shown.length;

  if (shown.length === 0 && onAdd === undefined) return null;

  return (
    <Inline gap="tight" wrap role="group" aria-label={label} aria-busy={pending || undefined}>
      {shown.map(({ emoji, count }) => (
        <CountButton
          key={emoji}
          icon={<span className={styles.emoji}>{emoji}</span>}
          label={countLabel(emoji, count)}
          active={mine.includes(emoji)}
          disabled={pending}
          onClick={() => onSelect(emoji)}
        >
          {/* Element child: the label already speaks the count. */}
          <span>{count}</span>
        </CountButton>
      ))}

      {hidden > 0 && (
        <Button variant="ghost" size="sm" aria-label={`Show ${hidden} more`} disabled={pending} onClick={() => setExpanded(true)}>
          {`+${hidden}`}
        </Button>
      )}

      {onAdd !== undefined && (
        <Button variant="ghost" size="sm" iconOnly aria-label="Add a reaction" disabled={pending} onClick={onAdd}>
          <Icon name="smile-plus" />
        </Button>
      )}
    </Inline>
  );
}
