import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

/**
 * A panel that slides in from the right edge — the reference's mobile menu,
 * without the Radix dependency it was written against.
 *
 * Portalled to <body> on purpose: the header it opens from gains a
 * `backdrop-filter` once the page scrolls, and a filtered ancestor becomes the
 * containing block for `position: fixed`, which would pin this panel inside
 * an 80px-tall header instead of the viewport.
 *
 * It behaves as a dialog: Escape and the scrim close it, focus moves into it
 * on open and returns to the trigger on close, and the page behind it does
 * not scroll.
 */
export const Sheet: React.FC<{
    open: boolean;
    onClose: () => void;
    label: string;
    children: React.ReactNode;
}> = ({ open, onClose, label, children }) => {
    const panelRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!open) return;
        const returnTo = document.activeElement as HTMLElement | null;
        const { overflow } = document.body.style;
        document.body.style.overflow = 'hidden';

        const first = panelRef.current?.querySelector<HTMLElement>('a, button');
        first?.focus();

        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        document.addEventListener('keydown', onKey);

        return () => {
            document.removeEventListener('keydown', onKey);
            document.body.style.overflow = overflow;
            returnTo?.focus?.();
        };
    }, [open, onClose]);

    return createPortal(
        <div className={`fixed inset-0 z-[60] ${open ? '' : 'pointer-events-none'}`} aria-hidden={!open}>
            <div
                onClick={onClose}
                className={`absolute inset-0 bg-surface/70 transition-opacity duration-300 ${
                    open ? 'opacity-100' : 'opacity-0'
                }`}
            />
            <div
                ref={panelRef}
                role="dialog"
                aria-modal="true"
                aria-label={label}
                inert={!open}
                className={`absolute inset-y-0 right-0 w-full sm:w-96 bg-surface border-l border-white/8 flex flex-col transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] ${
                    open ? 'translate-x-0' : 'translate-x-full'
                }`}
            >
                {children}
            </div>
        </div>,
        document.body,
    );
};

export default Sheet;
