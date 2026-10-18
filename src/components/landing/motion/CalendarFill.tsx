import React from 'react';
import { usePauseOffscreen } from '../../ui/usePauseOffscreen';
import { rng } from './rng';

/**
 * The done-for-you page's hero field: someone else's calendar drifting past,
 * tilted away like DMStream's wall, and every few seconds an empty slot books
 * itself — an emerald card lands, holds, and the week rolls on.
 *
 * It is the page's promise as a texture: you do nothing, and the calendar
 * fills. Grey blocks are the meetings already there, so a booking reads as
 * something added to a real week rather than a pattern. The cards are
 * skeletons; readable names behind a headline would compete with it.
 *
 * DOM and CSS like DMStream: one transformed grid, its loop on the compositor.
 * It pauses off screen, and under reduced motion it stands still with its
 * bookings shown (landing.css).
 */

type Kind = 'free' | 'busy' | 'booking';

interface Slot {
    kind: Kind;
    /** Seconds into its cycle before the card lands — staggered so only a few land at once. */
    delay: number;
    /** Length of the card's skeleton title, as a % of the slot. */
    line: number;
}

const DAYS = 7;
const ROWS = 9;

function makeWeek(): Slot[] {
    const r = rng(20261018);
    return Array.from({ length: DAYS * ROWS }, () => {
        const roll = r();
        const kind: Kind = roll < 0.2 ? 'booking' : roll < 0.36 ? 'busy' : 'free';
        return { kind, delay: r() * 16, line: 40 + r() * 45 };
    });
}

const WEEK = makeWeek();

const SlotView: React.FC<{ s: Slot }> = ({ s }) => (
    <div className="cal-slot">
        {s.kind === 'busy' && (
            <div className="cal-card cal-card-busy">
                <span className="block h-1.5 rounded-full bg-white/12" style={{ width: `${s.line}%` }} />
            </div>
        )}
        {s.kind === 'booking' && (
            <div className="cal-card cal-card-booked" style={{ '--book-delay': `${s.delay}s` } as React.CSSProperties}>
                <span className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-positive-400 flex-none" />
                    <span className="block h-1.5 rounded-full bg-positive-300/40" style={{ width: `${s.line}%` }} />
                </span>
                <span className="mt-2 block h-1.5 w-1/3 rounded-full bg-white/10" />
            </div>
        )}
    </div>
);

export const CalendarFill: React.FC<{ className?: string }> = ({ className = '' }) => {
    const ref = usePauseOffscreen<HTMLDivElement>();

    return (
        <div ref={ref} aria-hidden className={`cal-wall absolute inset-0 overflow-hidden pointer-events-none ${className}`}>
            <div className="cal-plane">
                {/* Three copies of the week: the grid slides by one copy and loops. */}
                <div className="cal-track">
                    {[0, 1, 2].map(copy => WEEK.map((s, i) => <SlotView key={`${copy}-${i}`} s={s} />))}
                </div>
            </div>
        </div>
    );
};

export default CalendarFill;
