'use client';

import { useState } from 'react';
import { useToast } from '@/components/Toast';

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
  const { showToast } = useToast();

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
        showToast('Thank you for subscribing!', 'success');
        setEmail('');
      } else {
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
          className="flex-1 min-w-0 px-2 py-1.5 text-sm border border-border rounded bg-surface text-primary placeholder:text-tertiary focus:outline-none focus:border-accent min-h-[44px]"
          disabled={status === 'loading'}
        />
        <button
          type="submit"
          disabled={status === 'loading'}
          className="px-3 py-1.5 text-sm bg-accent text-white rounded hover:bg-accent-hover transition-colors disabled:opacity-50 shrink-0 min-h-[44px]"
        >
          {status === 'loading' ? '...' : 'Go'}
        </button>
      </form>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-md mx-auto">
      <div className="flex flex-col sm:flex-row gap-2">
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
      </div>

      <label className="flex items-start gap-2 mt-3 text-sm text-secondary cursor-pointer">
        <input
          type="checkbox"
          checked={notifyNewPoems}
          onChange={(e) => setNotifyNewPoems(e.target.checked)}
          disabled={status === 'loading'}
          className="accent-accent mt-0.5"
        />
        <span>Email me when a new poem is published</span>
      </label>
    </form>
  );
}
