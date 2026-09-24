import { useEffect, useRef, type RefObject } from 'react';

/**
 * Sets `data-paused` on an element while it is scrolled out of view, so a
 * looping CSS animation under it can stop with
 * `[data-paused] … { animation-play-state: paused }`.
 *
 * A marquee or a background loop is decoration; nothing decorative should keep
 * a visitor's GPU busy on a part of the page they scrolled past.
 *
 * Deliberately not tied to `document.hidden`: Chrome on Windows reported a
 * page hidden while it was on screen, which froze the animation in plain view.
 * A background tab does not paint anyway, so that gate saved nothing.
 */
export function usePauseOffscreen<T extends HTMLElement>(): RefObject<T | null> {
    const ref = useRef<T>(null);

    useEffect(() => {
        const el = ref.current;
        if (!el || !('IntersectionObserver' in window)) return;

        const io = new IntersectionObserver(([entry]) => {
            if (entry.isIntersecting) el.removeAttribute('data-paused');
            else el.setAttribute('data-paused', '');
        });
        io.observe(el);

        return () => io.disconnect();
    }, []);

    return ref;
}
