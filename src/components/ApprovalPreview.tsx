import React, { useEffect, useRef, useState } from 'react';
import { Check, X } from 'lucide-react';
import { CARD_BEZEL, CHANNEL, alpha } from '../lib/theme';

/**
 * The product, as live DOM: an observed profile on the left, the DM written
 * from it on the right, and the Approve control that gates the send.
 *
 * Shared by the landing hero and the sign-in page, so the first thing a visitor
 * reads and the last thing they see before the dashboard are the same object.
 *
 * Two tones. `brand` (the default) carries the public pages' orange. `mono` is
 * the dashboard's palette — white, grays and the green of the Approve control —
 * for a public page dressed to match what the Operator sees after sign-in.
 */

export type PreviewTone = 'brand' | 'mono';

// ─── Motion ───────────────────────────────────────────────────────────────────

/**
 * Adds `is-playing` once the element is on screen, which runs the trace
 * animation in index.css. The CSS resting state is the finished frame, so no
 * script, no observer or reduced motion all leave the card complete.
 */
function usePlayOnce<T extends HTMLElement>(): React.RefObject<T | null> {
    const ref = useRef<T>(null);

    useEffect(() => {
        const el = ref.current;
        if (!el || !('IntersectionObserver' in window)) return;
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

        const io = new IntersectionObserver(
            ([entry]) => {
                if (!entry.isIntersecting) return;
                el.classList.add('is-playing');
                io.disconnect();
            },
            { threshold: 0.35 },
        );
        io.observe(el);
        return () => io.disconnect();
    }, []);

    return ref;
}

// ─── Panel ────────────────────────────────────────────────────────────────────

/** The bezelled panel the public pages use; `accent` gives it a lit edge — orange, or white in `mono`. */
export const BrandPanel: React.FC<{
    children: React.ReactNode;
    className?: string;
    accent?: boolean;
    tone?: PreviewTone;
}> = ({ children, className = '', accent = false, tone = 'brand' }) => (
    <div
        className="rounded-[1.25rem] p-[1px]"
        style={
            accent
                ? {
                      background: `linear-gradient(160deg, ${
                          tone === 'mono' ? alpha(CHANNEL.white, 0.28) : alpha(CHANNEL.brand, 0.45)
                      }, ${alpha(CHANNEL.white, 0.06)} 45%, ${alpha(CHANNEL.white, 0.03)})`,
                  }
                : CARD_BEZEL.outer
        }
    >
        <div className={`rounded-[calc(1.25rem-1px)] bg-surface-raised h-full ${className}`} style={CARD_BEZEL.inner}>
            {children}
        </div>
    </div>
);

// ─── The card ─────────────────────────────────────────────────────────────────

/**
 * What the AI read, and the line it wrote from it. Each pair shares an index:
 * the card plays them in order once, and hovering either half lights both,
 * so "written from the profile" is something the visitor can check line by
 * line rather than take on trust.
 */
const TRACE = [
    { read: 'roofers and HVAC crews', wrote: 'going from referrals to booked out for trades crews' },
    { read: 'Ex-Google Ads', wrote: 'The Google Ads background' },
    { read: 'hiring our first setter', wrote: 'What made a setter the next hire' },
] as const;

/** How many drafts the example queue holds. One number, used everywhere it's shown. */
export const EXAMPLE_QUEUE_SIZE = 38;

