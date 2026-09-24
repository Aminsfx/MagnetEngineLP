import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight } from 'lucide-react';

/**
 * The public pages' primary action, ported from the shadcnspace hero-01
 * reference: a white pill whose arrow disc slides from the right edge to the
 * left on hover and turns to point the way it is going. Keyboard focus runs
 * the same motion, so the affordance is not a mouse-only reward.
 *
 * The disc's travel is expressed against the button's own width
 * (`right: calc(100% - disc - inset)`), so it works at any label length and at
 * `block` width without measuring anything.
 */

type Size = 'md' | 'lg';

const SIZES: Record<Size, { button: string; disc: string; icon: number }> = {
    md: {
        button: 'h-10 ps-4 pe-12 hover:ps-12 hover:pe-4 focus-visible:ps-12 focus-visible:pe-4 text-meta',
        disc: 'w-8 h-8 group-hover:right-[calc(100%-36px)] group-focus-visible:right-[calc(100%-36px)]',
        icon: 15,
    },
    lg: {
        button: 'h-12 ps-6 pe-14 hover:ps-14 hover:pe-6 focus-visible:ps-14 focus-visible:pe-6 text-body-sm',
        disc: 'w-10 h-10 group-hover:right-[calc(100%-44px)] group-focus-visible:right-[calc(100%-44px)]',
        icon: 17,
    },
};

export const PillButton: React.FC<{
    to: string;
    children: React.ReactNode;
    size?: Size;
    block?: boolean;
    className?: string;
}> = ({ to, children, size = 'lg', block = false, className = '' }) => {
    const s = SIZES[size];
    return (
        <Link
            to={to}
            className={`group relative inline-flex items-center overflow-hidden rounded-full whitespace-nowrap bg-white text-surface font-semibold shadow-[0_10px_30px_-12px_rgba(255,255,255,0.35)] transition-[padding,background-color,transform] duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] hover:bg-neutral-100 active:scale-[0.98] focus-visible:outline-offset-4 ${
                block ? 'flex w-full justify-center' : 'w-fit'
            } ${s.button} ${className}`}
        >
            <span className="relative z-10">{children}</span>
            <span
                aria-hidden
                className={`absolute right-1 top-1/2 -translate-y-1/2 rounded-full bg-surface text-white flex items-center justify-center transition-[right,transform] duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:rotate-45 group-focus-visible:rotate-45 ${s.disc}`}
            >
                <ArrowUpRight size={s.icon} strokeWidth={2.2} />
            </span>
        </Link>
    );
};

/** The quiet partner to `PillButton`: a hairline pill, for the second action. */
export const GhostPill: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement> & { size?: Size }> = ({
    size = 'lg',
    className = '',
    children,
    ...rest
}) => (
    <button
        type="button"
        {...rest}
        className={`inline-flex items-center justify-center rounded-full whitespace-nowrap border border-white/12 text-neutral-200 font-medium hover:text-white hover:border-white/30 hover:bg-white/[0.04] transition-[background-color,border-color,color,transform] duration-300 active:scale-[0.98] ${
            size === 'lg' ? 'h-12 px-6 text-body-sm' : 'h-10 px-4 text-meta'
        } ${className}`}
    >
        {children}
    </button>
);

export default PillButton;
