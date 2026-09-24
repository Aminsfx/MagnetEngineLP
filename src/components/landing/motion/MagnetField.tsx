import React from 'react';
import { CHANNEL, SURFACE } from '../../../lib/theme';
import { useCanvasScene, type SceneBuild } from './useCanvasScene';

/**
 * Variant A's hero field: points swirling into a slow-moving core and being
 * captured — each capture a small green ring.
 *
 * The product's own diagram in the dashboard's colours: scattered prospects
 * (white) drawn in until they land (green, the dashboard's one hue, which
 * there means a good outcome).
 *
 * Points are born in a ring around the core, already turning, rather than at
 * the edges of the screen where the pull is weakest and the mask hides them —
 * so every generation fills the field the way the first one does, and the
 * field reads as a flow that never ends rather than a burst that dies down.
 *
 * The canvas is opaque and never cleared — each frame is washed with the
 * ground colour at low alpha, so every point's own history fades out behind
 * it. The trails cost nothing extra.
 */

const CFG = {
    areaPerParticle: 9_000,
    maxParticles: 170,
    pull: 250_000,
    swirl: 0.95,
    damping: 0.974,
    maxSpeed: 2.4,
    captureRadius: 30,
    fullSpeed: 1.8,
    trailFade: 0.18,
    /** Where points are born, as fractions of the field's longer side from the core. */
    bornMin: 0.14,
    bornMax: 0.62,
    /** Frames a new point takes to fade in, so a birth never pops. */
    fadeIn: 45,
    /** Share of points drawn green — the few that will turn into a reply. */
    greenShare: 0.14,
    /** Milliseconds a capture ring takes to open and fade. */
    ringLife: 1100,
} as const;

function hexToRgb(hex: string): string {
    const n = parseInt(hex.slice(1), 16);
    return `${(n >> 16) & 255},${(n >> 8) & 255},${n & 255}`;
}

const TRAIL = `rgba(${hexToRgb(SURFACE.base)},${CFG.trailFade})`;
const TAU = Math.PI * 2;

interface Particle {
    x: number;
    y: number;
    px: number;
    py: number;
    vx: number;
    vy: number;
    /** Frames since birth; drives the fade-in. */
    age: number;
    green: boolean;
    size: number;
}

interface Ring {
    x: number;
    y: number;
    age: number;
}

/** Born on a ring around the core, moving the way the swirl already turns. */
function spawn(p: Particle, w: number, h: number, cx: number, cy: number): void {
    const reach = Math.max(w, h);
    const r = reach * (CFG.bornMin + Math.random() * (CFG.bornMax - CFG.bornMin));
    const a = Math.random() * TAU;
    p.x = p.px = cx + Math.cos(a) * r;
    // Flattened, because the hero is wider than it is tall.
    p.y = p.py = cy + Math.sin(a) * r * 0.7;
    // Tangent to the swirl, plus a little inward, so it spirals rather than orbits.
    const speed = 0.7 + Math.random() * 1.1;
    p.vx = Math.sin(a) * speed - Math.cos(a) * 0.25;
    p.vy = -Math.cos(a) * speed - Math.sin(a) * 0.25;
    p.age = 0;
    p.green = Math.random() < CFG.greenShare;
    p.size = 0.7 + Math.random() * 1.1;
}

