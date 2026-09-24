import React from 'react';
import type { Lead } from '../../lib/types';

/**
 * The whole Lead lifecycle as one narrowing column of bars, each as wide as
 * its share of every Lead in the workspace.
 *
 * Six stages, not the usual four marketing-funnel tiles, because this product
 * has six: a Lead is found, written to, approved by a human, sent by the
 * extension, answered, and booked. Drawing all of them is what shows where an
 * Operator's pipeline is actually stuck — "222 found, 37 written" is a
 * different problem from "27 approved, 9 sent", and a grid of equal tiles made
 * the two look alike.
 *
 * Widths are linear. A Sent bar at 3% of the width is the honest picture of
 * 9 of 259; a square-root scale would have looked healthier and meant nothing.
 * Stage counts nest by construction: Replied is read only after an outbound
 * DM, and Booked implies Sent (CONTEXT.md).
 */
interface Stage {
    label: string;
    n: number;
    /** Good outcomes take the dashboard's one positive hue; process stays white. */
    outcome?: boolean;
}

export const Pipeline: React.FC<{ leads: Lead[] }> = ({ leads }) => {
    const total = leads.length;
    const stages: Stage[] = [
        { label: 'Found', n: total },
        { label: 'Written', n: leads.filter(l => !!l.dmContent).length },
        { label: 'Approved', n: leads.filter(l => l.approved || l.dmSent).length },
        { label: 'Sent', n: leads.filter(l => l.dmSent).length },
        { label: 'Replied', n: leads.filter(l => l.replied).length, outcome: true },
        { label: 'Booked', n: leads.filter(l => l.booked).length, outcome: true },
    ];

    return (
        <section aria-labelledby="pipeline-title">
            <div className="flex items-baseline justify-between gap-4 pb-3 border-b border-white/8">
                <h2 id="pipeline-title" className="text-body-sm font-semibold text-white">Pipeline</h2>
                <span className="text-label text-neutral-400">share of all leads · step-to-step rate</span>
            </div>

            <ol className="mt-2">
                {stages.map((s, i) => {
                    const share = total > 0 ? s.n / total : 0;
                    const prev = i > 0 ? stages[i - 1].n : null;
                    // First row has no step before it; a step after an empty one has no rate.
                    const rateText = prev === null ? '' : prev === 0 ? '—' : `${Math.round((s.n / prev) * 100)}%`;
                    return (
                        <li key={s.label} className="grid grid-cols-[5.5rem_minmax(0,1fr)_3.5rem_4.5rem] items-center gap-3 py-2.5">
                            <span className="text-meta text-neutral-300">{s.label}</span>
                            <span className="relative h-2 rounded-full bg-white/[0.06] overflow-hidden" aria-hidden>
                                <span
                                    className={`absolute inset-y-0 left-0 rounded-full ${s.outcome ? 'bg-positive-400' : 'bg-white'}`}
                                    style={{ width: s.n > 0 ? `max(3px, ${share * 100}%)` : 0 }}
                                />
                            </span>
                            <span className="text-body-sm font-semibold text-white tabular-nums text-right">{s.n}</span>
                            <span className="text-label text-neutral-400 tabular-nums text-right">
                                {rateText}
                            </span>
                        </li>
                    );
                })}
            </ol>
        </section>
    );
};
