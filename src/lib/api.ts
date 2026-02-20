import { Lead } from './types';
import { GoogleGenerativeAI } from '@google/generative-ai';

interface AIMessage {
    role: 'system' | 'user' | 'assistant';
    content: string;
}

export const aiAPI = {
    // Generate DM using OpenAI
    async generateWithOpenAI(apiKey: string, lead: Lead, systemPrompt: string): Promise<string> {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
                model: 'gpt-4o-mini',
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: `Create a personalized DM for ${lead.name} (@${lead.handle}) with ${lead.followers} followers.` }
                ],
                max_tokens: 200,
                temperature: 0.7,
            }),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(`OpenAI API error: ${response.statusText} - ${JSON.stringify(errorData)}`);
        }

        const data = await response.json();
        return data.choices[0].message.content.trim();
    },

    // Generate DM using Claude (Anthropic)
    async generateWithClaude(apiKey: string, lead: Lead, systemPrompt: string): Promise<string> {
        const response = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': apiKey,
                'anthropic-version': '2023-06-01',
            },
            body: JSON.stringify({
                model: 'claude-3-5-sonnet-20241022',
                max_tokens: 200,
                system: systemPrompt,
                messages: [
                    { role: 'user', content: `Create a personalized DM for ${lead.name} (@${lead.handle}) with ${lead.followers} followers.` }
                ],
            }),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(`Claude API error: ${response.statusText} - ${JSON.stringify(errorData)}`);
        }

        const data = await response.json();
        return data.content[0].text.trim();
    },

    // Generate DM using Gemini (with official SDK)
    async generateWithGemini(apiKey: string, lead: Lead, systemPrompt: string): Promise<string> {
        try {
            // Initialize the Gemini API with the SDK
            const genAI = new GoogleGenerativeAI(apiKey);

            // Get the model - using gemini-flash-latest (matches GAS implementation)
            const model = genAI.getGenerativeModel({ model: 'gemini-flash-latest' });

            // Create the prompt
            const prompt = `${systemPrompt}\n\nCreate a personalized DM for ${lead.name} (@${lead.handle}) with ${lead.followers} followers.`;

            // Generate content
            const result = await model.generateContent(prompt);
            const response = await result.response;
            const text = response.text();

            if (!text) {
                throw new Error('Empty response from Gemini API');
            }

            return text.trim();
        } catch (error: any) {
            console.error('Gemini SDK error:', error);
            throw new Error(`Gemini API error: ${error.message || error}`);
        }
    },

    // Main generate function
    async generateDM(
        provider: 'openai' | 'claude' | 'gemini',
        apiKey: string,
        lead: Lead,
        systemPrompt: string
    ): Promise<string> {
        switch (provider) {
            case 'openai':
                return this.generateWithOpenAI(apiKey, lead, systemPrompt);
            case 'claude':
                return this.generateWithClaude(apiKey, lead, systemPrompt);
            case 'gemini':
                return this.generateWithGemini(apiKey, lead, systemPrompt);
            default:
                throw new Error(`Unknown AI provider: ${provider}`);
        }
    },
};
