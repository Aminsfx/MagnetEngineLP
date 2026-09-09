import { Lead, Message, ConversationIntent } from './types';
import { invokeFunction } from './functions';

/**
 * `generate-dm` answered, retried, and still had no message to show for it.
 *
 * Paired with the same literal in `supabase/functions/generate-dm/index.ts`.
 * It is a per-Lead verdict, not a workspace one: nothing was billed, the next
 * Lead will very likely generate fine, and the caller should skip rather than
 * abandon the batch.
 */
export const EMPTY_COMPLETION = 'empty_completion';

/**
 * Whether a rejected generation was this one Lead's bad roll.
 *
 * Read structurally rather than with `instanceof FunctionError`: the answer
 * turns on what the function said, and a code that only counts when it arrives
 * wrapped in one particular class silently stops matching the moment the error
 * crosses a module boundary that resolved a second copy of it.
 */
export const isEmptyCompletion = (error: unknown): boolean =>
    typeof error === 'object' && error !== null
    && (error as { code?: unknown }).code === EMPTY_COMPLETION;

export interface ReplyResult {
    reply: string;
    intent: ConversationIntent;
    /** The provider that actually ran — not necessarily the one requested. */
    provider?: string;
}

export interface DmResult {
    dm: string;
    /** DM generations used this month, counted server-side after the call. */
    used: number;
    limit: number;
    provider?: string;
}

/**
 * AI DM generation.
 *
 * All provider API keys (Claude / OpenAI / Gemini) live ONLY in Supabase
 * secrets and are used by the `generate-dm` Edge Function. The browser never
 * sees a key — it just asks the backend to generate a DM. Prompt building,
 * injection-safe bio handling, and output cleanup all happen server-side.
 */
export const aiAPI = {
    /**
     * Generate a DM for a Lead via the backend.
     *
     * The `provider` is a preference: the server falls back to any configured
     * key if the requested one isn't set up, and reports which actually ran.
     *
     * The monthly quota is enforced server-side — this rejects with a 429 once
     * the allowance is spent, and returns the authoritative `used` count so the
     * caller never has to keep its own tally.
     */
    async generateDM(
        provider: 'openai' | 'claude' | 'gemini',
        lead: Lead,
        systemPrompt: string,
    ): Promise<DmResult> {
        return invokeFunction<DmResult>('generate-dm', { lead, systemPrompt, provider });
    },

    /**
     * Generate a conversational reply (+ detected intent) for an inbox thread.
     * Provider keys stay server-side; the backend builds the prompt from the
     * message history and returns { reply, intent }.
     */
    async generateReply(
        provider: 'openai' | 'claude' | 'gemini',
        input: {
            messages: Array<Pick<Message, 'direction' | 'text'>>;
            contact: { handle: string; name?: string; bio?: string };
            systemPrompt: string;
            calendarLink?: string;
        },
    ): Promise<ReplyResult> {
        return invokeFunction<ReplyResult>('generate-reply', { ...input, provider });
    },
};
