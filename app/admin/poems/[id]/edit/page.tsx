'use client';

import { useEffect, useState, use } from 'react';
import { createClient } from '@/lib/supabase/client';
import { PoemEditor } from '@/components/admin/PoemEditor';
import type { Poem } from '@/lib/supabase/types';

interface EditPoemPageProps {
  params: Promise<{ id: string }>;
}

export default function EditPoemPage({ params }: EditPoemPageProps) {
  const { id } = use(params);
  const [poem, setPoem] = useState<Poem | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();

    async function fetchPoem() {
      const { data, error: fetchError } = await supabase
        .from('poems')
        .select('*')
        .eq('id', id)
        .single();

      if (fetchError) {
        setError(fetchError.message);
      } else {
        setPoem(data as Poem);
      }
      setIsLoading(false);
    }

    fetchPoem();
  }, [id]);

  if (isLoading) {
    return <div className="text-[var(--text-tertiary)]">Loading poem...</div>;
  }

  if (error) {
    return <div className="text-red-600">Error: {error}</div>;
  }

  if (!poem) {
    return <div className="text-[var(--text-tertiary)]">Poem not found</div>;
  }

  return (
    <div>
      <h1 className="text-2xl mb-6 text-[var(--text-primary)]">Edit Poem</h1>
      <PoemEditor poem={poem} />
    </div>
  );
}
