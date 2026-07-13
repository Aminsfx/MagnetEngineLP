import { Lead } from './types';
import { invokeFunction } from './functions';

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
};
