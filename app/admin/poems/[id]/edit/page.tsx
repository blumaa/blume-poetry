'use client';

import { use } from 'react';
import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { PoemEditor } from '@/components/admin/PoemEditor';
import type { Poem } from '@/lib/supabase/types';
import styles from './page.module.css';

interface EditPoemPageProps {
  params: Promise<{ id: string }>;
}

async function fetchPoemById(id: string): Promise<Poem> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('poems')
    .select('*')
    .eq('id', id)
    .single();

  if (error) throw new Error(error.message);
  return data as Poem;
}

export default function EditPoemPage({ params }: EditPoemPageProps) {
  const { id } = use(params);

  const { data: poem, isPending, error } = useQuery({
    queryKey: ['admin', 'poems', 'byId', id],
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
