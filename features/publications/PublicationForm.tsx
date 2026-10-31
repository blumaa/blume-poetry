'use client';

import { useState, type SubmitEvent } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Button, Field, Input, Select, useToast } from '@/components/mds';
import { fetchAdminPoems } from '@/features/poems';
import { queryKeys } from '@/lib/queryKeys';
import type { PublicationRow } from '@/lib/supabase/types';
import { revalidatePublications, savePublication } from './api/publications';
import styles from './PublicationForm.module.css';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

/* Only published main poems can be linked: the public page reads the poem
   under the anon key, which sees nothing else. */
const LINKABLE_POEMS = { collection: 'main', status: 'published' } as const;

interface PublicationFormProps {
  /** Absent for a new publication. */
  publication?: PublicationRow;
  onSaved: () => void;
  onCancel: () => void;
}

export function PublicationForm({ publication, onSaved, onCancel }: PublicationFormProps) {
  const { toast } = useToast();
  const [poemId, setPoemId] = useState(publication?.poem_id ?? '');
  const [poemTitle, setPoemTitle] = useState(publication?.poem_title ?? '');
  const [journal, setJournal] = useState(publication?.journal ?? '');
  const [url, setUrl] = useState(publication?.url ?? '');
  // published_on is YYYY-MM-01.
  const [month, setMonth] = useState(publication?.published_on.slice(5, 7) ?? '');
  const [year, setYear] = useState(publication?.published_on.slice(0, 4) ?? '');

  const { data: poems = [] } = useQuery({
    queryKey: queryKeys.admin.poems(LINKABLE_POEMS),
    queryFn: () => fetchAdminPoems(LINKABLE_POEMS),
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      await savePublication(publication?.id ?? null, {
        poem_id: poemId || null,
        poem_title: poemTitle.trim(),
        journal: journal.trim(),
        url: url.trim() || null,
        published_on: `${year}-${month}-01`,
      });
      await revalidatePublications();
    },
    onSuccess: () => {
      toast({ title: publication ? 'Publication saved' : 'Publication added', tone: 'success' });
      onSaved();
    },
    onError: (error) => toast({ title: error.message, tone: 'danger' }),
  });

  const choosePoem = (id: string) => {
    setPoemId(id);
    const poem = poems.find((p) => p.id === id);
    if (poem && !poemTitle.trim()) setPoemTitle(poem.title);
  };

  const onSubmit = (event: SubmitEvent) => {
    event.preventDefault();
    saveMutation.mutate();
  };

  return (
    <form onSubmit={onSubmit} className={styles.form}>
      <Field label="Poem on this site" hint="Links the credit to the poem's page. Optional.">
        <Select value={poemId} onChange={(e) => choosePoem(e.target.value)}>
          <option value="">Not on this site</option>
          {poems.map((poem) => (
            <option key={poem.id} value={poem.id}>
              {poem.title}
            </option>
          ))}
        </Select>
      </Field>

      <Field label="Poem title" required>
        <Input value={poemTitle} onChange={(e) => setPoemTitle(e.target.value)} required />
      </Field>

      <Field label="Journal" required>
        <Input value={journal} onChange={(e) => setJournal(e.target.value)} required />
      </Field>

      <Field label="Link" hint="The published piece. Optional.">
        <Input type="url" value={url} onChange={(e) => setUrl(e.target.value)} />
      </Field>

      <div className={styles.dateRow}>
        <Field label="Month" required>
          <Select value={month} onChange={(e) => setMonth(e.target.value)} required>
            <option value="" disabled>
              Month
            </option>
            {MONTHS.map((name, index) => (
              <option key={name} value={String(index + 1).padStart(2, '0')}>
                {name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Year" required>
          <Input
            type="number"
            min={1900}
            max={9999}
            value={year}
            onChange={(e) => setYear(e.target.value)}
            required
          />
        </Field>
      </div>

      <div className={styles.actions}>
        <Button type="button" variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" loading={saveMutation.isPending}>
          Save
        </Button>
      </div>
    </form>
  );
}
