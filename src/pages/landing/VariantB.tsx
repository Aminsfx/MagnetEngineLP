import React from 'react';
import { Search, PenLine, CheckCheck, Send, Check, X, Copy } from 'lucide-react';
import {
    LandingShell, Hero, ProductPreview, MarqueeBand, Section, Heading, Em, Panel, Pipeline,
    Pricing, FAQ, Close, type Step,
} from '../../components/landing/kit';
import { MONTHLY_DMS } from '../../components/landing/content';
import { DMStream } from '../../components/landing/motion/DMStream';
import type { NavItem } from '../../components/landing/Header';
import { PRICES } from '../../lib/plans';
import { CARD_BEZEL } from '../../lib/theme';

/**
 * Landing B — "Not a template", at `/lp/b` for A/B tests. The mechanism first: every DM is written for
 * one person, and the page proves it by putting a template and a written
 * message side by side. The hero field is a wall of messages, no two alike.
 */

const NAV: NavItem[] = [
    { href: '#difference', label: 'The difference' },
    { href: '#how', label: 'How it works' },
    { href: '#compare', label: 'Compare' },
    { href: '#pricing', label: 'Pricing' },
    { href: '#faq', label: 'FAQ' },
];

/**
 * Example openers. Synthetic — invented profiles, labelled as examples on the
 * page — written the way the product writes: one detail from the bio, one
 * question the person can answer.
 */
const OPENERS = [
    ['lauren.builds', 'Going from referrals to booked out for trades crews is a different sell than SaaS…'],
    ['coach.devon', 'Moving your 1:1 clients into a cohort is a brave call — what tipped it?'],
    ['mira.medspa', 'Opening a second location while still doing the injections yourself…'],
    ['atlas.roofing', 'Storm season must make lead flow feast or famine. How do you smooth it out?'],
    ['jen.fitlab', 'The postpartum programme in your highlights is a sharp niche. Is it most of your roster now?'],
    ['northside.dental', 'Saturday Invisalign consults — is that filling from Instagram or referrals?'],
] as const;

const STEPS: Step[] = [
    {
        icon: Search,
        title: 'It finds the people',
        body: 'Search a niche, a hashtag or a place. It pulls the matching profiles and filters out the ones that were never going to buy.',
        stat: 'Up to 250 profiles per search',
    },
    {
        icon: PenLine,
        title: 'It reads every profile',
        body: 'Bio, business category, city, follower count. The DM is written from what that one person actually said about themselves.',
        stat: `${MONTHLY_DMS} DMs a month`,
    },
    {
        icon: CheckCheck,
        title: 'You read, then approve',
        body: 'Every draft waits for you. If one reads like a robot wrote it, you will see it in the queue — and it will not go out.',
        stat: 'About 10 minutes a day',
        you: true,
    },
    {
        icon: Send,
        title: 'It sends like a person',
        body: 'From your own Instagram, in your own browser, with a gap between messages and a daily cap you set.',
        stat: '40 a day by default, 3–8 min apart',
    },
];

const COMPARE: [label: string, va: boolean, bot: boolean, us: boolean][] = [
    ['Writes a different message per person', false, false, true],
    ['Reads the profile before writing', false, false, true],
    ['You approve everything before it sends', true, false, true],
    ['Costs less than $250/month', false, true, true],
    ['Keeps a human pace and a daily cap', true, false, true],
    ["Doesn't quit on you in month three", false, true, true],
];

const COMPARE_SHORT = ['VA', 'Bot', 'MagnetEngine'] as const;