const build: SceneBuild = (ctx, w, h) => {
    ctx.fillStyle = SURFACE.base;
    ctx.fillRect(0, 0, w, h);

    // The core sits under the subhead and drifts, so the field never settles.
    const core = (t: number): [number, number] => [
        w * 0.5 + Math.cos(t * 0.00011) * w * 0.16,
        h * 0.46 + Math.sin(t * 0.00017) * h * 0.08,
    ];

    let clock = 0;
    const [x0, y0] = core(0);
    const count = Math.min(CFG.maxParticles, Math.round((w * h) / CFG.areaPerParticle));
    const particles: Particle[] = Array.from({ length: count }, () => {
        const p: Particle = { x: 0, y: 0, px: 0, py: 0, vx: 0, vy: 0, age: 0, green: false, size: 1 };
        spawn(p, w, h, x0, y0);
        // Already faded in, so the hero opens full rather than empty.
        p.age = CFG.fadeIn;
        return p;
    });
    const rings: Ring[] = [];

    return dt => {
        clock += dt;
        const [cx, cy] = core(clock);
        const k = dt / 16.6667;

        ctx.fillStyle = TRAIL;
        ctx.fillRect(0, 0, w, h);
        ctx.lineCap = 'round';

        for (const p of particles) {
            const dx = cx - p.x;
            const dy = cy - p.y;
            const dist2 = dx * dx + dy * dy;

            // Captured: tested on the true distance. The first version tested
            // the floored one below, which can never be under the floor — so
            // nothing was ever captured, every point piled into a knot at the
            // core within seconds, and the field looked like it had stopped.
            if (dist2 < CFG.captureRadius * CFG.captureRadius) {
                if (p.green && rings.length < 6) rings.push({ x: p.x, y: p.y, age: 0 });
                spawn(p, w, h, cx, cy);
                continue;
            }

            // Floored only for the force, so 1/d² stays finite near the core.
            const d2 = Math.max(dist2, 900);
            const d = Math.sqrt(d2);
            const f = (CFG.pull / d2) * k;

            p.vx += (dx / d) * f + (-dy / d) * f * CFG.swirl;
            p.vy += (dy / d) * f + (dx / d) * f * CFG.swirl;

            const damp = Math.pow(CFG.damping, k);
            p.vx *= damp;
            p.vy *= damp;

            const sp = Math.hypot(p.vx, p.vy);
            if (sp > CFG.maxSpeed) {
                p.vx = (p.vx / sp) * CFG.maxSpeed;
                p.vy = (p.vy / sp) * CFG.maxSpeed;
            }

            p.px = p.x;
            p.py = p.y;
            p.x += p.vx * k;
            p.y += p.vy * k;
            p.age += k;

            if (p.x < -40 || p.x > w + 40 || p.y < -40 || p.y > h + 40) {
                spawn(p, w, h, cx, cy);
                continue;
            }

            // Brightness follows speed, so the core reads as the busy part.
            // Kept under the headline: the scrim and this ceiling both see to it.
            const heat = Math.min(sp / CFG.fullSpeed, 1);
            const born = Math.min(p.age / CFG.fadeIn, 1);
            const a = (0.08 + heat * 0.42) * born;
            ctx.strokeStyle = p.green
                ? `rgba(${CHANNEL.positiveLight},${a})`
                : `rgba(${CHANNEL.white},${a * 0.8})`;
            ctx.lineWidth = p.size;
            ctx.beginPath();
            ctx.moveTo(p.px, p.py);
            ctx.lineTo(p.x, p.y);
            ctx.stroke();
        }

        // Captures: a green ring opening where a point landed.
        for (let i = rings.length - 1; i >= 0; i--) {
            const r = rings[i];
            r.age += dt;
            const t = r.age / CFG.ringLife;
            if (t >= 1) {
                rings.splice(i, 1);
                continue;
            }
            const ease = 1 - Math.pow(1 - t, 3);
            ctx.strokeStyle = `rgba(${CHANNEL.positiveLight},${0.45 * (1 - t)})`;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.arc(r.x, r.y, 4 + ease * 26, 0, TAU);
            ctx.stroke();
        }

        // Painted every frame onto a canvas that is only ever washed, so it
        // settles at roughly alpha / (alpha + trailFade) — keep it faint.
        const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, 140);
        glow.addColorStop(0, `rgba(${CHANNEL.white},0.018)`);
        glow.addColorStop(0.5, `rgba(${CHANNEL.positive},0.012)`);
        glow.addColorStop(1, `rgba(${CHANNEL.positive},0)`);
        ctx.fillStyle = glow;
        ctx.fillRect(cx - 140, cy - 140, 280, 280);
    };
};

export const MagnetField: React.FC<{ className?: string }> = ({ className = '' }) => {
    // Enough still frames under reduced motion that the streaks have length.
    const ref = useCanvasScene(build, { opaque: true, stillFrames: 90 });
    return <canvas ref={ref} aria-hidden className={`absolute inset-0 pointer-events-none ${className}`} />;
};

export default MagnetField;
