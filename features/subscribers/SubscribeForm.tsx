'use client';

import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Button, Checkbox, Input, useToast } from '@/components/mds';
import { subscribe } from './api/subscribers';
import styles from './SubscribeForm.module.css';

interface SubscribeFormProps {
  compact?: boolean;
}

export function SubscribeForm({ compact = false }: SubscribeFormProps) {
  const [email, setEmail] = useState('');
  // The compact form has no room for a checkbox, so it signs people up for
  // new-poem emails — which is what the sidebar copy promises. Either way the
  // preference is one click away from any email they get.
  const [notifyNewPoems, setNotifyNewPoems] = useState(true);
  const { toast } = useToast();

  const mutation = useMutation({
    mutationFn: () => subscribe({ email, notifyNewPoems }),
    onSuccess: () => {
      toast({ title: 'Thank you for subscribing!', tone: 'success' });
      setEmail('');
    },
    onError: (error) => toast({ title: error.message, tone: 'danger' }),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mutation.mutate();
  };

  if (mutation.isSuccess) {
    return (
      <div className={`${styles.successMsg} ${compact ? styles.compactText : styles.centerText}`}>
        Thank you for subscribing!
      </div>
    );
  }

  if (compact) {
    return (
      <form onSubmit={handleSubmit} className={styles.compactForm}>
        <Input
          type="email"
          aria-label="Email address"
          size="sm"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="your@email.com"
          required
          disabled={mutation.isPending}
          className={styles.compactInput}
        />
        <Button type="submit" size="sm" loading={mutation.isPending}>
          Go
        </Button>
      </form>
    );
  }

  return (
    <form onSubmit={handleSubmit} className={styles.form}>
      <div className={styles.row}>
        <Input
          type="email"
          aria-label="Email address"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="your@email.com"
          required
          disabled={mutation.isPending}
          className={styles.input}
        />
        <Button type="submit" loading={mutation.isPending}>
          {mutation.isPending ? 'Subscribing...' : 'Subscribe'}
        </Button>
      </div>

      <div className={styles.checkboxRow}>
        <Checkbox
          label="Email me when a new poem is published"
          checked={notifyNewPoems}
          onChange={(e) => setNotifyNewPoems(e.target.checked)}
          disabled={mutation.isPending}
        />
      </div>
    </form>
  );
}
