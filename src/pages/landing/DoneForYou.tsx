import React from 'react';
import { Check, MessagesSquare, Phone, Search, UserPlus } from 'lucide-react';
import {
    LandingShell, Hero, ProductPreview, MarqueeBand, Section, Heading, Em, Panel, Pipeline, FAQ, Close,
    COST_OF_A_HUMAN, COST_OF_AN_AGENCY, type Step,
} from '../../components/landing/kit';
import { CALL_BOOKING } from '../../components/landing/content';
import { PillButton } from '../../components/ui/PillButton';
import { CalendarFill } from '../../components/landing/motion/CalendarFill';
import type { NavItem } from '../../components/landing/Header';

/**
 * Done for you, at `/lp/dfy` (noindex). The same engine as `/`, sold as a
 * service: we build and warm the Instagram account, send the DMs, answer the
 * replies and book the calls; the client takes the calls. Built on Hormozi's
 * value equation — the dream outcome in the headline, the guarantee for the
 * likelihood, the warm-up clock for the time delay, one step left for effort.
 *
 * There is no checkout for this offer, so every action books the 15-minute
 * call. The figures are the owner's test offer (2026-10-18): $200 a month,
 * 3,000 DMs, 3 sales calls in 30 days or a full refund.
 */

const PRICE = '$200';
const DMS = '3,000';
const CALLS = 3;
const CTA = 'Book a 15-minute call';

const NAV: NavItem[] = [
    { href: '#problem', label: 'The problem' },
    { href: '#how', label: 'How it works' },
    { href: '#guarantee', label: 'Guarantee' },
    { href: '#pricing', label: 'Pricing' },
    { href: '#faq', label: 'FAQ' },
];

const NICHES = [
    'business coach', 'SMMA', 'med spa', 'roofing contractor', 'real estate agent', 'fitness coach',
    'dentist', 'web designer', 'wedding photographer', 'interior designer', 'course creator', 'barbershop',
];

const PROBLEM = [
    ['Where you are', "Clients come from referrals and the odd post. Some months are full, some are empty, and you can't tell which one is coming."],
    ['Where you want to be', "Calls on the calendar every week, from people you've never met, without you starting a single conversation."],
    ["What's in the way", 'Outreach is a second job. Even good software needs someone to run it every day, and that someone ends up being you.'],
] as const;

const STEPS: Step[] = [
    {
        icon: UserPlus,
        title: 'We build the account',
        body: 'A new Instagram account for your business, with a bio, posts and followers, warmed up before it sends a single DM. Your own account is never touched.',
        stat: 'Warmed up first',
    },
    {
        icon: Search,
        title: 'We find and write',
        body: 'We search your niche by keyword, hashtag or place, and write every DM for one person, from their own profile.',
        stat: `${DMS} DMs a month`,
    },
    {
        icon: MessagesSquare,
        title: 'We reply and book',
        body: 'Replies get answered, the quiet ones get followed up, and anyone ready to talk gets your calendar link.',
        stat: 'Follow-ups included',
    },
    {
        icon: Phone,
        title: 'You take the call',
        body: "Show up and sell. That's the whole job.",
        stat: `${CALLS} calls in 30 days, or your money back`,
        you: true,
    },
];

const GUARANTEE = [
    ['When the 30 days start', "The day the first DM goes out, not the day you pay. The warm-up never eats into your month."],
    ['What counts', 'A call booked on your calendar by someone in the niche you asked us to reach.'],
    ['If we fall short', `Fewer than ${CALLS} calls and you get the full ${PRICE} back. Not a credit, not a free extra month.`],
] as const;

const MATH_ROWS = [
    [`${PRICE} ÷ ${DMS} DMs`, 'under 7¢ a message'],
    [`Fewer than ${CALLS} calls`, 'you pay nothing'],
    [`${CALLS} calls or more`, 'at most $67 a call'],
] as const;

const INCLUDED = [
    'A new Instagram account, built and warmed up for your business',
    `${DMS} personal DMs a month, each written for one person`,
    'Lead search in your niche by keyword, hashtag or place',
    'Replies answered and follow-ups sent for you',
    'Calls booked straight onto your calendar',
];

