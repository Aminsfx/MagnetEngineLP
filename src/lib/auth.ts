import { supabase } from './supabase';
import type { User, Session, AuthChangeEvent } from '@supabase/supabase-js';

export interface AuthResult {
  user: User | null;
  error: string | null;
}

/** Sign in with email + password */
export async function signIn(email: string, password: string): Promise<AuthResult> {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  return {
    user: data.user,
    error: error ? formatAuthError(error.message) : null,
  };
}

/** Create a new account */
export async function signUp(
  email: string,
  password: string,
  firstName?: string,
  lastName?: string,
): Promise<AuthResult> {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { first_name: firstName ?? '', last_name: lastName ?? '' } },
  });
  return {
    user: data.user,
    error: error ? formatAuthError(error.message) : null,
  };
}

/** Sign out the current user */
export async function signOut(): Promise<void> {
  await supabase.auth.signOut();
}

/** Get the current session (non-reactive, one-time read) */
export async function getSession(): Promise<Session | null> {
  const { data } = await supabase.auth.getSession();
  return data.session;
}

/** Subscribe to auth state changes */
export function onAuthStateChange(
  callback: (event: AuthChangeEvent, session: Session | null) => void
) {
  const { data } = supabase.auth.onAuthStateChange(callback);
  return data.subscription;
}

/** Map Supabase error strings to readable messages */
function formatAuthError(msg: string): string {
  if (msg.includes('Invalid login credentials')) return 'Invalid email or password.';
  if (msg.includes('Email not confirmed')) return 'Please confirm your email before logging in.';
  if (msg.includes('User already registered')) return 'An account with this email already exists.';
  if (msg.includes('Password should be')) return 'Password must be at least 6 characters.';
  return msg;
}
