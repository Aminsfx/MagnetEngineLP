import React, { useEffect, useRef } from 'react';
import { BRAND, SURFACE } from '../lib/theme';

/**
 * The hero's moving background: a field of drifting points pulled into an
 * attractor, leaving streaks behind them.
 *
 * It is the product's own diagram. Scattered prospects get drawn in, swing
 * once around the core, and are captured — which is what the page below it
 * spends 700 lines claiming in words. An abstract "particles + lines" backdrop
 * would have cost the same frame budget and said nothing.
 *
 * Canvas rather than DOM or SVG because ~100 elements move every frame, and
 * because the trails come free: the frame is not cleared but painted over with
 * the surface colour at low alpha, so each point's own history fades out
 * underneath it. There is no per-particle trail buffer.
 *
 * Costs are bounded deliberately, since this runs on a marketing page that a
 * visitor may leave open:
 *  - `prefers-reduced-motion` renders ONE frame and never schedules another.
 *  - An IntersectionObserver stops the loop when the hero scrolls away, so the
 *    rest of the page scrolls with no animation running at all.
 *  - `visibilitychange` stops it in a background tab, where rAF would otherwise
 *    keep firing at a reduced rate on some browsers.
 *  - Particle count comes from the area, so a phone runs a third of a desktop's.
 *  - Device pixel ratio is capped at 2: past that the blur hides the detail and
 *    only the fill cost survives.
 *
 * Restarting after a pause uses a clamped delta, otherwise the first frame back
 * integrates a multi-second step and flings every particle off-screen.
 */

/** Tuning. Named because these numbers are the whole design. */
const CFG = {
    /** One particle per this many CSS pixels of hero area. */
    areaPerParticle: 13_000,
    maxParticles: 120,
    /**
     * Attraction strength; the force falls off with distance squared.
     * Tuned down hard from a first pass: at 1.15e6 the points crossed the hero
     * in a few frames and the trails read as straight laser lines across the
     * headline. This is a backdrop, so it has to stay slower than the eye.
     */
    pull: 240_000,
    /** Sideways push, so points orbit the core instead of falling straight in. */
    swirl: 0.95,
    /** Velocity retained per 16ms — keeps the field from accelerating forever. */
    damping: 0.974,
    /** Hard speed ceiling. Without it one close pass flings a point off-screen
     *  in a single frame, and a frame-long segment is a line, not a streak. */
    maxSpeed: 2.4,
    /** Below this distance a particle counts as captured and respawns. */
    captureRadius: 30,
    /** Speed that maps to full brightness. */
    fullSpeed: 1.8,
    /** How fast the previous frame fades. Lower = longer streaks. */
    trailFade: 0.2,
    /** Fraction of particles drawn white rather than brand orange. */
    whiteShare: 0.28,
} as const;

/** `'#f97316'` -> `'249,115,22'`, so a token can carry an alpha. */
function hexToRgb(hex: string): string {
    const n = parseInt(hex.slice(1), 16);
    return `${(n >> 16) & 255},${(n >> 8) & 255},${n & 255}`;
}

// Parsed once. These are read ~120 times per frame, and `rgba()` strings are
// the only way to give a token an alpha in a canvas context.
const RGB = {
    brand: hexToRgb(BRAND[500]),
    brandLight: hexToRgb(BRAND[400]),
} as const;

/** The wash painted over each frame — this is what turns motion into streaks. */
const TRAIL = `rgba(${hexToRgb(SURFACE.base)},${CFG.trailFade})`;

interface Particle {
    x: number;
    y: number;
    px: number;
    py: number;
    vx: number;
    vy: number;
    /** Drawn white instead of orange — a minority, so the field reads warm. */
    white: boolean;
    size: number;
}

/** Spawn on a random edge, aimed roughly inward with an off-centre bias. */
function spawn(p: Particle, w: number, h: number): void {
    const edge = Math.random();
    if (edge < 0.4) {
        p.x = Math.random() * w;
        p.y = h + 12;
    } else if (edge < 0.7) {
        p.x = Math.random() < 0.5 ? -12 : w + 12;
        p.y = Math.random() * h;
    } else {
        p.x = Math.random() * w;
        p.y = -12;
    }
    p.px = p.x;
    p.py = p.y;
    // A little inward drift, plus sideways so nothing arrives on a straight line.
    p.vx = (Math.random() - 0.5) * 0.9;
    p.vy = (Math.random() - 0.5) * 0.9;
    p.white = Math.random() < CFG.whiteShare;
    p.size = 0.7 + Math.random() * 1.1;
}

