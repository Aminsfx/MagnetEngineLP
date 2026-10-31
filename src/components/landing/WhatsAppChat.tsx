import React, { useEffect, useRef, useState } from 'react';
import { WHATSAPP_GREETING, WHATSAPP_NUMBER } from './content';

/**
 * The chat bubble: a link to the owner's WhatsApp, pinned to the bottom-right
 * corner like a chat widget, in the page's black and white rather than
 * WhatsApp's green. On a phone it is the bubble alone; from `md` up the
 * question it answers sits beside it.
 *
 * It steps aside while one of the page's actions (a trial link or a call
 * button) passes underneath, so it never sits on the button the page is
 * asking the reader to press. A full-width button on a phone reaches the
 * corner it lives in.
 */

const HREF = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(WHATSAPP_GREETING)}`;

/** The page's actions: every trial link and call button in the body. */
const ACTIONS = 'main a[href^="/login"], main [data-cal-link]';

const overlaps = (a: DOMRect, b: DOMRect) =>
    a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;

/** WhatsApp's mark, drawn from the speech bubble and handset the icon set already has. */
const Glyph: React.FC = () => (
    <svg viewBox="0 0 24 24" width={24} height={24} aria-hidden fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
        <path d="M2.992 16.342a2 2 0 0 1 .094 1.167l-1.065 3.29a1 1 0 0 0 1.236 1.168l3.413-.998a2 2 0 0 1 1.099.092 10 10 0 1 0-4.777-4.719" />
        <path
            transform="translate(12 12) scale(0.46) translate(-12 -12)"
            fill="currentColor"
            stroke="none"
            d="M13.832 16.568a1 1 0 0 0 1.213-.303l.355-.465A2 2 0 0 1 17 15h3a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2A18 18 0 0 1 2 4a2 2 0 0 1 2-2h3a2 2 0 0 1 2 2v3a2 2 0 0 1-.8 1.6l-.468.351a1 1 0 0 0-.292 1.233 14 14 0 0 0 6.392 6.384"
        />
    </svg>
);

export const WhatsAppChat: React.FC = () => {
    // The fixed spot is measured, not the link: the link moves as it steps aside.
    const spot = useRef<HTMLDivElement>(null);
    const [aside, setAside] = useState(false);

    useEffect(() => {
        let frame = 0;
        const check = () => {
            frame = 0;
            const here = spot.current?.getBoundingClientRect();
            if (!here) return;
            setAside(Array.from(document.querySelectorAll(ACTIONS), el => el.getBoundingClientRect()).some(r => overlaps(r, here)));
        };
        const schedule = () => {
            if (!frame) frame = requestAnimationFrame(check);
        };
        check();
        window.addEventListener('scroll', schedule, { passive: true });
        window.addEventListener('resize', schedule);
        return () => {
            cancelAnimationFrame(frame);
            window.removeEventListener('scroll', schedule);
            window.removeEventListener('resize', schedule);
        };
    }, []);

    return (
        <div
            ref={spot}
            className="landing-in fixed z-40 bottom-4 right-4 md:bottom-6 md:right-6"
            style={{ '--d': '900ms' } as React.CSSProperties}
        >
            <a
                href={HREF}
                target="_blank"
                rel="noopener noreferrer"
                className={`group flex items-center gap-3 rounded-full transition-[opacity,transform,visibility] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
                    aside ? 'invisible opacity-0 translate-y-3' : ''
                }`}
            >
                <span className="max-md:sr-only px-4 py-2.5 rounded-full rounded-br-md border border-white/10 bg-surface-overlay text-meta font-medium text-neutral-200 shadow-2xl shadow-black/60 transition-colors duration-300 group-hover:text-white">
                    Questions? Chat on WhatsApp
                </span>
                <span className="w-12 h-12 md:w-14 md:h-14 flex-none rounded-full border border-white/15 bg-surface-overlay text-white flex items-center justify-center shadow-2xl shadow-black/60 transition-[border-color,transform] duration-300 group-hover:border-white/35 group-hover:-translate-y-0.5">
                    <Glyph />
                </span>
                <span className="sr-only"> (opens in a new tab)</span>
            </a>
        </div>
    );
};

export default WhatsAppChat;
