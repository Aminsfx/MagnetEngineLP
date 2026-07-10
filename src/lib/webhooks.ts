import type { AppConfig, Lead } from './types';

export type WebhookEvent = 'replied' | 'positive_reply' | 'booked';

const DEFAULT_EVENTS = { replied: false, positiveReply: true, booked: true };

const EVENT_TOGGLE: Record<WebhookEvent, keyof typeof DEFAULT_EVENTS> = {
    replied: 'replied',
    positive_reply: 'positiveReply',
    booked: 'booked',
};

/** Detect which webhook events a lead update represents. */
export function detectTransitions(oldLead: Lead, newLead: Lead): WebhookEvent[] {
    const events: WebhookEvent[] = [];
    if (!oldLead.replied && newLead.replied) events.push('replied');
    if (!oldLead.positiveReply && newLead.positiveReply) events.push('positive_reply');
    if (!oldLead.booked && newLead.booked) events.push('booked');
    return events;
}

/**
 * Fire-and-forget outbound webhook. no-cors + text/plain avoids the CORS
 * preflight that Zapier/Make catch hooks don't answer. Failures are silent —
 * a dead webhook must never break a lead update.
 */
export function fireWebhook(config: AppConfig, event: WebhookEvent, lead: Lead): void {
    const url = config.webhookUrl;
    if (!url || !url.startsWith('https://')) return;

    const toggles = config.webhookEvents ?? DEFAULT_EVENTS;
    if (!toggles[EVENT_TOGGLE[event]]) return;

    const payload = {
        event,
        timestamp: new Date().toISOString(),
        lead: {
            handle: lead.handle,
            name: lead.name,
            followers: lead.followers,
            campaignId: lead.campaignId,
            dmContent: lead.dmContent,
        },
    };

    try {
        fetch(url, {
            method: 'POST',
            mode: 'no-cors',
            headers: { 'Content-Type': 'text/plain' },
            body: JSON.stringify(payload),
        }).catch(() => {});
    } catch {
        // never surface webhook errors
    }
}