export const MagneticField: React.FC<{ className?: string }> = ({ className }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        const parent = canvas?.parentElement;
        if (!canvas || !parent) return;
        const ctx = canvas.getContext('2d', { alpha: false });
        if (!ctx) return;

        const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;

        let w = 0;
        let h = 0;
        let particles: Particle[] = [];
        let frame = 0;
        let last = 0;
        let clock = 0;
        let onScreen = true;

        const resize = (): void => {
            const rect = parent.getBoundingClientRect();
            w = Math.max(1, Math.round(rect.width));
            h = Math.max(1, Math.round(rect.height));
            const dpr = Math.min(window.devicePixelRatio || 1, 2);
            canvas.width = Math.round(w * dpr);
            canvas.height = Math.round(h * dpr);
            canvas.style.width = `${w}px`;
            canvas.style.height = `${h}px`;
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

            // Repaint the ground; the trail fade assumes an opaque canvas.
            ctx.fillStyle = SURFACE.base;
            ctx.fillRect(0, 0, w, h);

            const want = Math.min(CFG.maxParticles, Math.round((w * h) / CFG.areaPerParticle));
            particles = Array.from({ length: want }, () => {
                const p: Particle = { x: 0, y: 0, px: 0, py: 0, vx: 0, vy: 0, white: false, size: 1 };
                spawn(p, w, h);
                // Scatter the first generation across the field rather than the
                // edges, so the hero does not open on an empty frame.
                p.x = Math.random() * w;
                p.y = Math.random() * h;
                p.px = p.x;
                p.py = p.y;
                return p;
            });
        };

        /** The core drifts, so the field never settles into a fixed pattern. */
        const attractor = (t: number): [number, number] => [
            w * 0.5 + Math.cos(t * 0.00011) * w * 0.14,
            h * 0.6 + Math.sin(t * 0.00017) * h * 0.1,
        ];

        const step = (dt: number): void => {
            clock += dt;
            const [cx, cy] = attractor(clock);
            // Normalised to a 60fps frame, so behaviour is refresh-rate independent.
            const k = dt / 16.6667;

            ctx.fillStyle = TRAIL;
            ctx.fillRect(0, 0, w, h);

            ctx.lineCap = 'round';

            for (const p of particles) {
                const dx = cx - p.x;
                const dy = cy - p.y;
                // Floor the distance: an un-clamped 1/d² is infinite at the core.
                const d2 = Math.max(dx * dx + dy * dy, 900);
                const d = Math.sqrt(d2);
                const f = (CFG.pull / d2) * k;

                p.vx += (dx / d) * f;
                p.vy += (dy / d) * f;
                // Perpendicular component — this is what makes an orbit.
                p.vx += (-dy / d) * f * CFG.swirl;
                p.vy += (dx / d) * f * CFG.swirl;

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

                if (d < CFG.captureRadius || p.x < -40 || p.x > w + 40 || p.y < -40 || p.y > h + 40) {
                    spawn(p, w, h);
                    continue;
                }

                const heat = Math.min(Math.hypot(p.vx, p.vy) / CFG.fullSpeed, 1);
                // Brightness tracks speed, so the core reads as the energetic part.
                // Kept low: the headline sits on top of this and has to win.
                const a = 0.05 + heat * 0.3;
                ctx.strokeStyle = p.white
                    ? `rgba(255,255,255,${a * 0.6})`
                    : `rgba(${RGB.brand},${a})`;
                ctx.lineWidth = p.size;
                ctx.beginPath();
                ctx.moveTo(p.px, p.py);
                ctx.lineTo(p.x, p.y);
                ctx.stroke();
            }

            // The core itself: a soft bloom where everything converges.
            const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, 120);
            glow.addColorStop(0, `rgba(${RGB.brandLight},0.1)`);
            glow.addColorStop(1, 'rgba(0,0,0,0)');
            ctx.fillStyle = glow;
            ctx.fillRect(cx - 120, cy - 120, 240, 240);
        };

        const loop = (now: number): void => {
            // Clamp: a tab restored after a minute must not integrate a minute.
            const dt = Math.min(now - last, 48) || 16.6667;
            last = now;
            step(dt);
            frame = requestAnimationFrame(loop);
        };

        const start = (): void => {
            if (frame || reduced || !onScreen || document.hidden) return;
            last = performance.now();
            frame = requestAnimationFrame(loop);
        };
        const stop = (): void => {
            if (!frame) return;
            cancelAnimationFrame(frame);
            frame = 0;
        };

        resize();

        const ro = new ResizeObserver(() => {
            resize();
            // A resize discards the canvas contents, so a still frame has to be
            // redrawn by hand; the running loop repaints on its own.
            if (reduced) step(16.6667);
        });
        ro.observe(parent);

        if (reduced) {
            // One frame, so the hero still has texture without any motion.
            step(16.6667);
            return () => ro.disconnect();
        }

        const io = new IntersectionObserver(
            ([entry]) => {
                onScreen = entry.isIntersecting;
                if (onScreen) start();
                else stop();
            },
            { threshold: 0 },
        );
        io.observe(parent);

        const onVisibility = (): void => (document.hidden ? stop() : start());
        document.addEventListener('visibilitychange', onVisibility);

        start();

        return () => {
            stop();
            ro.disconnect();
            io.disconnect();
            document.removeEventListener('visibilitychange', onVisibility);
        };
    }, []);

    return (
        <canvas
            ref={canvasRef}
            aria-hidden
            className={className ?? 'absolute inset-0 w-full h-full pointer-events-none'}
        />
    );
};

export default MagneticField;
