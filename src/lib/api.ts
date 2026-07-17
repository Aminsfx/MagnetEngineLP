import { Lead, Message, ConversationIntent } from './types';
import { invokeFunction } from './functions';

export interface ReplyResult {
    reply: string;
    intent: ConversationIntent;
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
     * Generate a DM for a lead via the backend. Signature is unchanged from the
     * previous client-side implementation, so call sites don't change.
     * The `provider` is a preference; the server falls back to any configured
     * key if the requested provider isn't set up.
     */
    async generateDM(
        provider: 'openai' | 'claude' | 'gemini',
        lead: Lead,
        systemPrompt: string,
    ): Promise<string> {
        const { dm } = await invokeFunction<{ dm: string }>('generate-dm', {
            lead,
            systemPrompt,
            provider,
        });
        return dm;
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
