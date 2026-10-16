/**
 * The landing kit's facts and words, kept apart from its components so the
 * pages and the kit read one copy of each.
 *
 * Every figure here is one the owner stands behind: SEATS_CLAIMED is a real
 * number the owner edits by hand, never a countdown; MONTHLY_DMS is the decided
 * allowance (see PRODUCT.md for the code values that still have to catch up).
 */

export const SEATS_CLAIMED = 7;
export const SEATS_TOTAL = 100;
export const ANCHOR_PRICE = '$497';
export const MONTHLY_DMS = '1,500';

/** The trial's page-wide call to action. One wording, every button. */
export const TRIAL_CTA = 'Start the 3-day trial';

/**
 * Only the questions a buyer actually hesitates on — the objections — owner's
 * call (2026-10-14). Short on purpose: one or two sentences each (2026-09-24).
 *
 * The account question is answered with what is true of how MagnetEngine
 * works — no password asked for, no login stored, sends from the Operator's
 * own signed-in browser — and never with a promise that the account cannot be
 * restricted (owner decision, 2026-10-06; see PRODUCT.md). Automated DMs are
 * against Instagram's terms, so a guarantee is a claim nobody can stand
 * behind; the risk itself stays where it belongs, in the Terms of Service.
 *
 * No send figures here either (owner, 2026-10-06): the page says the product
 * sends, not how many a day.
 */
export const FAQ_ITEMS = [
    {
        question: 'Will this get my Instagram account banned?',
        answer: "We never ask for your Instagram password and never store your login. The messages go out from the Instagram you're already signed into, in your own browser — one at a time, like a person, and only the ones you approved.",
    },
    {
        question: 'Do you store my Instagram login or data?',
        answer: "No. MagnetEngine works from the Instagram account you're already signed into, in your own browser, so nothing that opens your account sits on our servers. The leads and drafts you work on stay in your private workspace, visible only to you.",
    },
    {
        question: "Won't the DMs sound like a bot?",
        answer: 'Each DM is written for the person receiving it, from their own profile — no templates, no merge tags. And you read and approve every first message before it goes out.',
    },
    {
        question: 'Can MagnetEngine replace my setters with AI?',
        answer: 'It takes over the repetitive part of the job: finding prospects, writing every opener, following up, and suggesting the next reply in each conversation. You stay in charge of what gets sent.',
    },
    {
        question: "I don't have time for another tool.",
        answer: 'Setup takes about ten minutes: add the Chrome extension and tell the AI about your offer. After that it is ten minutes a day to approve drafts. No developers, no API keys.',
    },
    {
        question: 'What if it doesn’t work for my niche?',
        answer: "The 3-day trial gives you the whole product, so you can search your niche and send your first DMs before you're charged. If the conversations don't start, cancel before day 4 and you pay nothing.",
    },
];

/**
 * Client messages for the testimonials wall, exactly as the client sent them.
 * Names and avatars are always drawn blurred, so the quote is the proof and
 * the person stays private.
 *
 * Only real messages belong here. An entry marked `example` is a layout
 * placeholder: it renders on localhost with an "Example" tag and never in a
 * production build, and the whole section disappears from production while
 * no real entry exists — a made-up testimonial is a fake review.
 */
export interface Testimonial {
    quote: string;
    /** Drawn blurred. Kept for the record of who said it. */
    name: string;
    /** As shown on the original message, e.g. "8:17 PM". */
    time?: string;
    reactions?: Array<[emoji: string, count: number]>;
    example?: boolean;
}

// What customers told the owner about MagnetEngine, as the owner reported it
// on 2026-10-16 — first person, nothing added: no timestamps or reactions,
// because the owner gave none and invented ones would dress these up as
// screenshots. Swap in each customer's exact words when you have them.
export const TESTIMONIALS: Testimonial[] = [
    { name: 'Jack', quote: 'I love this software. I got a lot of clients from it.' },
    { name: 'Daniel', quote: "Without this tool I wouldn't have gotten my first ever client." },
    { name: 'Customer', quote: "The scraping is what got me so many replies — I could go after my competitors' leads." },
    { name: 'Customer', quote: "I use MagnetEngine every day. Without it I wouldn't have started my agency." },
];
