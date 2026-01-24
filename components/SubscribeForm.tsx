'use client';

import { useState } from 'react';
import { useToast } from '@/components/Toast';
import { trackSubscribeSubmit } from './AmplitudeProvider';

interface SubscribeFormProps {
  compact?: boolean;
}

export function SubscribeForm({ compact = false }: SubscribeFormProps) {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success'>('idle');
  const { showToast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('loading');

    try {
      const response = await fetch('/api/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (response.ok) {
        trackSubscribeSubmit(true);
        setStatus('success');
        showToast('Thank you for subscribing!', 'success');
        setEmail('');
      } else {
        trackSubscribeSubmit(false);
        setStatus('idle');
        showToast(data.error || 'Failed to subscribe', 'error');
      }
    } catch {
      setStatus('idle');
      showToast('An unexpected error occurred', 'error');
    }
  };

  if (status === 'success') {
    return (
      <div className={`text-secondary ${compact ? 'text-xs' : 'text-center'}`}>
        Thank you for subscribing!
      </div>
    );
  }

  if (compact) {
    return (
      <form onSubmit={handleSubmit} className="flex gap-1">
        <label htmlFor="subscribe-email-compact" className="sr-only">
          Email address
        </label>
        <input
          id="subscribe-email-compact"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="your@email.com"
          required
          className="flex-1 min-w-0 px-2 py-1.5 text-sm border border-border rounded bg-surface text-primary placeholder:text-tertiary focus:outline-none focus:border-accent"
          disabled={status === 'loading'}
        />
        <button
          type="submit"
          disabled={status === 'loading'}
          className="px-2 py-1.5 text-sm bg-accent text-white rounded hover:bg-accent-hover transition-colors disabled:opacity-50 shrink-0"
        >
          {status === 'loading' ? '...' : 'Go'}
        </button>
      </form>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-2 max-w-md mx-auto">
      <label htmlFor="subscribe-email" className="sr-only">
        Email address
      </label>
      <input
        id="subscribe-email"
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="your@email.com"
        required
        className="flex-1 px-4 py-3 border border-border rounded bg-surface text-primary placeholder:text-tertiary focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 min-h-[44px]"
        disabled={status === 'loading'}
      />
      <button
        type="submit"
        disabled={status === 'loading'}
        className="px-6 py-3 bg-accent text-white rounded hover:bg-accent-hover transition-colors disabled:opacity-50 min-h-[44px] font-medium"
      >
        {status === 'loading' ? 'Subscribing...' : 'Subscribe'}
      </button>
    </form>
  );
}
