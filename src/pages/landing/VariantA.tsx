import React from 'react';
import { Search, PenLine, CheckCheck, Send } from 'lucide-react';
import {
    LandingShell, Hero, ProductPreview, MarqueeBand, Section, Heading, Em, Panel, Pipeline,
    FAQ, Close, Testimonials, type Step,
} from '../../components/landing/kit';
import { CALL_BOOKING, CALL_CTA, FAQ_ITEMS, MONTHLY_DMS, NICHE_FAQ_CALL } from '../../components/landing/content';
import { PillButton } from '../../components/ui/PillButton';
import { DMStream } from '../../components/landing/motion/DMStream';
import { HormoziClip } from '../../components/landing/HormoziClip';
import type { NavItem } from '../../components/landing/Header';

/**
 * Landing A — "The Magnet", live at `/`. Outcome first: booked calls without the
 * prospecting. The hero field is the same wall of messages as B, no two alike.
 * The argument runs problem → mechanism → the math. The problem comes straight
 * after the hero (owner, 2026-10-18): it is the section that makes the reader
 * feel understood, so it goes before anything asks them to believe.
 *
 * No price and no trial on this page (owner, 2026-10-19): every action books
 * the demo call, and the math counts conversations, not a break-even. B and C
 * still sell the trial.
 */

const NAV: NavItem[] = [
    { href: '#problem', label: 'The problem' },
    { href: '#how', label: 'How it works' },
    { href: '#math', label: 'The math' },
    { href: '#faq', label: 'FAQ' },
];

/** The page's one action: the demo call. */
const BookCall: React.FC = () => <PillButton {...CALL_BOOKING}>{CALL_CTA}</PillButton>;

const CALL_TERMS = 'A 15-minute call';

/** The shared FAQ, with the niche question answered by the demo instead of the trial. */
const FAQ_A = [...FAQ_ITEMS.filter(f => f.question !== NICHE_FAQ_CALL.question), NICHE_FAQ_CALL];

/** Search terms the Campaign Builder takes as-is. Niches, not customers. */
const NICHES = [
    'business coach', 'SMMA', 'med spa', 'roofing contractor', 'real estate agent', 'fitness coach',
    'dentist', 'web designer', 'wedding photographer', 'interior designer', 'course creator', 'barbershop',
];

const PROBLEM = [
    ['Where you are', 'Six clients. Referrals dried up. You post, it gets 40 views, and none of them can afford you.'],
    ['Where you want to be', 'A calendar with names in it. Fifteen clients. Conversations happening whether or not you feel like starting them.'],
    ["What's in the way", "Nobody is filling the top of your funnel. You know cold DMs work. You just can't send 200 a day and run the business too."],
] as const;

const STEPS: Step[] = [
    {
        icon: Search,
        title: 'It finds them',
        body: 'Type a niche, a hashtag or a city. It pulls matching Instagram profiles and drops the wrong follower counts, keywords and account types.',
        stat: 'Up to 250 profiles per search',
    },
    {
        icon: PenLine,
        title: 'It writes to each one',
        body: 'The AI writes one message for one person. No merge tags, no "love your page 🔥".',
        stat: `${MONTHLY_DMS} DMs a month`,
    },
    {
        icon: CheckCheck,
        title: 'You approve',
        body: 'Read the drafts with your coffee. Edit the ones that need it, reject the ones that miss. Nothing first goes out without you.',
        stat: 'About 10 minutes a day',
        you: true,
    },
    {
        icon: Send,
        title: 'It sends and follows up',
        body: "From your own browser, at a human pace, with follow-ups for anyone who doesn't answer. Replies land in one inbox, with the AI's answer drafted to book the call.",
        stat: 'Sent from your own account',
    },
];

/** An assumption to run your own numbers against — the page says so under the math. */
const REPLY_RATE = 0.08;
const CONVERSATIONS = Math.round(Number(MONTHLY_DMS.replace(/,/g, '')) * REPLY_RATE).toLocaleString('en-US');

const MATH_ROWS = [
    [`${MONTHLY_DMS} DMs sent a month`, 'your allowance'],
    ['× your reply rate', `assume ${REPLY_RATE * 100}% until you have your own`],
    ['= the conversations you start', 'the only thing being sold here'],
] as const;

