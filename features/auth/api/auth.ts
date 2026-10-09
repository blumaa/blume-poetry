import { createClient } from '@/lib/supabase/client';

export async function signIn(email: string, password: string): Promise<void> {
  const { error } = await createClient().auth.signInWithPassword({ email, password });
  if (error) throw error;
}

export async function signOut(): Promise<void> {
  const { error } = await createClient().auth.signOut();
  if (error) throw error;
}
