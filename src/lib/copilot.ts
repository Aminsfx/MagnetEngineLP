/**
 * The Inbox copilot's three angles on one conversation. Each is the
 * Operator's own reply prompt plus one short instruction (see `withInstruction`
 * in api.ts), so the voice rules, the booking-link rule and the Offer Ledger
 * still bind every suggestion.
 */
export interface CopilotAngle {
    key: string;
    label: string;
    /** Appended to the reply prompt for this suggestion. None = the prompt as written. */
    instruction?: string;
}

export const COPILOT_ANGLES: CopilotAngle[] = [
    { key: 'next', label: 'Best next step' },
    {
        key: 'qualify',
        label: 'Qualify them',
        instruction: "Don't pitch and don't share a link in this message. Ask one short, specific question that tells you whether they are a fit: their current situation, their goal, or their timeline.",
    },
    {
        key: 'book',
        label: 'Go for the call',
        instruction: 'Move toward booking a call in this message, in one or two sentences. If they have shown any interest, invite them to a short call.',
    },
];

export type Suggestion = { angle: CopilotAngle; text?: string; failed?: boolean };
