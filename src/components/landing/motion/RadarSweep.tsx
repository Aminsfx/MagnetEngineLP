import React from 'react';
import { CHANNEL } from '../../../lib/theme';
import { useCanvasScene, type SceneBuild } from './useCanvasScene';

/**
 * Variant C's hero field: a radar sweep turning over a dot grid. The grid
 * lights in the beam's wake and fades back; a scatter of contacts pings green
 * as the beam finds them, then moves on.
 *
 * It is the "runs while you work" angle made visible — a search that keeps
 * going round without anyone at the controls, and the handful of hits it turns
 * up each pass. Green is the dashboard's one hue and there means a good
 * outcome: a prospect found.
 *
 * The grid's polar coordinates are computed once per resize; a frame is one
 * pass over ~1,700 dots with no allocation, which is cheap enough for a phone.
 */

const CFG = {
    /** Grid pitch in CSS pixels. */
    pitch: 28,
    /** Milliseconds per revolution. */
    period: 9000,
    /** How long the wake lingers, in radians of beam travel. */
    wake: 0.9,
    rings: 5,
    contacts: 18,
    /** How long a found contact stays lit. */
    contactLife: 3600,
    /** A ping ring's opening time. */
    pingLife: 1300,
} as const;

interface Dot {
    x: number;
    y: number;
    angle: number;
    /** 1 at the centre, 0 at the rim — the grid dims toward the edges. */
    near: number;
}

interface Contact {
    x: number;
    y: number;
    angle: number;
    /** Milliseconds since the beam last found it; Infinity if never. */
    age: number;
    prevDelta: number;
}

const TAU = Math.PI * 2;

/** Radians from `from` forward to `to`, in [0, 2π). */
const ahead = (from: number, to: number) => (((from - to) % TAU) + TAU) % TAU;

const build: SceneBuild = (ctx, w, h) => {
    const cx = w * 0.5;
    const cy = h * 0.4;
    const reach = Math.hypot(Math.max(cx, w - cx), Math.max(cy, h - cy));

    const dots: Dot[] = [];
    const ox = (w % CFG.pitch) / 2;
    const oy = (h % CFG.pitch) / 2;
    for (let y = oy; y < h; y += CFG.pitch) {
        for (let x = ox; x < w; x += CFG.pitch) {
            const d = Math.hypot(x - cx, y - cy);
            dots.push({ x, y, angle: Math.atan2(y - cy, x - cx), near: Math.max(0, 1 - d / reach) });
        }
    }

    const place = (c: Contact) => {
        // Keep contacts off the centre, where the headline sits.
        const r = reach * (0.22 + Math.random() * 0.55);
        const a = Math.random() * TAU;
        c.x = cx + Math.cos(a) * r;
        c.y = cy + Math.sin(a) * r * 0.8;
        c.angle = Math.atan2(c.y - cy, c.x - cx);
    };
    const contacts: Contact[] = Array.from({ length: CFG.contacts }, (_, i) => {
        const c: Contact = { x: 0, y: 0, angle: 0, age: Infinity, prevDelta: TAU, };
        place(c);
        // Some already lit, so a still frame (reduced motion) shows finds.
        if (i % 3 === 0) c.age = Math.random() * CFG.contactLife * 0.6;
        return c;
    });

    const canConic = typeof ctx.createConicGradient === 'function';
    let clock = CFG.period * 0.62;

    return dt => {
        clock += dt;
        const beam = ((clock / CFG.period) * TAU) % TAU;
        ctx.clearRect(0, 0, w, h);

        // Range rings and a faint crosshair: the instrument, not the data.
        ctx.lineWidth = 1;
        ctx.strokeStyle = `rgba(${CHANNEL.white},0.045)`;
        for (let i = 1; i <= CFG.rings; i++) {
            ctx.beginPath();
            ctx.arc(cx, cy, (reach / CFG.rings) * i * 0.92, 0, TAU);
            ctx.stroke();
        }
        ctx.strokeStyle = `rgba(${CHANNEL.white},0.03)`;
        ctx.beginPath();
        ctx.moveTo(0, cy);
        ctx.lineTo(w, cy);
        ctx.moveTo(cx, 0);
        ctx.lineTo(cx, h);
        ctx.stroke();

        // The wake: a wedge behind the beam, brightest at its leading edge.
        if (canConic) {
            const g = ctx.createConicGradient(beam - CFG.wake, cx, cy);
            const edge = CFG.wake / TAU;
            g.addColorStop(0, `rgba(${CHANNEL.white},0)`);
            g.addColorStop(edge * 0.999, `rgba(${CHANNEL.white},0.075)`);
            g.addColorStop(edge, `rgba(${CHANNEL.white},0)`);
            g.addColorStop(1, `rgba(${CHANNEL.white},0)`);
            ctx.fillStyle = g;
            ctx.beginPath();
            ctx.arc(cx, cy, reach, 0, TAU);
            ctx.fill();
        }

        // The grid, lit in the beam's wake.
        for (const d of dots) {
            const behind = ahead(beam, d.angle);
            const lit = behind < CFG.wake * 2 ? Math.exp((-behind / CFG.wake) * 2.4) : 0;
            const a = (0.06 + lit * 0.5) * (0.3 + d.near * 0.7);
            ctx.fillStyle = `rgba(${CHANNEL.white},${a})`;
            ctx.fillRect(d.x - 0.7, d.y - 0.7, 1.4, 1.4);
        }

        // The beam itself.
        const bx = cx + Math.cos(beam) * reach;
        const by = cy + Math.sin(beam) * reach;
        const line = ctx.createLinearGradient(cx, cy, bx, by);
        line.addColorStop(0, `rgba(${CHANNEL.white},0.35)`);
        line.addColorStop(1, `rgba(${CHANNEL.white},0)`);
        ctx.strokeStyle = line;
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(bx, by);
        ctx.stroke();

        // Contacts: found when the beam crosses them.
        for (const c of contacts) {
            const delta = ahead(beam, c.angle);
            if (delta < c.prevDelta && c.prevDelta - delta > Math.PI) {
                // The beam just passed. A contact that has already faded may
                // move on, so the finds never settle into a fixed pattern.
                if (c.age > CFG.contactLife && Math.random() < 0.5) {
                    place(c);
                    c.prevDelta = ahead(beam, c.angle);
                    continue;
                }
                c.age = 0;
            }
            c.prevDelta = delta;
            c.age += dt;

            if (c.age < CFG.contactLife) {
                const life = 1 - c.age / CFG.contactLife;
                ctx.fillStyle = `rgba(${CHANNEL.positiveLight},${0.85 * life})`;
                ctx.beginPath();
                ctx.arc(c.x, c.y, 2.4, 0, TAU);
                ctx.fill();

                if (c.age < CFG.pingLife) {
                    const t = c.age / CFG.pingLife;
                    ctx.strokeStyle = `rgba(${CHANNEL.positiveLight},${0.5 * (1 - t)})`;
                    ctx.beginPath();
                    ctx.arc(c.x, c.y, 3 + (1 - Math.pow(1 - t, 3)) * 22, 0, TAU);
                    ctx.stroke();
                }
            } else {
                // Unfound: a faint contact the grid alone would not show.
                ctx.fillStyle = `rgba(${CHANNEL.white},0.12)`;
                ctx.fillRect(c.x - 1, c.y - 1, 2, 2);
            }
        }
    };
};

export const RadarSweep: React.FC<{ className?: string }> = ({ className = '' }) => {
    const ref = useCanvasScene(build);
    return <canvas ref={ref} aria-hidden className={`absolute inset-0 pointer-events-none ${className}`} />;
};

export default RadarSweep;
