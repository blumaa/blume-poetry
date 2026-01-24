'use client';

import { useState } from 'react';
import { Modal } from './Modal';
import { trackSubscribeSubmit } from './AmplitudeProvider';

interface SubscribeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  isAdmin?: boolean;
}

export function SubscribeModal({ isOpen, onClose, onSuccess, isAdmin = false }: SubscribeModalProps) {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('loading');

    try {
      const endpoint = isAdmin ? '/api/admin/subscribers' : '/api/subscribe';
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (response.ok) {
        if (!isAdmin) trackSubscribeSubmit(true);
        setStatus('success');
        setMessage(isAdmin ? 'Subscriber added!' : 'Thank you for subscribing!');
        setEmail('');
        onSuccess?.();
      } else {
        if (!isAdmin) trackSubscribeSubmit(false);
        setStatus('error');
        setMessage(data.error || 'Failed to subscribe');
      }
    } catch {
      setStatus('error');
      setMessage('An unexpected error occurred');
    }
  };

  const resetAndClose = () => {
    setStatus('idle');
    setEmail('');
    setMessage('');
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={resetAndClose}>
      <h2 className="sr-only">{isAdmin ? 'Add subscriber' : 'Subscribe to newsletter'}</h2>
      <p className="text-secondary mb-6">
        {isAdmin ? 'Add a new subscriber manually.' : 'Get notified when new poetry is published.'}
      </p>

      {status === 'success' ? (
        <div className="text-center py-4">
          <div className="text-accent mb-4">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-12 w-12 mx-auto"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
          <p className="text-primary">{message}</p>
          <button
            onClick={resetAndClose}
            className="mt-4 px-4 py-2 text-secondary hover:text-primary transition-colors min-h-[44px]"
          >
            Close
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="modal-subscribe-email" className="sr-only">
              Email address
            </label>
            <input
              id="modal-subscribe-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              required
              autoFocus
              aria-describedby={status === 'error' ? 'modal-subscribe-error' : undefined}
              className="w-full px-4 py-3 border border-border rounded bg-surface text-primary placeholder:text-tertiary focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 transition-colors min-h-[44px]"
              disabled={status === 'loading'}
            />
          </div>
          {status === 'error' && (
            <p id="modal-subscribe-error" className="text-red-600 text-sm" role="alert">{message}</p>
          )}
          <button
            type="submit"
            disabled={status === 'loading'}
            className="w-full px-4 py-3 bg-accent text-white rounded hover:bg-accent-hover transition-colors disabled:opacity-50 font-medium min-h-[44px]"
          >
            {status === 'loading' ? (isAdmin ? 'Adding...' : 'Subscribing...') : (isAdmin ? 'Add Subscriber' : 'Subscribe')}
          </button>
        </form>
      )}
    </Modal>
  );
}
