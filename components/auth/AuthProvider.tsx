'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import type { User, Session, AuthChangeEvent } from '@supabase/supabase-js';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAdmin: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  isLoading: true,
  isAdmin: false,
  signOut: async () => {},
});

export function useAuth() {
  return useContext(AuthContext);
}

async function checkAdmin(): Promise<boolean> {
  const res = await fetch('/api/auth/check-admin');
  const data = await res.json();
  return data.isAdmin ?? false;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [sessionLoaded, setSessionLoaded] = useState(false);

  /* The session is a push-based subscription, not a query: onAuthStateChange
     keeps `user` current, and the admin check re-runs per user id below. */
  useEffect(() => {
    const supabase = createClient();

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }: { data: { session: Session | null } }) => {
      setUser(session?.user ?? null);
      setSessionLoaded(true);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event: AuthChangeEvent, session: Session | null) => {
      setUser(session?.user ?? null);
      setSessionLoaded(true);
    });

    return () => subscription.unsubscribe();
  }, []);

  const { data: isAdminResult, isPending: isAdminPending } = useQuery({
    queryKey: ['auth', 'is-admin', user?.id],
    queryFn: checkAdmin,
    enabled: !!user,
  });

  const isAdmin = !!user && (isAdminResult ?? false);
  const isLoading = !sessionLoaded || (!!user && isAdminPending);

  const signOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, isAdmin, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}
