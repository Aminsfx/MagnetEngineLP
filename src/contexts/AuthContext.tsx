import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import type { User, Session } from '@supabase/supabase-js';
import { signIn as authSignIn, signUp as authSignUp, signOut as authSignOut, resetPassword as authResetPassword, onAuthStateChange } from '../lib/auth';

interface AuthContextValue {
  user: User | null;
  session: Session | null;
  /** True while the initial session is being resolved — show a global loader during this */
  loading: boolean;
  signIn: (email: string, password: string) => Promise<string | null>;
  signUp: (email: string, password: string, firstName?: string, lastName?: string) => Promise<string | null>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<string | null>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Listen for auth state changes (covers initial session restore + login/logout events)
    const subscription = onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      setUser(newSession?.user ?? null);
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const signIn = useCallback(async (email: string, password: string): Promise<string | null> => {
    const result = await authSignIn(email, password);
    return result.error;
  }, []);

  const signUp = useCallback(async (email: string, password: string, firstName?: string, lastName?: string): Promise<string | null> => {
    const result = await authSignUp(email, password, firstName, lastName);
    if (!result.error && result.user) {
      // If email confirmation is disabled in Supabase settings, user is immediately active
      // If enabled, user will need to confirm — we return a special signal
      if (!result.user.confirmed_at && !result.user.email_confirmed_at) {
        return '__CONFIRM_EMAIL__';
      }
    }
    return result.error;
  }, []);

  const handleSignOut = useCallback(async () => {
    await authSignOut();
    setUser(null);
    setSession(null);
  }, []);

  const resetPassword = useCallback(async (email: string): Promise<string | null> => {
    return authResetPassword(email);
  }, []);

  return (
    <AuthContext.Provider value={{ user, session, loading, signIn, signUp, signOut: handleSignOut, resetPassword }}>
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within <AuthProvider>');
  return ctx;
}
