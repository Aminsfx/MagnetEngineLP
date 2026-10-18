import { supabase } from './supabase';
import { landingVariant } from './landingVariant';
import type { HeardAboutAnswer } from './heardAbout';
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

/** What the sign-up form asks besides email and password. */
export interface SignUpProfile {
  firstName?: string;
  lastName?: string;
  /** As `normalizePhone` leaves it: digits, with a leading + when typed. */
  phone?: string;
  heardAbout?: HeardAboutAnswer;
}

/**
 * A phone number as the sign-up form stores it: the digits, keeping a leading
 * + so the country code survives. Null when it is not 7–15 digits (E.164's
 * range), which the form reports instead of saving.
 */
export function normalizePhone(raw: string): string | null {
  const digits = raw.replace(/\D/g, '');
  if (digits.length < 7 || digits.length > 15) return null;
  return raw.trim().startsWith('+') ? `+${digits}` : digits;
}

/** Create a new account */
export async function signUp(
  email: string,
  password: string,
  profile: SignUpProfile = {},
): Promise<AuthResult> {
  const { firstName, lastName, phone, heardAbout } = profile;
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      // landing_variant: which A/B landing page this person first saw
      // (src/lib/landingVariant.ts). Absent when they never saw one.
      // heard_about: their answer to "Where did you hear about us?"
      // (src/lib/heardAbout.ts). phone lives here, in metadata, not in
      // auth.users.phone — that column is Supabase's phone sign-in, unused.
      data: {
        first_name: firstName ?? '',
        last_name: lastName ?? '',
        phone: phone || undefined,
        landing_variant: landingVariant() ?? undefined,
        heard_about: heardAbout?.source,
      },
      // Confirmation email link returns the user to the app (Supabase must
      // also allow this URL under Auth → URL Configuration → Redirect URLs)
      emailRedirectTo: `${window.location.origin}/login`,
    },
  });
  return {
    user: data.user,
    error: error ? formatAuthError(error.message) : null,
  };
}

/** Send a password-reset email with a link back to /reset-password */
export async function resetPassword(email: string): Promise<string | null> {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/reset-password`,
  });
  return error ? formatAuthError(error.message) : null;
}

/** Set a new password for the currently authenticated user (used after a recovery link) */
export async function updatePassword(newPassword: string): Promise<string | null> {
  const { error } = await supabase.auth.updateUser({ password: newPassword });
  return error ? formatAuthError(error.message) : null;
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
  if (msg.includes('User already registered')) return 'An account with this email already exists. Try signing in instead.';
  if (msg.includes('Password should be')) return 'Password must be at least 6 characters.';
  if (msg.toLowerCase().includes('rate limit') || msg.includes('Too many requests')) {
    return 'Too many attempts — please wait a minute and try again.';
  }
  if (msg.includes('Failed to fetch') || msg.toLowerCase().includes('network')) {
    return 'Could not reach the server. Check your connection and try again.';
  }
  return msg;
}
