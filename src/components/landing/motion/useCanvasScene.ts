import { useEffect, useRef, type RefObject } from 'react';

/**
 * The lifecycle every hero canvas needs, so each scene only has to say what
 * it draws.
 *
 * `build(ctx, w, h)` is called on mount and on every resize (a resize discards
 * the canvas, so the scene rebuilds its layout for the new size) and returns a
 * `step(dt)` that paints one frame, `dt` in milliseconds.
 *
 * The loop runs for as long as the canvas is mounted. It is never stopped and
 * restarted, because a restart has to be triggered, and the trigger this used
 * to wait on — `visibilitychange` — cannot be trusted: Chrome on Windows
 * reported a page hidden while it was on screen (an occluded window, a tab
 * loaded in the background), the loop declined to start, and the hero sat
 * frozen with nothing left to wake it. A loop that is always scheduled has no
 * state to get stuck in.
 *
 * Costs stay bounded without that gate, because this runs behind a marketing
 * page a visitor may leave open:
 *  - the browser already stops requestAnimationFrame in a background tab;
 *  - while the canvas is scrolled out of view a frame is one boolean check
 *    and no drawing;
 *  - reduced motion paints `stillFrames` steps once and schedules nothing;
 *  - device pixel ratio is capped at 2;
 *  - `dt` is clamped, so the first frame after a pause does not integrate the
 *    whole pause and fling everything off screen.
 */
export type SceneStep = (dt: number) => void;
export type SceneBuild = (ctx: CanvasRenderingContext2D, w: number, h: number) => SceneStep;

export function useCanvasScene(
    build: SceneBuild,
    { opaque = false, stillFrames = 1 }: { opaque?: boolean; stillFrames?: number } = {},
): RefObject<HTMLCanvasElement | null> {
    const ref = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const canvas = ref.current;
        const parent = canvas?.parentElement;
        if (!canvas || !parent) return;
        const ctx = canvas.getContext('2d', { alpha: !opaque });
        if (!ctx) return;

        const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
        let step: SceneStep = () => {};

        const still = () => {
            for (let i = 0; i < stillFrames; i++) step(16.6667);
        };

        const resize = () => {
            const rect = parent.getBoundingClientRect();
            const w = Math.max(1, Math.round(rect.width));
            const h = Math.max(1, Math.round(rect.height));
            const dpr = Math.min(window.devicePixelRatio || 1, 2);
            canvas.width = Math.round(w * dpr);
            canvas.height = Math.round(h * dpr);
            canvas.style.width = `${w}px`;
            canvas.style.height = `${h}px`;
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
            step = build(ctx, w, h);
        };

        resize();
        const ro = new ResizeObserver(() => {
            resize();
            if (reduced) still();
        });
        ro.observe(parent);

        if (reduced) {
            still();
            return () => ro.disconnect();
        }

        // Out of view, a frame skips the drawing. Starts true, so the first
        // frames draw even before the observer's first report arrives.
        let inView = true;
        const io = new IntersectionObserver(([entry]) => {
            inView = entry.isIntersecting;
        });
        io.observe(parent);

        let last = performance.now();
        let frame = 0;
        const loop = (now: number) => {
            // Scheduled first, so a throw inside a scene cannot end the loop.
            frame = requestAnimationFrame(loop);
            const dt = Math.min(Math.max(now - last, 0), 48) || 16.6667;
            last = now;
            if (inView) step(dt);
        };
        frame = requestAnimationFrame(loop);

        return () => {
            cancelAnimationFrame(frame);
            ro.disconnect();
            io.disconnect();
        };
        // `build` is a module-level function per scene; it never changes.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return ref;
}