const VariantA: React.FC = () => (
    <LandingShell nav={NAV} variant="a" cta={CALL_CTA} ctaBooksCall>
        <Hero
            field={<DMStream />}
            title={
                <>
                    Book sales calls from Instagram <Em>without prospecting.</Em>
                </>
            }
            sub={
                <>
                    MagnetEngine is an AI appointment setter for Instagram. It finds the people you want as
                    clients, writes each one a DM from their own profile, and sends it at a human pace. Your
                    part is closing the calls.
                </>
            }
            actions={<BookCall />}
            terms={CALL_TERMS}
        >
            <ProductPreview />
        </Hero>

        <Section id="problem">
            <div className="max-w-3xl mx-auto">
                <Heading className="mb-14">
                    You don't have a lead problem. <Em>You have a "nobody knows you exist" problem.</Em>
                </Heading>
                <dl className="border-t border-white/8">
                    {PROBLEM.map(([label, body], i) => (
                        <div
                            key={label}
                            className="grid md:grid-cols-[minmax(0,13rem)_1fr] gap-2 md:gap-8 py-7 border-b border-white/8"
                        >
                            <dt className={`text-meta font-semibold md:pt-[3px] ${i === 2 ? 'text-white' : 'text-neutral-500'}`}>
                                {label}
                            </dt>
                            <dd className={`text-body ${i === 2 ? 'text-neutral-100' : 'text-neutral-400'}`}>{body}</dd>
                        </div>
                    ))}
                </dl>
                <p className="mt-12 text-lead text-neutral-400">
                    A VA costs $800 a month and sends the same message to everyone, which is why the reply rate is
                    1%.{' '}
                    <span className="text-white font-medium">
                        MagnetEngine writes a different message for every person, and all you do is approve them.
                    </span>
                </p>
            </div>
        </Section>

        <MarqueeBand label="Search any niche on Instagram — by keyword, hashtag or place">
            {NICHES.map(n => (
                <span
                    key={n}
                    className="flex items-center gap-2 px-4 py-2 rounded-full border border-white/8 text-meta text-neutral-300 whitespace-nowrap"
                >
                    <Search size={13} strokeWidth={2.2} aria-hidden className="text-neutral-500" />
                    {n}
                </span>
            ))}
        </MarqueeBand>

        <HormoziClip />

        <Section id="how">
            <div className="max-w-6xl mx-auto">
                <Heading className="mb-16 max-w-2xl">
                    Four steps. <Em>You do one of them.</Em>
                </Heading>
                <Pipeline steps={STEPS} />
            </div>
        </Section>

        <Section id="math">
            <div className="max-w-2xl mx-auto">
                <Heading className="mb-12 text-center">
                    What {MONTHLY_DMS} DMs <Em>turn into.</Em>
                </Heading>
                <Panel className="p-7 md:p-9">
                    <dl>
                        {MATH_ROWS.map(([left, right], i) => (
                            <div
                                key={left}
                                className={`flex items-baseline justify-between gap-5 py-4 ${i ? 'border-t border-white/8' : ''}`}
                            >
                                <dt className="text-body-sm font-medium text-white">{left}</dt>
                                <dd className="text-meta text-neutral-400 text-right flex-none">{right}</dd>
                            </div>
                        ))}
                    </dl>
                    <div className="mt-7 pt-7 border-t border-white/12">
                        <p className="text-body-sm text-neutral-300">
                            At {REPLY_RATE * 100}%, that's{' '}
                            <span className="text-white font-medium">{CONVERSATIONS} conversations a month</span> with
                            people who wrote back — every one of them a call you could book.
                        </p>
                        <p className="text-meta text-neutral-400 mt-4">
                            The {REPLY_RATE * 100}% is an assumption to run your own numbers against, not a result we've
                            measured — your niche and your offer decide it.
                        </p>
                    </div>
                </Panel>
            </div>
        </Section>

        <Testimonials />

        <FAQ items={FAQ_A} />

        <Close
            heading={
                <>
                    The people you want as clients are <Em>posting today.</Em>
                </>
            }
            body={
                <>
                    You can keep meaning to reach out, or you can have {MONTHLY_DMS} individual messages go out this
                    month while you work on something else.
                </>
            }
            actions={<BookCall />}
            terms={CALL_TERMS}
        />
    </LandingShell>
);

export default VariantA;
