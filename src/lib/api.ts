import { Lead, Message, ConversationIntent } from './types';
import { invokeFunction } from './functions';

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
