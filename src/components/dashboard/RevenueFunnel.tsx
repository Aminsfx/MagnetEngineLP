import React, { useMemo, useState } from 'react';
import { UserPlus, MessagesSquare, Star, Phone, Trophy, ArrowRight, ChevronDown, type LucideIcon } from 'lucide-react';
import type { Lead } from '../../lib/types';
import { CARD_BEZEL } from '../../lib/theme';
import { formatMoney, funnel, monthPeriod, pipeline, revenue, stepRate, type FunnelKey, type Period } from '../../lib/reports';
import { INBOX_PAUSED } from '../../lib/routes';

/**
 * Money and the outcome funnel for one period: what was won, what has been
 * paid, what is still owed, and how Leads moved from found to won.
 *
 * The funnel is the outcome view — New leads → In contact → Qualified →
 * Booked → Won — beside the Pipeline's operational one (Found → Written →
 * Approved → Sent), because the question here is "where did the money come
 * from", not "where is my queue stuck". Band heights are linear in the count,
 * like the Pipeline's bars: a thin Won band is the honest picture.
 */

type PeriodKey = 'month' | 'last_month' | 'all';

const PERIODS: Array<{ key: PeriodKey; label: string; compare: string }> = [
    { key: 'month', label: 'This month', compare: 'Versus last month' },
    { key: 'last_month', label: 'Last month', compare: 'Versus the month before' },
    { key: 'all', label: 'All time', compare: 'Deals won' },
];

const periodOf = (key: PeriodKey): Period | null =>
    key === 'all' ? null : monthPeriod(key === 'month' ? 0 : -1);

const STAGE_ICON: Record<FunnelKey, LucideIcon> = {
    new: UserPlus,
    contact: MessagesSquare,
    qualified: Star,
    booked: Phone,
    won: Trophy,
};

/** Smooth band through each column's height, centred on the band's midline. */
function bandPath(heights: number[], width: number, height: number): string {
    const col = width / heights.length;
    const mid = height / 2;
    // Each column holds its height flat across its middle half, then eases into
    // the next across the boundary — the curve needs width, or it is a step.
    const ease = col * 0.25;
    const points = heights.flatMap((h, i) => [
        { x: i === 0 ? 0 : i * col + ease, h },
        { x: i === heights.length - 1 ? width : (i + 1) * col - ease, h },
    ]);
    const top = points.map((p, i) => {
        if (i === 0) return `M ${p.x} ${mid - p.h / 2}`;
        const prev = points[i - 1];
        if (prev.h === p.h) return `L ${p.x} ${mid - p.h / 2}`;
        const cx = (prev.x + p.x) / 2;
        return `C ${cx} ${mid - prev.h / 2}, ${cx} ${mid - p.h / 2}, ${p.x} ${mid - p.h / 2}`;
    });
    const back = [...points].reverse();
    const bottom = back.map((p, i) => {
        if (i === 0) return `L ${p.x} ${mid + p.h / 2}`;
        const prev = back[i - 1];
        if (prev.h === p.h) return `L ${p.x} ${mid + p.h / 2}`;
        const cx = (prev.x + p.x) / 2;
        return `C ${cx} ${mid + prev.h / 2}, ${cx} ${mid + p.h / 2}, ${p.x} ${mid + p.h / 2}`;
    });
    return `${top.join(' ')} ${bottom.join(' ')} Z`;
}

const BAND_W = 1000;
const BAND_H = 140;

const Cell: React.FC<{ label: string; value: React.ReactNode; tone?: 'positive' }> = ({ label, value, tone }) => (
    <div className="px-5 py-4 min-w-0">
        <p className="text-meta text-neutral-400">{label}</p>
        <p className={`mt-6 text-2xl font-semibold tabular-nums tracking-[-0.02em] ${tone === 'positive' ? 'text-positive-400' : 'text-white'}`}>
            {value}
        </p>
    </div>
);

