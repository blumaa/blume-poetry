'use client';

import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Button, Checkbox, Input, Modal, ModalBody, ModalHeader } from '@/components/mds';
import { Icon } from '@/components/icons';
import { addSubscriber, subscribe } from './api/subscribers';
import styles from './SubscribeModal.module.css';

interface SubscribeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  isAdmin?: boolean;
}

export function SubscribeModal({ isOpen, onClose, onSuccess, isAdmin = false }: SubscribeModalProps) {
  const [email, setEmail] = useState('');
  const [notifyNewPoems, setNotifyNewPoems] = useState(true);

  const mutation = useMutation({
    mutationFn: () => (isAdmin ? addSubscriber(email) : subscribe({ email, notifyNewPoems })),
    onSuccess: () => {
      setEmail('');
      onSuccess?.();
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mutation.mutate();
  };

  const resetAndClose = () => {
    mutation.reset();
    setEmail('');
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
      <p className={styles.description}>
        {isAdmin ? 'Add a new subscriber manually.' : 'Get notified when new poetry is published.'}
      </p>

      {mutation.isSuccess ? (
        <div className={styles.successBox}>
          <div className={styles.successIcon}>
            <Icon name="check" />
          </div>
          <p className={styles.successMessage}>
            {isAdmin ? 'Subscriber added!' : 'Thank you for subscribing!'}
          </p>
          <Button variant="ghost" onClick={resetAndClose} className={styles.closeButton}>
            Close
          </Button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className={styles.form}>
          <Input
            type="email"
            aria-label="Email address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="your@email.com"
            required
            autoFocus
            invalid={mutation.isError}
            aria-describedby={mutation.isError ? 'modal-subscribe-error' : undefined}
            disabled={mutation.isPending}
          />
          {!isAdmin && (
            <Checkbox
              label="Email me when a new poem is published"
              checked={notifyNewPoems}
              onChange={(e) => setNotifyNewPoems(e.target.checked)}
              disabled={mutation.isPending}
            />
          )}
          {mutation.isError && (
            <p id="modal-subscribe-error" className={styles.errorText} role="alert">
              {mutation.error.message}
            </p>
          )}
          <Button type="submit" fullWidth loading={mutation.isPending}>
            {mutation.isPending ? (isAdmin ? 'Adding...' : 'Subscribing...') : (isAdmin ? 'Add Subscriber' : 'Subscribe')}
          </Button>
        </form>
      )}
      </ModalBody>
    </Modal>
  );
}