const FAQ_ITEMS = [
    {
        question: 'Do I need to give you my Instagram login?',
        answer: 'No. We build a new account for your business, so we never ask for your password and your own account is never touched.',
    },
    {
        question: 'When do my 30 days start?',
        answer: "The day the first DM goes out. Warming up the account comes first and doesn't count against you.",
    },
    {
        question: 'What counts as a sales call?',
        answer: `A call booked on your calendar by someone in the niche you asked us to reach. Fewer than ${CALLS} in 30 days and you get the full ${PRICE} back.`,
    },
    {
        question: "Won't the DMs sound like a bot?",
        answer: 'Each one is written for the person receiving it, from their own profile. No templates, no merge tags.',
    },
    {
        question: 'What do I actually have to do?',
        answer: 'One 15-minute call to tell us what you sell and who buys it, then send us your calendar link. After that, you take the calls.',
    },
    {
        question: `Why is it only ${PRICE}?`,
        answer: "Every campaign runs on MagnetEngine, our own AI appointment setter, and we're proving it on real businesses. You get the work at a test price; we get the numbers.",
    },
    {
        question: "Who isn't this for?",
        answer: "Anything that doesn't sell on a call. If your product costs $25, nobody books a call to buy it.",
    },
];

const BookCall: React.FC<{ block?: boolean }> = ({ block }) => (
    <PillButton {...CALL_BOOKING} block={block}>
        {CTA}
    </PillButton>
);