/** The side-by-side: what everyone else sends, and what this wrote. */
const Difference: React.FC = () => (
    <Section id="difference">
        <div className="max-w-5xl mx-auto">
            <Heading className="mb-14 text-center">
                Same prospect. <Em>Two different messages.</Em>
            </Heading>

            <div className="grid md:grid-cols-2 gap-5 items-stretch">
                {/* the template */}
                <div className="rounded-[1.25rem] p-[1px]" style={CARD_BEZEL.outer}>
                    <div className="h-full rounded-[calc(1.25rem-1px)] bg-surface-raised p-7 flex flex-col" style={CARD_BEZEL.inner}>
                        <div className="flex items-center justify-between gap-3">
                            <p className="text-meta font-semibold text-neutral-400">What a template sends</p>
                            <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-white/8 text-label font-mono text-neutral-400 tabular-nums">
                                <Copy size={11} aria-hidden /> ×400 today
                            </span>
                        </div>
                        <p className="mt-6 flex-1 text-body text-neutral-400 leading-relaxed">
                            Hey! Love your page. We help businesses like yours get more clients with a proven system.
                            Would you be open to a quick chat this week?
                        </p>
                        <ul className="mt-7 pt-5 border-t border-white/8 space-y-2 text-meta text-neutral-400">
                            <li className="flex items-start gap-2"><X size={13} aria-hidden className="mt-[3px] flex-none text-neutral-500" /> No name, nothing from the profile</li>
                            <li className="flex items-start gap-2"><X size={13} aria-hidden className="mt-[3px] flex-none text-neutral-500" /> The same string, 400 times — which Instagram notices</li>
                        </ul>
                    </div>
                </div>

                {/* the written one */}
                <Panel accent className="p-7 flex flex-col">
                    <div className="flex items-center justify-between gap-3">
                        <p className="text-meta font-semibold text-white">What MagnetEngine wrote</p>
                        <span className="px-2.5 py-1 rounded-full bg-positive-500/12 border border-positive-500/25 text-positive-300 text-label font-semibold">
                            Approved
                        </span>
                    </div>
                    <p className="mt-6 flex-1 text-body text-neutral-100 leading-relaxed">
                        Lauren — going from referrals to booked out for trades crews is a completely different sell
                        than SaaS, and most people underestimate that. The Google Ads background probably makes the
                        paid side the easy part. What made a setter the next hire and not another media buyer?
                    </p>
                    <ul className="mt-7 pt-5 border-t border-white/8 space-y-2 text-meta text-neutral-300">
                        <li className="flex items-start gap-2"><Check size={13} aria-hidden className="mt-[3px] flex-none text-positive-400" /> Three details from her bio, used once each</li>
                        <li className="flex items-start gap-2"><Check size={13} aria-hidden className="mt-[3px] flex-none text-positive-400" /> One question only she can answer</li>
                    </ul>
                </Panel>
            </div>
            <p className="mt-4 text-center text-meta text-neutral-500">Example profile and message.</p>
        </div>
    </Section>
);

