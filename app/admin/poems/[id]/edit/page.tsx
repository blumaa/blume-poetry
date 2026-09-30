'use client';

import { use } from 'react';
import { useQuery } from '@tanstack/react-query';
import { PoemEditor, fetchPoemById } from '@/features/poems';
import { queryKeys } from '@/lib/queryKeys';
import styles from './page.module.css';

interface EditPoemPageProps {
  params: Promise<{ id: string }>;
}

export default function EditPoemPage({ params }: EditPoemPageProps) {
  const { id } = use(params);

  const { data: poem, isPending, error } = useQuery({
    queryKey: queryKeys.admin.poem(id),
    queryFn: () => fetchPoemById(id),
  });

  if (isPending) {
    return <div className={styles.stateMessage}>Loading poem...</div>;
  }

  if (error) {
    return <div className={styles.errorText}>Error: {error.message}</div>;
  }

  if (!poem) {
    return <div className={styles.stateMessage}>Poem not found</div>;
  }

  return (
    <div>
      <h1 className={styles.title}>Edit Poem</h1>
      <PoemEditor poem={poem} />
    </div>
  );
}
