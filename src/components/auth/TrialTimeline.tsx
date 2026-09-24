import React from 'react';
import { Check } from 'lucide-react';
import { PRICES, type BillingCycle } from '../../lib/plans';

/** Trial length in days. The charge lands on the morning of day 4. */
const TRIAL_DAYS = 3;

const fmt = (d: Date) => d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });

/**
 * What happens between signing up and the first charge, with real dates.
 *
 * A trial that hides when it bills reads as a trap, so the charge date is the
 * last line of the list rather than fine print — computed from today, because
 * "day 4" makes the reader do arithmetic and "Sat, Sep 26" doesn't. Every step
 * is a claim the landing page already makes (card required, first campaign
 * inside 48 hours, cancel before day 4 and pay nothing).
 */
export const TrialTimeline: React.FC<{
    /** Which step the reader is on: 0 = before sign-up, 1 = account made, paying next. */
    at: 0 | 1;
    billing?: BillingCycle;
    now?: Date;
}> = ({ at, billing = 'monthly', now = new Date() }) => {
    const charge = new Date(now);
    charge.setDate(charge.getDate() + TRIAL_DAYS);
    const price = `${PRICES[billing].label}${PRICES[billing].suffix}`;

    const steps = [
        { when: 'Today', what: 'Create your account', note: 'Name, email, password.' },
        { when: 'Today', what: 'Start the 3-day trial', note: 'Card required. Nothing is charged today.' },
        { when: 'Within 48 hours', what: 'Your first DMs are in the queue', note: 'Search a niche, read the drafts, approve the good ones.' },
        { when: fmt(charge), what: `First charge: ${price}`, note: `Cancel before ${fmt(charge)} and you pay nothing.`, emphasis: true },
    ];

    return (
        <ol className="relative">
            <span aria-hidden className="absolute left-[11px] top-3 bottom-3 w-px bg-white/10" />
            {steps.map((s, i) => {
                const done = i < at;
                const current = i === at;
                return (
                    <li key={s.what} className="relative grid grid-cols-[1.5rem_1fr] gap-4 pb-7 last:pb-0">
                        <span
                            className={`relative z-10 mt-0.5 w-6 h-6 rounded-full flex items-center justify-center text-label font-semibold tabular-nums ${
                                done
                                    ? 'bg-white text-surface'
                                    : current
                                    ? 'bg-surface border-2 border-white text-white'
                                    : 'bg-surface border border-white/15 text-neutral-400'
                            }`}
                        >
                            {done ? <Check className="w-3.5 h-3.5" strokeWidth={3} aria-hidden /> : i + 1}
                        </span>
                        <div>
                            <p className={`text-label uppercase tracking-[0.12em] tabular-nums ${s.emphasis ? 'text-white font-semibold' : 'text-neutral-400'}`}>
                                {s.when}
                            </p>
                            <p className={`mt-1 text-body-sm font-semibold ${done ? 'text-neutral-400 line-through decoration-white/20' : 'text-white'}`}>
                                {s.what}
                            </p>
                            <p className="mt-0.5 text-meta text-neutral-400">{s.note}</p>
                        </div>
                    </li>
                );
            })}
        </ol>
    );
};
