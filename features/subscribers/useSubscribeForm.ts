'use client';

import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import type { SubscribeInput } from './api/subscribers';

interface UseSubscribeFormOptions {
  submit: (input: SubscribeInput) => Promise<void>;
  onSuccess?: () => void;
  onError?: (error: Error) => void;
}

/** The state and submit flow every subscribe form shares; each form keeps its own markup. */
export function useSubscribeForm({ submit, onSuccess, onError }: UseSubscribeFormOptions) {
  const [email, setEmail] = useState('');
  const [notifyNewPoems, setNotifyNewPoems] = useState(true);

  const mutation = useMutation({
    mutationFn: (input: SubscribeInput) => submit(input),
    onSuccess: () => {
      setEmail('');
      onSuccess?.();
    },
    onError,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mutation.mutate({ email, notifyNewPoems });
  };

  const reset = () => {
    mutation.reset();
    setEmail('');
  };

  return { email, setEmail, notifyNewPoems, setNotifyNewPoems, mutation, handleSubmit, reset };
}
