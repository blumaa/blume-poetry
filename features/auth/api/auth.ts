import type { User } from '@supabase/supabase-js';
import { apiFetch } from '@/lib/apiFetch';
import { createClient } from '@/lib/supabase/client';

/** Calls back with the signed-in user now and on every change; returns the unsubscribe. */
export function watchUser(onChange: (user: User | null) => void): () => void {
  const supabase = createClient();
  supabase.auth.getSession().then(({ data: { session } }) => onChange(session?.user ?? null));
  const {
    data: { subscription },
  } = supabase.auth.onAuthStateChange((_event, session) => onChange(session?.user ?? null));
  return () => subscription.unsubscribe();
}

/** The server decides who is admin; the client only asks. */
export async function checkAdmin(): Promise<boolean> {
  const { isAdmin } = await apiFetch<{ isAdmin: boolean }>('/api/auth/check-admin');
  return isAdmin;
}

export async function signIn(email: string, password: string): Promise<void> {
  const { error } = await createClient().auth.signInWithPassword({ email, password });
  if (error) throw error;
}

export async function signOut(): Promise<void> {
  const { error } = await createClient().auth.signOut();
  if (error) throw error;
}
