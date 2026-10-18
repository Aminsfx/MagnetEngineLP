import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import type { User, Session } from '@supabase/supabase-js';
import { signIn as authSignIn, signUp as authSignUp, signOut as authSignOut, resetPassword as authResetPassword, onAuthStateChange, type SignUpProfile } from '../lib/auth';
import { posthogCapture, posthogIdentify, posthogReset } from '../lib/posthog';
import { shareSession } from '../lib/extensionProtocol';

interface AuthContextValue {
  user: User | null;
  session: Session | null;
  /** True while the initial session is being resolved — show a global loader during this */
  loading: boolean;
  signIn: (email: string, password: string) => Promise<string | null>;
  signUp: (email: string, password: string, profile?: SignUpProfile) => Promise<string | null>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<string | null>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let identifiedUserId: string | null = null;
    // Listen for auth state changes (covers initial session restore + login/logout events)
    const subscription = onAuthStateChange((_event, newSession) => {
      const nextUser = newSession?.user;
      if (nextUser && nextUser.id !== identifiedUserId) {
        posthogIdentify(nextUser.id, {
          ...(nextUser.email ? { email: nextUser.email } : {}),
          ...(nextUser.user_metadata.first_name ? { first_name: nextUser.user_metadata.first_name } : {}),
          ...(nextUser.user_metadata.last_name ? { last_name: nextUser.user_metadata.last_name } : {}),
        });
        identifiedUserId = nextUser.id;
      } else if (!nextUser && identifiedUserId) {
        posthogReset();
        identifiedUserId = null;
      }
      setSession(newSession);
      // Supabase emits a NEW user object on every token refresh (e.g. when the
      // tab regains focus). Keep the previous reference when the identity is
      // unchanged so downstream effects keyed on `user` don't re-run and
      // re-trigger loading screens/full data refetches on every refocus.
      setUser((prev) => {
        const next = newSession?.user ?? null;
        if (prev && next && prev.id === next.id && prev.updated_at === next.updated_at) {
          return prev;
        }
        return next;
      });
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // The extension stays signed out — popup on its Sign in screen, Instagram
  // inbox unread — until a page here tells it who is signed in. Only once the
  // stored session has been restored: telling it "nobody" during that first
  // tick would pause a running campaign on every page load.
  const userId = user?.id;
  const userEmail = user?.email ?? '';
  useEffect(() => {
    if (loading) return;
    return shareSession(userId ? { userId, email: userEmail } : null);
  }, [loading, userId, userEmail]);

  const signIn = useCallback(async (email: string, password: string): Promise<string | null> => {
    const result = await authSignIn(email, password);
    return result.error;
  }, []);

  const signUp = useCallback(async (email: string, password: string, profile: SignUpProfile = {}): Promise<string | null> => {
    const result = await authSignUp(email, password, profile);
    // The phone number stays out of PostHog: analytics needs who signed up and
    // from where, not a way to call them.
    const { firstName, lastName, heardAbout } = profile;
    // Supabase answers a sign-up for an email that already has an account with
    // a stand-in user and no identities, to hide which emails exist — that is
    // not a new account, so it is not a sign-up. Identify here as well as on
    // the auth event: with email confirmation on there is no session yet, and
    // the funnel needs this event on the same person as the page views before it.
    if (!result.error && result.user && (result.user.identities?.length ?? 0) > 0) {
      posthogIdentify(result.user.id, {
        ...(result.user.email ? { email: result.user.email } : {}),
        ...(firstName ? { first_name: firstName } : {}),
        ...(lastName ? { last_name: lastName } : {}),
        ...(heardAbout ? { heard_about: heardAbout.source } : {}),
      });
      posthogCapture('sign_up_completed', {
        sign_up_method: 'email',
        ...(heardAbout ? { heard_about: heardAbout.source } : {}),
      });
    }
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
