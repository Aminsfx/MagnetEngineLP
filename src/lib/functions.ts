/**
 * Thin wrapper around supabase.functions.invoke for the app's backend proxies
 * (generate-dm, start-scrape, poll-scrape).
 *
 * supabase.functions.invoke automatically attaches the signed-in user's session
 * JWT + the anon apikey, so these endpoints are reachable only by authenticated
 * users — the owner's Claude/Apify keys live in Supabase secrets, never here.
 */
import { supabase } from './supabase';

export async function invokeFunction<T>(name: string, body: unknown): Promise<T> {
    const { data, error } = await supabase.functions.invoke(name, { body });

    if (error) {
        // Surface the function's own JSON `error` message when available.
        let message = error.message || `${name} request failed`;
        try {
            const ctx = (error as { context?: Response }).context;
            if (ctx && typeof ctx.json === 'function') {
                const j = await ctx.json();
                if (j?.error) message = j.error;
            }
        } catch { /* fall back to error.message */ }
        throw new Error(message);
    }

    return data as T;
}