export const RevenueFunnel: React.FC<{ leads: Lead[] }> = ({ leads }) => {
    const [periodKey, setPeriodKey] = useState<PeriodKey>('month');
    const period = periodOf(periodKey);
    const meta = PERIODS.find(p => p.key === periodKey)!;

    const money = useMemo(() => revenue(leads, period), [leads, period]);
    const stages = useMemo(() => funnel(leads, period), [leads, period]);
    const everWon = useMemo(() => leads.some(l => l.closedAt), [leads]);
    // Not per period: a call booked last month and still open is on the table now.
    const onTable = useMemo(() => pipeline(leads), [leads]);

    const max = Math.max(...stages.map(s => s.n), 1);
    const heights = stages.map(s => (s.n > 0 ? Math.max((s.n / max) * BAND_H, 3) : 0));

    const changeText = money.change === null ? '—' : `${money.change > 0 ? '+' : ''}${money.change}%`;

    return (
        <section aria-labelledby="revenue-title" className="space-y-4">
            <div className="flex items-center justify-between gap-4">
                <h2 id="revenue-title" className="text-body-sm font-semibold text-white">Revenue</h2>
                <label className="relative">
                    <span className="sr-only">Period</span>
                    <select
                        value={periodKey}
                        onChange={(e) => setPeriodKey(e.target.value as PeriodKey)}
                        className="appearance-none pl-3.5 pr-9 py-2 rounded-xl border border-white/10 bg-white/[0.03] text-meta text-white focus:outline-none focus:border-white/40 cursor-pointer"
                    >
                        {PERIODS.map(p => <option key={p.key} value={p.key} className="bg-surface-overlay">{p.label}</option>)}
                    </select>
                    <ChevronDown className="w-3.5 h-3.5 text-neutral-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" aria-hidden />
                </label>
            </div>

            {/* Money */}
            <div className="rounded-[1.5rem] p-[1px]" style={CARD_BEZEL.outer}>
                {/* gap-px over a hairline ground draws the dividers at every breakpoint. */}
                <div
                    className="rounded-[calc(1.5rem-1px)] overflow-hidden grid grid-cols-2 lg:grid-cols-4 gap-px bg-white/8 [&>*]:bg-surface-sunken"
                    style={CARD_BEZEL.inner}
                >
                    <Cell label="Total revenue" value={formatMoney(money.total)} />
                    <Cell label="Cash collected" value={formatMoney(money.collected)} />
                    <Cell label="Cash to be collected" value={formatMoney(money.outstanding)} />
                    {period ? (
                        <Cell
                            label={meta.compare}
                            value={changeText}
                            tone={money.change !== null && money.change > 0 ? 'positive' : undefined}
                        />
                    ) : (
                        <Cell label={meta.compare} value={money.deals} />
                    )}
                </div>
            </div>
            {onTable.deals > 0 && (
                <p className="text-meta text-neutral-400">
                    <span className="text-white font-medium tabular-nums">{formatMoney(onTable.value)}</span> in your pipeline:{' '}
                    {onTable.deals} booked {onTable.deals === 1 ? 'call' : 'calls'} with a price, not won yet. It moves into
                    revenue when you mark the deal won.
                </p>
            )}
            {!everWon && (
                <p className="text-meta text-neutral-400">
                    {INBOX_PAUSED ? (
                        <>
                            Revenue counts the deals you record as won. In the Approval Queue, press{' '}
                            <span className="text-white font-medium">$</span> on a booked lead to enter what they paid.
                        </>
                    ) : (
                        <>
                            Revenue counts the deals you mark as won. In the Inbox, type the price you’re pitching on a
                            conversation, press <span className="text-white font-medium">Booked</span> when they book a call,
                            then <span className="text-white font-medium">Mark as won</span> when they pay.
                        </>
                    )}
                </p>
            )}

            {/* Funnel */}
            <div className="rounded-[1.5rem] p-[1px]" style={CARD_BEZEL.outer}>
                <div className="bg-surface-sunken rounded-[calc(1.5rem-1px)] overflow-hidden" style={CARD_BEZEL.inner}>
                    <div className="px-5 py-3.5 border-b border-white/8 flex items-baseline justify-between gap-4">
                        <h3 className="text-meta font-semibold text-white">Funnel</h3>
                        <span className="text-label text-neutral-400">{meta.label.toLowerCase()} · step-to-step rate</span>
                    </div>
                    <div className="relative">
                        <ol className="grid grid-cols-5 divide-x divide-white/8">
                            {stages.map((s) => {
                                const Icon = STAGE_ICON[s.key];
                                return (
                                    <li key={s.key} className="px-3 sm:px-5 pt-4 pb-[188px] min-w-0">
                                        <p className="flex items-center gap-1.5 text-label sm:text-meta text-neutral-400 min-w-0">
                                            <Icon className={`w-3.5 h-3.5 flex-none ${s.key === 'won' ? 'text-positive-400' : 'text-neutral-300'}`} aria-hidden />
                                            <span className="truncate">{s.label}</span>
                                        </p>
                                        <p className="mt-1.5 text-xl sm:text-2xl font-semibold text-white tabular-nums">{s.n}</p>
                                    </li>
                                );
                            })}
                        </ol>
                        <svg
                            viewBox={`0 0 ${BAND_W} ${BAND_H}`}
                            preserveAspectRatio="none"
                            className="absolute left-0 right-0 bottom-6 w-full h-[140px] pointer-events-none"
                            aria-hidden
                        >
                            <defs>
                                <linearGradient id="funnel-band" x1="0" x2="1" y1="0" y2="0">
                                    <stop offset="0%" stopColor="white" stopOpacity="0.07" />
                                    <stop offset="100%" stopColor="white" stopOpacity="0.32" />
                                </linearGradient>
                            </defs>
                            <path d={bandPath(heights, BAND_W, BAND_H)} fill="url(#funnel-band)" />
                        </svg>
                        {/* Rates sit on the boundary between two columns. */}
                        <div className="absolute left-0 right-0 bottom-6 h-[140px] pointer-events-none" aria-hidden>
                            {stages.slice(1).map((s, i) => {
                                const rate = stepRate(stages[i].n, s.n);
                                return (
                                    <span
                                        key={s.key}
                                        className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center gap-1 px-2 py-1 rounded-full bg-surface-overlay border border-white/12 text-label font-medium text-white tabular-nums whitespace-nowrap"
                                        style={{ left: `${((i + 1) / stages.length) * 100}%` }}
                                    >
                                        {rate === null ? '—' : `${rate}%`}
                                        <ArrowRight className="w-3 h-3 text-neutral-400" />
                                    </span>
                                );
                            })}
                        </div>
                    </div>
                    <p className="sr-only">
                        {stages.map((s, i) => {
                            const rate = i > 0 ? stepRate(stages[i - 1].n, s.n) : null;
                            return `${s.label}: ${s.n}${rate === null ? '' : ` (${rate}% of the step before)`}`;
                        }).join('. ')}
                    </p>
                </div>
            </div>
        </section>
    );
};
