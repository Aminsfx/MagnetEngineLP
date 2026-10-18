/**
 * The landing kit's facts and words, kept apart from its components so the
 * pages and the kit read one copy of each.
 *
 * Every figure here is one the owner stands behind: MONTHLY_DMS is the decided
 * allowance (see PRODUCT.md for the code values that still have to catch up).
 * The founding-seat count and the $497 "after the seats" anchor are gone
 * (owner, 2026-10-18): no scarcity on the page.
 */

export const MONTHLY_DMS = '1,500';

/** Who the page is for, said in the hero. */
export const AUDIENCE = 'For agency owners and coaches who sell through DMs.';

/**
 * The trial's page-wide call to action. One wording, every button — and only
 * three of them in the page body (hero, pricing, close), because each one
 * asks for a card.
 */
export const TRIAL_CTA = 'Start the 3-day trial';

/** The call is where sales close, so it rides beside the trial as the second action. */
export const CALL_CTA = 'Get a Demo for Your Business';

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
        answer: "The 3-day trial gives you the whole product, so you can search your niche and send your first DMs before you decide. If the conversations don't start, cancel during the trial and you pay nothing.",
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
    /** What they do, shown in the clear — e.g. "Agency owner". */
    role?: string;
    /** The one thing the message is about, as a short headline. */
    topic?: string;
    /** As shown on the original message, e.g. "8:17 PM". */
    time?: string;
    reactions?: Array<[emoji: string, count: number]>;
    example?: boolean;
}

export const TESTIMONIALS: Testimonial[] = [
    // Sample copy from the owner (2026-10-18) — one per thing a buyer weighs.
    // The four real client messages were dropped the same day (owner's call;
    // git history has them). These are layout placeholders: localhost only,
    // never in a production build — so the section is absent from production
    // until a real client's words replace one.
    { example: true, name: 'Sample', role: 'Agency owner', topic: 'Lead discovery', quote: 'Finding leads on Instagram used to take me hours. Now I can build a targeted list much faster and spend more time actually talking to potential clients.' },
    { example: true, name: 'Sample', role: 'Freelance consultant', topic: 'Personalized DMs', quote: 'The personalized messages are what caught my attention. Instead of sending the same generic DM to everyone, I can tailor my outreach to each prospect.' },
    { example: true, name: 'Sample', role: 'Marketing agency founder', topic: 'Time saving', quote: 'Instagram prospecting was becoming a full-time job on its own. Having lead discovery and message generation in one workflow makes things much easier.' },
    { example: true, name: 'Sample', role: 'Coach', topic: 'AI appointment setter', quote: 'I like the idea of having AI handle more of the conversation instead of manually managing every single prospect. It gives me more time to focus on qualified leads.' },
    { example: true, name: 'Sample', role: 'Online business owner', topic: 'Follow-ups', quote: 'Most opportunities get lost because you forget to follow up. Having follow-ups built into the outreach process makes it easier to stay consistent.' },
    { example: true, name: 'Sample', role: 'Social media agency owner', topic: 'Targeted prospecting', quote: 'Being able to find prospects based on the audiences and accounts relevant to my niche is much more useful than randomly messaging people.' },
    { example: true, name: 'Sample', role: 'Consultant', topic: 'Simpler workflow', quote: 'I used to jump between different tools to find leads, write messages, and track conversations. Having more of that process in one place is a big plus.' },
    { example: true, name: 'Sample', role: 'Agency founder', topic: 'Scaling outreach', quote: 'The biggest benefit is having a repeatable outreach process. I can spend less time doing repetitive prospecting tasks and more time improving my offer.' },
    { example: true, name: 'Sample', role: 'Business coach', topic: 'For coaches', quote: 'If you sell services through Instagram, you know how much time goes into finding the right people and starting conversations. This kind of workflow can simplify that process.' },
    { example: true, name: 'Sample', role: 'SaaS founder', topic: 'All-in-one outreach', quote: "What interests me most is the combination of lead discovery, personalized outreach, and AI appointment setting. It's much closer to a complete prospecting workflow than just another DM tool." },
];
