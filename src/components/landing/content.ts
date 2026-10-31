/**
 * The landing kit's facts and words, kept apart from its components so the
 * pages and the kit read one copy of each.
 *
 * Every figure here is one the owner stands behind: MONTHLY_DMS is the decided
 * allowance (see PRODUCT.md for the code values that still have to catch up).
 * The founding-seat count and the $497 "after the seats" anchor are gone
 * (owner, 2026-10-18): no scarcity on the page.
 */

import { PLAN_LIMITS } from '../../lib/plans';

export const MONTHLY_DMS = '1,500';

/** The monthly lead quota, as the scraper enforces it. */
export const MONTHLY_LEADS = PLAN_LIMITS.maxLeadsPerMonth.toLocaleString('en-US');

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
 * What makes any element open the 15-minute call: the Cal embed in index.html
 * listens for clicks on `[data-cal-link]`. Spread it onto a button.
 */
export const CALL_BOOKING = {
    'data-cal-link': 'magnetengine/15min',
    'data-cal-namespace': '15min',
    'data-cal-config': '{"layout":"month_view","useSlotsViewOnSmallScreen":"true"}',
} as const;

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
 * The owner's WhatsApp, behind the chat bubble on `/` (owner, 2026-10-31):
 * digits only, country code first, the form wa.me takes. The greeting is
 * typed into the chat for the visitor, so the owner knows where they came from.
 */
export const WHATSAPP_NUMBER = '33743338664';
export const WHATSAPP_GREETING = 'Hi! I have a question about MagnetEngine.';

/**
 * Screenshots of the owner's video calls with clients, shown beside the
 * reviews on `/` as proof the people are real (owner, 2026-10-31). Only real
 * calls, with clients who agreed to be shown: each `src` is a file the owner
 * supplied, under public/clients/. A caption names who is on the call and
 * never puts words in their mouth: a screenshot is not a quote. The row
 * renders nothing while this list is empty.
 */
export interface ClientCall {
    /**
     * A path under public/, e.g. '/clients/call-brandon.jpg'. Shown uncropped,
     * so crop the file itself; the client's face is softened in the file.
     */
    src: string;
    /** The file's size in pixels, so the page keeps its space while it loads. */
    width: number;
    height: number;
    /**
     * The client's first name, and nothing more (owner, 2026-10-31): the
     * surname on the call's name tag is blurred in the file too. Omit to show
     * no caption.
     */
    name?: string;
}

// Two to a row, so each pair shares a shape: the calls are 3:2, the calls over the dashboard 2:1.
export const CLIENT_CALLS: ClientCall[] = [
    { src: '/clients/call-alec.jpg', width: 942, height: 628, name: 'Alec' },
    { src: '/clients/call-dan-car.jpg', width: 420, height: 280, name: 'Dan' },
    { src: '/clients/call-dan.jpg', width: 1000, height: 500, name: 'Dan' },
    { src: '/clients/call-brandon.jpg', width: 594, height: 297, name: 'Brandon' },
];

/**
 * Client messages for the testimonials wall, exactly as the client sent them.
 * Names and avatars are always drawn as blurred stand-ins, so the quote is the
 * proof and the person stays private.
 *
 * Only real messages belong here. An entry marked `example` is a layout
 * placeholder: it renders on localhost with an "Example" tag and never in a
 * production build, and the whole section disappears from production while
 * no real entry exists — a made-up testimonial is a fake review.
 */
export interface Testimonial {
    quote: string;
    /** Never rendered — the card draws a blurred stand-in. Kept for the record of who said it. */
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
    // Real client messages, confirmed by the owner (2026-10-19); first shown
    // here as samples on 2026-10-18. Names weren't given, so each is recorded
    // as "Customer". The four earlier client messages were dropped on
    // 2026-10-18 (owner's call; git history has them).
    { name: 'Customer', role: 'Agency owner', topic: 'Lead discovery', quote: 'Finding leads on Instagram used to take me hours. Now I can build a targeted list much faster and spend more time actually talking to potential clients.' },
    { name: 'Customer', role: 'Freelance consultant', topic: 'Personalized DMs', quote: 'The personalized messages are what caught my attention. Instead of sending the same generic DM to everyone, I can tailor my outreach to each prospect.' },
    { name: 'Customer', role: 'Marketing agency founder', topic: 'Time saving', quote: 'Instagram prospecting was becoming a full-time job on its own. Having lead discovery and message generation in one workflow makes things much easier.' },
    { name: 'Customer', role: 'Coach', topic: 'AI appointment setter', quote: 'I like the idea of having AI handle more of the conversation instead of manually managing every single prospect. It gives me more time to focus on qualified leads.' },
    { name: 'Customer', role: 'Online business owner', topic: 'Follow-ups', quote: 'Most opportunities get lost because you forget to follow up. Having follow-ups built into the outreach process makes it easier to stay consistent.' },
    { name: 'Customer', role: 'Social media agency owner', topic: 'Targeted prospecting', quote: 'Being able to find prospects based on the audiences and accounts relevant to my niche is much more useful than randomly messaging people.' },
    { name: 'Customer', role: 'Consultant', topic: 'Simpler workflow', quote: 'I used to jump between different tools to find leads, write messages, and track conversations. Having more of that process in one place is a big plus.' },
    { name: 'Customer', role: 'Agency founder', topic: 'Scaling outreach', quote: 'The biggest benefit is having a repeatable outreach process. I can spend less time doing repetitive prospecting tasks and more time improving my offer.' },
    { name: 'Customer', role: 'Business coach', topic: 'For coaches', quote: 'If you sell services through Instagram, you know how much time goes into finding the right people and starting conversations. This kind of workflow can simplify that process.' },
    { name: 'Customer', role: 'SaaS founder', topic: 'All-in-one outreach', quote: "What interests me most is the combination of lead discovery, personalized outreach, and AI appointment setting. It's much closer to a complete prospecting workflow than just another DM tool." },
];
