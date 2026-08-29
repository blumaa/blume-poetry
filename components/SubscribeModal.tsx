'use client';

import { useState } from 'react';
import { Button, Checkbox, Input, Modal, ModalBody, ModalHeader } from '@/components/mds';

interface SubscribeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  isAdmin?: boolean;
}

export function SubscribeModal({ isOpen, onClose, onSuccess, isAdmin = false }: SubscribeModalProps) {
  const [email, setEmail] = useState('');
  const [notifyNewPoems, setNotifyNewPoems] = useState(true);
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
        // The admin endpoint takes an email only; the preference belongs to
        // the person signing themselves up.
        body: JSON.stringify(isAdmin ? { email } : { email, notifyNewPoems }),
      });

      const data = await response.json();

      if (response.ok) {
        setStatus('success');
        setMessage(isAdmin ? 'Subscriber added!' : 'Thank you for subscribing!');
        setEmail('');
        onSuccess?.();
      } else {
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
    <Modal
      open={isOpen}
      onClose={resetAndClose}
      label={isAdmin ? 'Add subscriber' : 'Subscribe to newsletter'}
    >
      <ModalHeader>{isAdmin ? 'Add subscriber' : 'Subscribe to newsletter'}</ModalHeader>
      <ModalBody>
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
          <Button variant="ghost" onClick={resetAndClose} className="mt-4">
            Close
          </Button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            type="email"
            aria-label="Email address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="your@email.com"
            required
            autoFocus
            invalid={status === 'error'}
            aria-describedby={status === 'error' ? 'modal-subscribe-error' : undefined}
            disabled={status === 'loading'}
          />
          {!isAdmin && (
            <Checkbox
              label="Email me when a new poem is published"
              checked={notifyNewPoems}
              onChange={(e) => setNotifyNewPoems(e.target.checked)}
              disabled={status === 'loading'}
            />
          )}
          {status === 'error' && (
            <p id="modal-subscribe-error" className="text-red-600 text-sm" role="alert">{message}</p>
          )}
          <Button type="submit" fullWidth loading={status === 'loading'}>
            {status === 'loading' ? (isAdmin ? 'Adding...' : 'Subscribing...') : (isAdmin ? 'Add Subscriber' : 'Subscribe')}
          </Button>
        </form>
      )}
      </ModalBody>
    </Modal>
  );
}
