import React from 'react';
import { Check } from 'lucide-react';
import { usePauseOffscreen } from '../../ui/usePauseOffscreen';

/**
 * Variant B's hero field: a wall of message bubbles rising behind the
 * headline, tilted away like a feed seen from above. Every bubble is a
 * different shape — no two drafts the same length — and now and then one is
 * approved (a green check) or answered (a green reply dot).
 *
 * It is the "every message written for one person" angle as a texture: a lot
 * of messages, none of them identical. The bubbles are skeletons on purpose;
 * readable text behind a headline would compete with it.
 *
 * DOM and CSS rather than canvas: seven transformed columns are seven
 * compositor layers, and the loop costs the main thread nothing. It pauses off
 * screen and stands still under reduced motion (landing.css).
 */

/** Deterministic, so the wall is the same on every visit and every render. */
function rng(seed: number) {
    return () => {
        seed |= 0;
        seed = (seed + 0x6d2b79f5) | 0;
        let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

type Kind = 'sent' | 'approved' | 'reply';

interface Bubble {
    kind: Kind;
    lines: number[];
    flashDelay: number;
}

const COLUMNS = 7;
const PER_COLUMN = 7;

function makeWall(): { bubbles: Bubble[]; duration: number; offset: number }[] {
    const r = rng(20260923);
    return Array.from({ length: COLUMNS }, (_, c) => ({
        duration: 46 + r() * 26,
        offset: -r() * 40,
        bubbles: Array.from({ length: PER_COLUMN }, () => {
            const roll = r();
            const kind: Kind = roll < 0.16 ? 'reply' : roll < 0.32 ? 'approved' : 'sent';
            const n = 2 + Math.floor(r() * 3);
            return {
                kind,
                lines: Array.from({ length: n }, (_, i) => (i === n - 1 ? 30 + r() * 40 : 72 + r() * 28)),
                flashDelay: c * 1.7 + r() * 9,
            };
        }),
    }));
}

const WALL = makeWall();

const BubbleView: React.FC<{ b: Bubble }> = ({ b }) => {
    const reply = b.kind === 'reply';
    return (
        <div
            className={`dm-bubble ${reply ? 'dm-bubble-in' : 'dm-bubble-out'} ${b.kind === 'approved' ? 'dm-flash' : ''}`}
            style={{ '--flash-delay': `${b.flashDelay}s` } as React.CSSProperties}
        >
            <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-white/10 flex-none" />
                <span className="h-1.5 w-16 rounded-full bg-white/15" />
                {reply && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-positive-400" />}
                {b.kind === 'approved' && (
                    <span className="dm-check ml-auto w-4 h-4 rounded-full flex items-center justify-center bg-positive-500/20 text-positive-300">
                        <Check size={10} strokeWidth={3} />
                    </span>
                )}
            </div>
            <div className="mt-3 space-y-1.5">
                {b.lines.map((width, i) => (
                    <span key={i} className="block h-1.5 rounded-full bg-white/10" style={{ width: `${width}%` }} />
                ))}
            </div>
        </div>
    );
};

export const DMStream: React.FC<{ className?: string }> = ({ className = '' }) => {
    const ref = usePauseOffscreen<HTMLDivElement>();

    return (
        <div ref={ref} aria-hidden className={`dm-wall absolute inset-0 overflow-hidden pointer-events-none ${className}`}>
            <div className="dm-plane">
                {WALL.map((col, i) => (
                    <div
                        key={i}
                        className="dm-col"
                        style={
                            {
                                '--dur': `${col.duration}s`,
                                '--offset': `${col.offset}s`,
                            } as React.CSSProperties
                        }
                    >
                        {/* Three copies: the track slides by one copy and loops, and two always cover the view. */}
                        <div className="dm-track">
                            {[0, 1, 2].map(copy =>
                                col.bubbles.map((b, j) => <BubbleView key={`${copy}-${j}`} b={b} />),
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default DMStream;