const Compare: React.FC = () => (
    <Section id="compare">
        <div className="max-w-4xl mx-auto">
            <Heading className="mb-12">
                Three ways to fill a calendar. <Em>One reads the profile.</Em>
            </Heading>

            <div className="rounded-[1.25rem] p-[1px]" style={CARD_BEZEL.outer}>
                <div className="relative rounded-[calc(1.25rem-1px)] bg-surface-raised overflow-x-auto" style={CARD_BEZEL.inner}>
                    <table className="hidden sm:table w-full min-w-[580px] border-collapse">
                        <caption className="sr-only">How a VA, a cheap bot and MagnetEngine compare</caption>
                        <thead>
                            <tr className="border-b border-white/8">
                                <th scope="col" className="text-left p-5" />
                                <th scope="col" className="p-5 text-meta font-semibold text-neutral-400">
                                    A VA
                                    <span className="block text-neutral-500 font-normal font-mono text-label mt-0.5">$800/mo</span>
                                </th>
                                <th scope="col" className="p-5 text-meta font-semibold text-neutral-400">
                                    A $47 bot
                                    <span className="block text-neutral-500 font-normal text-label mt-0.5">+ a ban risk</span>
                                </th>
                                <th scope="col" className="p-5 text-meta font-semibold text-white bg-white/[0.04] border-x border-white/10">
                                    MagnetEngine
                                    <span className="block text-neutral-400 font-normal font-mono text-label mt-0.5">
                                        {PRICES.monthly.label}/mo
                                    </span>
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {COMPARE.map(([label, va, bot, us], i) => (
                                <tr key={label} className={i ? 'border-t border-white/6' : ''}>
                                    <th scope="row" className="p-5 text-left text-body-sm font-normal text-neutral-300">{label}</th>
                                    {[va, bot, us].map((v, j) => (
                                        <td key={j} className={`p-5 text-center ${j === 2 ? 'bg-white/[0.04] border-x border-white/10' : ''}`}>
                                            {v ? (
                                                <Check size={16} strokeWidth={2.6} aria-hidden className={`mx-auto ${j === 2 ? 'text-positive-400' : 'text-neutral-400'}`} />
                                            ) : (
                                                <X size={16} strokeWidth={2.6} aria-hidden className="mx-auto text-neutral-600" />
                                            )}
                                            <span className="sr-only">{v ? 'Yes' : 'No'}</span>
                                        </td>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    </table>

                    {/* Below `sm` each row restacks, so MagnetEngine stays on screen. */}
                    <ul className="sm:hidden divide-y divide-white/6">
                        {COMPARE.map(([label, ...answers]) => (
                            <li key={label} className="p-4">
                                <p className="text-body-sm text-neutral-300 mb-3">{label}</p>
                                <div className="grid grid-cols-3 gap-1.5 text-label">
                                    {answers.map((v, j) => (
                                        <span
                                            key={j}
                                            className={`flex items-center justify-center gap-1 rounded-full py-1.5 ${
                                                j === 2 ? 'bg-white/[0.06] border border-white/15 text-white font-semibold' : 'border border-white/6 text-neutral-500'
                                            }`}
                                        >
                                            {v ? (
                                                <Check size={12} strokeWidth={2.6} aria-hidden className={j === 2 ? 'text-positive-400' : ''} />
                                            ) : (
                                                <X size={12} strokeWidth={2.6} aria-hidden />
                                            )}
                                            {COMPARE_SHORT[j]}
                                            <span className="sr-only">: {v ? 'Yes' : 'No'}</span>
                                        </span>
                                    ))}
                                </div>
                            </li>
                        ))}
                    </ul>
                </div>
            </div>
        </div>
    </Section>
);

const VariantB: React.FC = () => (
    <LandingShell nav={NAV} variant="b">
        <Hero
            field={<DMStream />}
            title={
                <>
                    Cold DMs that read like <Em>you wrote every one.</Em>
                </>
            }
            sub={
                <>
                    Bots send one template to everybody, which is why nobody answers. MagnetEngine reads each
                    prospect's profile, writes them one message, and waits for your approval.
                </>
            }
        >
            <ProductPreview />
        </Hero>

        <MarqueeBand label="Example openers — each one written from a single profile" duration={70}>
            {OPENERS.map(([handle, line]) => (
                <span
                    key={handle}
                    className="flex items-baseline gap-2.5 max-w-[26rem] px-5 py-3 rounded-2xl rounded-bl-md border border-white/8 bg-white/[0.02] text-meta whitespace-nowrap"
                >
                    <span className="font-mono text-neutral-500 flex-none">@{handle}</span>
                    <span className="text-neutral-300 truncate">{line}</span>
                </span>
            ))}
        </MarqueeBand>

        <Difference />

        <Section id="how">
            <div className="max-w-6xl mx-auto">
                <Heading className="mb-16 max-w-2xl">
                    It does the reading. <Em>You do the approving.</Em>
                </Heading>
                <Pipeline steps={STEPS} />
            </div>
        </Section>

        <Compare />

        <Pricing
            heading={
                <>
                    One plan. <Em>Every message written.</Em>
                </>
            }
        />

        <FAQ />

        <Close
            heading={
                <>
                    Stop sending the message <Em>everyone else sends.</Em>
                </>
            }
            body={
                <>
                    {MONTHLY_DMS} messages a month, each one written for the person reading it, each one read by you
                    before it goes.
                </>
            }
        />
    </LandingShell>
);

export default VariantB;
