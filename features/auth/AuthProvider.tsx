'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { User } from '@supabase/supabase-js';
import { queryKeys } from '@/lib/queryKeys';
import { checkAdmin, signOut, watchUser } from './api/auth';

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
  signOut,
});

export function useAuth() {
  return useContext(AuthContext);
}

/* Mounted once at the root: every "who is signed in, are they admin" answer
   in the app comes from here. */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [sessionLoaded, setSessionLoaded] = useState(false);

  /* The session is a push-based subscription, not a query: watchUser keeps
     `user` current, and the admin check re-runs per user id below. */
  useEffect(
    () =>
      watchUser((next) => {
        setUser(next);
        setSessionLoaded(true);
      }),
    []
  );

  const { data: isAdminResult, isPending: isAdminPending } = useQuery({
    queryKey: queryKeys.auth.isAdmin(user?.id),
    queryFn: checkAdmin,
    enabled: !!user,
  });

  const isAdmin = !!user && (isAdminResult ?? false);
  const isLoading = !sessionLoaded || (!!user && isAdminPending);

  return (
    <AuthContext.Provider value={{ user, isLoading, isAdmin, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}
