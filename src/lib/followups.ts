import type { Lead, FollowUpSequence } from './types';

export interface DueFollowUp {
    lead: Lead;
    stepIndex: 0 | 1 | 2;
    message: string;
}

const DAY_MS = 86_400_000;

export function renderTemplate(template: string, lead: Lead): string {
    const name = lead.name?.trim() || `@${lead.handle}`;
    return template
        .replace(/\{\{handle\}\}/g, `@${lead.handle}`)
        .replace(/\{\{name\}\}/g, name);
}

/** Returns a copy of the lead stamped with the sent follow-up step. */
export function stampFollowUp(lead: Lead, stepIndex: 0 | 1 | 2, sentAt: string): Lead {
    const stamped: Lead = { ...lead, followedUp: true };
    if (stepIndex === 0) stamped.followUp1Date = sentAt;
    if (stepIndex === 1) stamped.followUp2Date = sentAt;
    if (stepIndex === 2) stamped.followUp3Date = sentAt;
    return stamped;
}

/**
 * Compute which leads are due a follow-up step right now.
 *
 * Rules:
 *  - only leads with dmSent + dmDate
 *  - step i anchors on: dmDate (i=0), followUp1Date (i=1), followUp2Date (i=2)
 *  - due when anchor exists, the step's own date is empty, anchor + delayDays
 *    has elapsed, and the condition allows it ('always', or 'no_reply' with
 *    no reply yet)
 *  - at most ONE step per lead per batch (the earliest due one)
 */
export function computeDueFollowUps(
    leads: Lead[],
    sequence: FollowUpSequence | null,
    now: Date = new Date(),
): DueFollowUp[] {
    if (!sequence || !sequence.active || sequence.steps.length === 0) return [];

    const nowMs = now.getTime();
    const due: DueFollowUp[] = [];

    for (const lead of leads) {
        if (!lead.dmSent || !lead.dmDate) continue;

        const anchors = [lead.dmDate, lead.followUp1Date, lead.followUp2Date];
        const sentDates = [lead.followUp1Date, lead.followUp2Date, lead.followUp3Date];

        for (let i = 0; i < Math.min(sequence.steps.length, 3); i++) {
            const step = sequence.steps[i];
            const anchor = anchors[i];
            if (!anchor || sentDates[i]) continue;

            const anchorMs = new Date(anchor).getTime();
            if (!Number.isFinite(anchorMs)) continue;
            if (nowMs < anchorMs + step.delayDays * DAY_MS) continue;
            if (step.condition === 'no_reply' && lead.replied) continue;

            due.push({
                lead,
                stepIndex: i as 0 | 1 | 2,
                message: renderTemplate(step.messageTemplate, lead),
            });
            break; // one step per lead per batch
        }
    }

    return due;
}
