import { cx } from '@/components/mds';
import styles from './EmojiCell.module.css';

export interface EmojiCellProps {
  char: string;
  name: string;
  selected: boolean;
  disabled: boolean;
  onSelect: (char: string) => void;
}

/** One pressable emoji, shared by the picker's grid and its quick row. */
export function EmojiCell({ char, name, selected, disabled, onSelect }: EmojiCellProps) {
  return (
    <button
      type="button"
      disabled={disabled}
      className={cx(styles.cell, selected && styles.selected)}
      aria-label={name}
      aria-pressed={selected}
      onClick={() => onSelect(char)}
    >
      {char}
    </button>
  );
}
