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
 * Short on purpose: one or two sentences each, owner's call (2026-09-24). The
 * page talks about what the product does, not about the risks of outreach
 * automation — so no question here may answer "is it safe?" either way. A
 * reassurance would be a claim nobody can stand behind; the risk itself stays
 * where it belongs, in the Terms of Service.
 */
export const FAQ_ITEMS = [
    {
        question: 'How does it send the messages?',
        answer: 'Through the MagnetEngine Chrome extension, from your own Instagram account. One message every 3–8 minutes, up to a daily limit you set.',
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
