import type { Conversation, Message } from './types';

/**
 * Sample conversations for `npm run demo` (VITE_INBOX_DEMO=true), so the
 * Inbox's triage and copilot can be seen while the real inbox reader is
 * paused. Every handle contains a hyphen, which Instagram usernames cannot,
 * so no sample can be a real person — the same rule as scrapeDemo.ts. Nothing
 * here is saved or sent.
 */

const MIN = 60_000;

interface Script {
    handle: string;
    name: string;
    /** Minutes ago for each message, oldest first, with who sent it. */
    lines: Array<[number, 'in' | 'out', string]>;
    intent?: Conversation['intent'];
    status?: Conversation['status'];
}

const SCRIPTS: Script[] = [
    {
        handle: 'maya-builds.coaching', name: 'Maya R.',
        intent: 'interested',
        lines: [
            [2900, 'out', "Maya — saw your post on running a coaching practice with two kids under five. The part about batching client calls on Tuesdays stuck with me. Are you taking on more clients right now, or keeping it small on purpose?"],
            [190, 'in', "Ha thank you! Honestly I want 5 more clients by January but my DMs are a mess and I never follow up."],
            [185, 'in', 'What do you actually do?'],
        ],
    },
    {
        handle: 'tom-roofing-pros', name: 'Tom Delgado',
        intent: 'objection',
        lines: [
            [4300, 'out', 'Tom, the before/after on the Henderson roof is a good one. Do most of your jobs come from referrals, or are you getting any from Instagram yet?'],
            [1500, 'in', 'Mostly referrals. Tried an agency last year, paid 2k a month and got nothing.'],
            [1490, 'in', 'So not really looking to spend on marketing again'],
        ],
    },
    {
        handle: 'glow-medspa-austin', name: 'Glow Med Spa',
        lines: [
            [3000, 'out', 'Love the lip filler results you posted this week. Are you booking new clients through DMs, or mostly through the website?'],
            [1100, 'in', 'hey! who is this?'],
        ],
    },
    {
        handle: 'jordan-fit-method', name: 'Jordan K.',
        intent: 'interested',
        lines: [
            [6000, 'out', "Jordan, your 12-week transformation posts are some of the clearest I've seen. Are online clients most of your business now?"],
            [5000, 'in', 'About half. Want it to be all of it tbh'],
            [4900, 'out', "That's exactly what we help coaches do. Worth a 15-minute call this week to see if it fits?"],
            [40, 'in', 'Yeah ok, Thursday works'],
        ],
    },
    {
        handle: 'studio-noor-design', name: 'Noor Studio',
        intent: 'neutral',
        lines: [
            [7000, 'out', 'Noor — the moodboard reel for the Lisbon apartment was great. Do you take projects outside Portugal?'],
            [6500, 'in', 'Sometimes! Depends on the scope.'],
            [6400, 'out', 'Makes sense. Most of your projects residential, or some commercial too?'],
        ],
    },
    {
        handle: 'ben-smma-growth', name: 'Ben Ortiz',
        intent: 'not_interested',
        lines: [
            [9000, 'out', "Ben, saw you're scaling the agency. How are you filling the pipeline right now?"],
            [8000, 'in', "We're good thanks, not interested"],
        ],
    },
    {
        handle: 'lena-weddings-photo', name: 'Lena M.',
        intent: 'booked', status: 'booked',
        lines: [
            [10000, 'out', 'Lena, the Tuscany wedding set is stunning. Are you booked out for next season yet?'],
            [9000, 'in', 'Not even close haha'],
            [8900, 'out', 'Want to hop on a quick call Friday? 15 minutes, I will show you how we fill calendars.'],
            [8500, 'in', 'Booked for Friday 2pm!'],
        ],
    },
    {
        handle: 'chris-dental-care', name: 'Bright Dental',
        lines: [
            [1440 * 4, 'out', 'Chris, the clear aligner case you shared is a great example. Are most new patients finding you on Instagram or Google?'],
        ],
    },
];

export function demoInbox(now = Date.now()): { conversations: Conversation[]; messages: Message[] } {
    const conversations: Conversation[] = [];
    const messages: Message[] = [];
    SCRIPTS.forEach((s, i) => {
        const id = `demo-thread-${i}`;
        s.lines.forEach(([ago, direction, text], j) => {
            messages.push({ id: `${id}-m${j}`, conversationId: id, direction, text, createdAt: new Date(now - ago * MIN).toISOString() });
        });
        const last = s.lines[s.lines.length - 1];
        conversations.push({
            id,
            handle: s.handle,
            name: s.name,
            lastMessageAt: new Date(now - last[0] * MIN).toISOString(),
            lastMessageText: last[2],
            unread: last[1] === 'in',
            status: s.status ?? 'open',
            intent: s.intent,
            needsReply: last[1] === 'in',
        });
    });
    return { conversations, messages };
}
