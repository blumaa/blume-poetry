import { createBrowserClient } from '@supabase/ssr';
import { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from './types';

let supabaseClient: SupabaseClient<Database> | null = null;

export function createClient(): SupabaseClient<Database> {
  // Return cached client if available
  if (supabaseClient) {
    return supabaseClient;
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

  // During SSR/build, we may not have these values
  // The client components that use this will handle the missing config gracefully
  supabaseClient = createBrowserClient<Database>(supabaseUrl, supabaseAnonKey);
  return supabaseClient;
}