const DoneForYou: React.FC = () => (
    <LandingShell nav={NAV} variant="dfy" cta={CTA} ctaBooksCall>
        <Hero
            field={<CalendarFill />}
            audience="For coaches, agencies and consultants who sell on a call."
            title={
                <>
                    We book the sales calls. <Em>You just show up.</Em>
                </>
            }
            sub={
                <>
                    We build an Instagram account for your business, warm it up, send {DMS} personal DMs a month
                    from it, and book the people who answer onto your calendar. Fewer than {CALLS} sales calls in
                    your first 30 days and you get every dollar back.
                </>
            }
            actions={<BookCall />}
            terms={
                <>
                    {PRICE} a month · {CALLS} calls in 30 days or a full refund
                </>
            }
        >
            <ProductPreview
                sendNote={
                    <>
                        Sends from your business's account<br />one every 3–8 min
                    </>
                }
                caption={
                    <>
                        We read every DM before it goes out, and each one is written like this: for one person,
                        from their own profile. This draft is from an example queue.
                    </>
                }
            />
        </Hero>

        <Section id="problem">
            <div className="max-w-3xl mx-auto">
                <Heading className="mb-14">
                    You know outreach works. <Em>You just never get to it.</Em>
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
                    A setter costs {COST_OF_A_HUMAN} a month. An agency costs {COST_OF_AN_AGENCY}.{' '}
                    <span className="text-white font-medium">
                        We do the whole job for {PRICE}, and if it doesn't book you {CALLS} calls, it costs you
                        nothing.
                    </span>
                </p>
            </div>
        </Section>

        <MarqueeBand label="We prospect in any niche on Instagram — by keyword, hashtag or place">
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

        <Section id="how">
            <div className="max-w-6xl mx-auto">
                <Heading className="mb-16 max-w-2xl">
                    Four steps. <Em>You do the last one.</Em>
                </Heading>
                <Pipeline steps={STEPS} />
            </div>
        </Section>

        <Section id="guarantee">
            <div className="max-w-3xl mx-auto">
                <Heading className="mb-14">
                    {CALLS} sales calls in 30 days, <Em>or every dollar back.</Em>
                </Heading>
                <dl className="border-t border-white/8">
                    {GUARANTEE.map(([label, body]) => (
                        <div
                            key={label}
                            className="grid md:grid-cols-[minmax(0,13rem)_1fr] gap-2 md:gap-8 py-7 border-b border-white/8"
                        >
                            <dt className="text-meta font-semibold text-white md:pt-[3px]">{label}</dt>
                            <dd className="text-body text-neutral-300">{body}</dd>
                        </div>
                    ))}
                </dl>
            </div>
        </Section>

        <Section id="math">
            <div className="max-w-2xl mx-auto">
                <Heading className="mb-12 text-center">
                    The worst case <Em>is free.</Em>
                </Heading>
                <Panel className="p-7 md:p-9">
                    <dl>
                        {MATH_ROWS.map(([left, right], i) => (
                            <div
                                key={left}
                                className={`flex items-baseline justify-between gap-5 py-4 ${i ? 'border-t border-white/8' : ''}`}
                            >
                                <dt className="text-body-sm font-medium text-white">{left}</dt>
                                <dd className="text-meta font-mono text-neutral-300 text-right flex-none tabular-nums">{right}</dd>
                            </div>
                        ))}
                    </dl>
                    <p className="mt-7 pt-7 border-t border-white/12 text-body-sm text-neutral-300">
                        If a client is worth <span className="text-white font-medium">$3,000</span> to you, one close
                        pays for <span className="text-white font-medium">fifteen months</span> of this. And if the
                        calls don't come, neither does the bill.
                    </p>
                </Panel>
            </div>
        </Section>

        <Section id="pricing">
            <div className="max-w-2xl mx-auto">
                <Heading className="mb-12 text-center">
                    The whole job, <Em>for less than a week of a setter.</Em>
                </Heading>

                <Panel accent className="p-7 md:p-9">
                    <span className="inline-block mb-7 px-3 py-1 rounded-full text-label font-semibold bg-white/[0.06] border border-white/12 text-white">
                        Done for you · one plan
                    </span>

                    <dl className="mb-7 pb-7 border-b border-white/8 space-y-2.5">
                        {[
                            ['Hiring a setter to do it', `${COST_OF_A_HUMAN}/mo`],
                            ['Paying an agency to do it', `${COST_OF_AN_AGENCY}/mo`],
                        ].map(([label, price]) => (
                            <div key={label} className="flex items-baseline justify-between gap-3">
                                <dt className="text-meta text-neutral-400">{label}</dt>
                                <dd className="text-meta font-mono text-neutral-500 line-through tabular-nums">{price}</dd>
                            </div>
                        ))}
                    </dl>

                    <div className="mb-8">
                        <div className="flex items-baseline gap-2.5 flex-wrap">
                            <span className="text-[3.25rem] leading-none font-semibold tracking-[-0.04em] text-white tabular-nums">
                                {PRICE}
                            </span>
                            <span className="text-[1.1rem] font-medium text-neutral-400">/month</span>
                            <span className="px-3 py-1 rounded-full bg-positive-500/12 border border-positive-500/25 text-positive-300 text-label font-semibold">
                                {CALLS} calls or a full refund
                            </span>
                        </div>
                        <p className="text-body-sm text-neutral-400 mt-3">
                            Your 30 days start with the first DM, not the day you pay.
                        </p>
                    </div>

                    <ul className="space-y-3 mb-9">
                        {INCLUDED.map(f => (
                            <li key={f} className="flex items-start gap-3">
                                <Check className="text-white mt-[4px] flex-none" size={15} strokeWidth={2.6} aria-hidden />
                                <span className="text-body-sm text-neutral-300">{f}</span>
                            </li>
                        ))}
                    </ul>

                    <BookCall block />
                    <p className="text-center mt-4 text-meta text-neutral-400">
                        On the call: what you sell, who buys it, and who we'll reach for you.
                    </p>
                </Panel>
            </div>
        </Section>

        <FAQ items={FAQ_ITEMS} />

        <Close
            heading={
                <>
                    Your next client is <Em>on Instagram today.</Em>
                </>
            }
            body={
                <>
                    Book 15 minutes. Tell us who you want to reach, and we start building the account that reaches
                    them.
                </>
            }
            actions={<BookCall />}
            terms={<>{CALLS} calls in your first 30 days or a full refund</>}
        />
    </LandingShell>
);

export default DoneForYou;
