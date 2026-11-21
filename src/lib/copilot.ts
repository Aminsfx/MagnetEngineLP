import type { ReplyStep } from '../../supabase/functions/_shared/reply.ts';

/**
 * How one copilot suggestion is steered: a short instruction appended to the
 * Operator's own reply prompt (see `withInstruction` in api.ts), and the steps
 * on the path to a call it may take. Without `steps`, generate-reply decides
 * from the thread (`_shared/reply.ts`).
 */
export interface ReplySteer {
    instruction?: string;
    steps?: ReplyStep[];
}

/**
 * The Inbox copilot's three angles on one conversation. The voice rules, the
 * booking-link rule and the Offer Ledger still bind every suggestion.
 */
export interface CopilotAngle extends ReplySteer {
    key: string;
    label: string;
}

export const COPILOT_ANGLES: CopilotAngle[] = [
    { key: 'next', label: 'Best next step' },
    {
        key: 'qualify',
        label: 'Dig into the pain',
        instruction: 'Ask one short question, built on what they just said, that gets closer to the problem you solve: what is going wrong, what it costs them, or what they have tried. No pitch and no link.',
        steps: ['discover'],
    },
    {
        key: 'book',
        label: 'Go for the call',
        instruction: 'Go for the call in this message: say their problem back and offer to show them how, or send the link with the two days if they have already said yes.',
        steps: ['offer_call', 'send_link', 'confirm'],
    },
];

export type Suggestion = { angle: CopilotAngle; text?: string; failed?: boolean };
