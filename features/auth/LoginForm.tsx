'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Field, Input, PasswordInput, useToast } from '@/components/mds';
import { signIn } from './api/auth';
import styles from './LoginForm.module.css';

export function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      await signIn(email, password);
      toast({ title: 'Welcome back!', tone: 'success' });
      router.push('/admin');
      router.refresh();
    } catch (error) {
      toast({
        title: error instanceof Error ? error.message : 'An unexpected error occurred',
        tone: 'danger',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className={styles.form}>
      <Field label="Email" required>
        <Input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
      </Field>

      <Field label="Password" required>
        <PasswordInput
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          showLabel="Show password"
          hideLabel="Hide password"
        />
      </Field>

      <Button type="submit" fullWidth loading={isLoading}>
        Sign In
      </Button>
    </form>
  );
}
