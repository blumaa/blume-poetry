'use client';

import dynamic from 'next/dynamic';
import styles from './LazyRichTextEditor.module.css';

/* tiptap is large and admin-only, and needs the DOM. Loading it on demand keeps
   it out of the page bundle; every editor screen imports this, not the module. */
export const RichTextEditor = dynamic(
  () => import('./RichTextEditor').then((m) => m.RichTextEditor),
  { ssr: false, loading: () => <div className={styles.skeleton} /> }
);
