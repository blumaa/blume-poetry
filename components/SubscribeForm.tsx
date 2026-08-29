'use client';

import { useState } from 'react';
import { Button, Checkbox, Input, useToast } from '@/components/mds';
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
  const [status, setStatus] = useState<'idle' | 'loading' | 'success'>('idle');
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('loading');

    try {
      const response = await fetch('/api/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, notifyNewPoems }),
      });

      const data = await response.json();

      if (response.ok) {
        setStatus('success');
        toast({ title: 'Thank you for subscribing!', tone: 'success' });
        setEmail('');
      } else {
        setStatus('idle');
        toast({ title: data.error || 'Failed to subscribe', tone: 'danger' });
      }
    } catch {
      setStatus('idle');
      toast({ title: 'An unexpected error occurred', tone: 'danger' });
    }
  };

  if (status === 'success') {
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
          disabled={status === 'loading'}
          className={styles.compactInput}
        />
        <Button type="submit" size="sm" loading={status === 'loading'}>
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
          disabled={status === 'loading'}
          className={styles.input}
        />
        <Button type="submit" loading={status === 'loading'}>
          {status === 'loading' ? 'Subscribing...' : 'Subscribe'}
        </Button>
      </div>

      <div className={styles.checkboxRow}>
        <Checkbox
          label="Email me when a new poem is published"
          checked={notifyNewPoems}
          onChange={(e) => setNotifyNewPoems(e.target.checked)}
          disabled={status === 'loading'}
        />
      </div>
    </form>
  );
}
