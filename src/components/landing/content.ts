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
 * Short on purpose: one or two sentences each, owner's call (2026-09-24).
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
        question: 'How does it send the messages?',
        answer: 'Through the MagnetEngine Chrome extension, from your own Instagram account, at a human pace.',
    },
    {
        question: 'Will this get my Instagram account banned?',
        answer: "We never ask for your Instagram password and never store your login. The messages go out from the Instagram you're already signed into, in your own browser — one at a time, like a person, and only the ones you approved.",
    },
    {
        question: 'Is every message really different?',
        answer: 'Yes. Each DM is written for the person receiving it, and you approve every one before it goes out.',
    },
    {
        question: 'How much of my time does it take?',
        answer: 'About ten minutes a day to review and approve. Answering the replies is where your time goes.',
    },
    {
        question: 'Do I need API keys or an AI account?',
        answer: 'No. The AI is built in and included in your subscription.',
    },
    {
        question: 'Can I cancel?',
        answer: 'Yes. Cancel before your 3-day trial ends and you pay nothing.',
    },
];
