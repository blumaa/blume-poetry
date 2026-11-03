'use client';

import { useState, type ReactNode } from 'react';
import { Icon } from '@/components/icons';
import styles from './Collapse.module.css';

export interface CollapseProps {
  open: boolean;
  children: ReactNode;
  className?: string;
}

/* Folds its contents to nothing and back; mounted on first open, kept after
   so closing animates. */
export function Collapse({ open, children, className }: CollapseProps) {
  const [shown, setShown] = useState(open);
  if (open && !shown) setShown(true);

  return (
    <div
      className={[styles.collapse, className].filter(Boolean).join(' ')}
      data-open={open || undefined}
      inert={!open}
    >
      <div className={styles.inner}>{shown ? children : null}</div>
    </div>
  );
}

/** Points down (or right) when folded and turns over when open. */
export function CollapseChevron({ open, from = 'down' }: { open: boolean; from?: 'down' | 'right' }) {
  return (
    <span className={styles.chevron} data-from={from} data-open={open || undefined}>
      <Icon name={from === 'down' ? 'chevron-down' : 'chevron-right'} />
    </span>
  );
}
