/**
 * Thin wrapper around supabase.functions.invoke for the app's backend proxies
 * (generate-dm, start-scrape, poll-scrape).
 *
 * supabase.functions.invoke automatically attaches the signed-in user's session
 * JWT + the anon apikey, so these endpoints are reachable only by authenticated
 * users — the owner's Claude/Apify keys live in Supabase secrets, never here.
 */
import { supabase } from './supabase';

/**
 * A non-2xx answer from an Edge Function, carrying whatever the function said
 * about itself.
 *
 * `code` is the part callers can branch on. A bare message cannot tell a
 * per-request hiccup from a workspace-wide outage — both arrive as a string —
 * so any failure a caller needs to *handle* rather than merely report gets a
 * code from the function that raised it.
 */
export class FunctionError extends Error {
    readonly code?: string;

    constructor(message: string, opts: { code?: string } = {}) {
        super(message);
        this.name = 'FunctionError';
        this.code = opts.code;
    }
}

export async function invokeFunction<T>(name: string, body: Record<string, unknown>): Promise<T> {
    const { data, error } = await supabase.functions.invoke(name, { body });

    if (error) {
        // supabase-js turns any non-2xx into a FunctionsHttpError carrying the
        // whole Response as `context` (functions-js: `if (!response.ok) throw
        // new FunctionsHttpError(response)`), so the function's own JSON body —
        // message and code — is only reachable through it.
        let message = error.message || `${name} request failed`;
        let code: string | undefined;
        try {
            const ctx = (error as { context?: Response }).context;
            if (ctx && typeof ctx.json === 'function') {
                const j = await ctx.json();
                if (j?.error) message = j.error;
                if (typeof j?.code === 'string') code = j.code;
            }
        } catch { /* fall back to error.message */ }
        throw new FunctionError(message, { code });
    }

    return data as T;
}