const Card: React.FC<{ tone: PreviewTone }> = ({ tone }) => {
    const [lit, setLit] = useState<number | null>(null);
    const mono = tone === 'mono';

    /** Props that make one half of a pair light the other. */
    const pair = (i: number, kind: 'mark' | 'line') => ({
        className: `trace-${kind} ${lit === i ? 'trace-pair-on' : ''} ${
            kind === 'mark' ? `${mono ? 'text-white' : 'text-brand-200'} px-0.5 rounded-sm` : 'text-neutral-100'
        }`,
        style: { '--i': i } as React.CSSProperties,
        onMouseEnter: () => setLit(i),
        onMouseLeave: () => setLit(null),
    });

    return (
        <BrandPanel accent tone={tone} className={`overflow-hidden ${mono ? 'trace-mono' : ''}`}>
            {/* card chrome */}
            <div className="flex items-center gap-3 px-5 py-3.5 border-b border-white/8">
                <span className="text-label font-semibold uppercase tracking-[0.12em] text-neutral-400">
                    Approval queue
                </span>
                <span className="ml-auto flex items-center gap-2 text-label font-mono text-neutral-400 tabular-nums">
                    <span className={`w-1.5 h-1.5 rounded-full ${mono ? 'bg-white' : 'bg-brand-500'}`} />
                    1 of {EXAMPLE_QUEUE_SIZE} waiting
                </span>
            </div>

            <div className="grid sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-white/8">
                {/* observed */}
                <div className="p-5">
                    <div className="flex items-center gap-3">
                        <span className="w-10 h-10 rounded-full flex-none flex items-center justify-center text-meta font-semibold text-white bg-gradient-to-br from-neutral-700 to-neutral-900">
                            LB
                        </span>
                        <div className="min-w-0">
                            <p className="text-white text-body-sm font-semibold leading-tight truncate">@lauren.builds</p>
                            <p className="text-neutral-400 text-label mt-0.5 truncate">Marketing agency · Austin, TX</p>
                        </div>
                    </div>

                    <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2.5">
                        {[
                            ['Followers', '14,207'],
                            ['Account', 'Business'],
                        ].map(([k, v]) => (
                            <div key={k}>
                                <dt className="text-label uppercase tracking-[0.12em] text-neutral-500">{k}</dt>
                                <dd className="text-meta text-neutral-200 font-mono tabular-nums mt-0.5">{v}</dd>
                            </div>
                        ))}
                    </dl>

                    <p className="mt-4 pt-4 border-t border-white/8 text-meta leading-[1.75] text-neutral-400">
                        We take <mark {...pair(0, 'mark')}>{TRACE[0].read}</mark> from word-of-mouth to
                        booked out. <mark {...pair(1, 'mark')}>{TRACE[1].read}</mark>. Currently{' '}
                        <mark {...pair(2, 'mark')}>{TRACE[2].read}</mark>.
                    </p>
                    <p className="mt-3 text-label uppercase tracking-[0.12em] text-neutral-500">
                        Example profile
                    </p>
                </div>

                {/* written */}
                <div className="p-5 flex flex-col">
                    <p className={`text-label uppercase tracking-[0.12em] mb-3 ${mono ? 'text-neutral-300' : 'text-brand-400'}`}>
                        Written from the profile
                    </p>
                    <p className="text-body-sm text-neutral-300 flex-grow">
                        Lauren — <span {...pair(0, 'line')}>{TRACE[0].wrote}</span> is a completely
                        different sell than SaaS, and most people underestimate that.{' '}
                        <span {...pair(1, 'line')}>{TRACE[1].wrote}</span> probably makes the paid side
                        the easy part. <span {...pair(2, 'line')}>{TRACE[2].wrote}</span> and not another
                        media buyer?
                    </p>

                    <div className="mt-5 pt-4 border-t border-white/8 flex flex-wrap items-center gap-2">
                        <span className="trace-approve flex items-center gap-1.5 px-3 py-2 rounded-lg bg-positive-500/12 border border-positive-500/25 text-positive-300 text-meta font-semibold">
                            <Check size={13} strokeWidth={2.6} aria-hidden /> Approve
                        </span>
                        <span className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-white/8 text-neutral-400 text-meta font-medium">
                            <X size={13} strokeWidth={2.6} aria-hidden /> Reject
                        </span>
                        <span className="ml-auto text-label text-neutral-400 text-right leading-snug whitespace-nowrap">
                            Sends from your browser<br />one every 3–8 min
                        </span>
                    </div>
                </div>
            </div>
        </BrandPanel>
    );
};

/**
 * The card, optionally sitting on the queue it came from: two drafts peek out
 * beneath it, so "1 of 38" is something you see rather than read. The stack is
 * layout, not ornament — it is what the Approval Queue actually is.
 */
export const ApprovalPreview: React.FC<{ stacked?: boolean; tone?: PreviewTone }> = ({
    stacked = false,
    tone = 'brand',
}) => {
    const ref = usePlayOnce<HTMLDivElement>();

    if (!stacked) {
        return <div ref={ref}><Card tone={tone} /></div>;
    }

    return (
        <div ref={ref} className="relative pb-7">
            {[2, 1].map(depth => (
                <div
                    key={depth}
                    aria-hidden
                    className="absolute inset-x-0 top-0 bottom-7 rounded-[1.25rem] border border-white/8 bg-surface-raised"
                    style={{
                        transform: `translateY(${depth * 14}px) scale(${1 - depth * 0.04})`,
                        transformOrigin: 'bottom center',
                        opacity: depth === 1 ? 0.7 : 0.4,
                    }}
                />
            ))}
            <div className="relative">
                <Card tone={tone} />
            </div>
        </div>
    );
};
