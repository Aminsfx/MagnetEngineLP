import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Magnet, Menu, X } from 'lucide-react';
import { PillButton } from '../ui/PillButton';
import { Sheet } from '../ui/Sheet';

/**
 * The public header, from the shadcnspace hero-01 reference: transparent over
 * the hero, then condensed into a floating pill once the page moves. The
 * section links sit in their own recessed pill and the one you are reading is
 * lifted out of it — scroll-spied, where the reference hard-coded "Home".
 *
 * Below `lg` the links move into a right-hand sheet.
 */

export interface NavItem {
    href: `#${string}`;
    label: string;
}

/**
 * The wordmark. It links to the page it sits on (`to`), not always to `/`:
 * on an A/B variant, a logo that jumped to the other page would mix the two
 * audiences the test is trying to keep apart.
 */
export const Logo: React.FC<{ className?: string; to?: string }> = ({ className = '', to = '/' }) => (
    <Link to={to} className={`flex items-center gap-2.5 flex-none ${className}`} aria-label="MagnetEngine home">
        <span className="w-8 h-8 rounded-full bg-white flex items-center justify-center">
            <Magnet size={16} strokeWidth={2.4} className="text-surface rotate-90" aria-hidden />
        </span>
        <span className="text-white font-semibold tracking-[-0.02em] text-[15px]">MagnetEngine</span>
    </Link>
);

/** The id of the section the reader is in, or null above the first one. */
function useActiveSection(ids: string[]): string | null {
    const [active, setActive] = useState<string | null>(null);

    useEffect(() => {
        const els = ids.map(id => document.getElementById(id)).filter((el): el is HTMLElement => !!el);
        if (!els.length || !('IntersectionObserver' in window)) return;

        // A section is "current" while it crosses a thin band 40% down the
        // viewport — one section at a time, whatever their heights.
        const io = new IntersectionObserver(
            entries => {
                for (const e of entries) if (e.isIntersecting) setActive(e.target.id);
            },
            { rootMargin: '-40% 0px -59% 0px' },
        );
        els.forEach(el => io.observe(el));

        // Back above the first section: nothing is current.
        const first = els[0];
        const onScroll = () => {
            if (first.getBoundingClientRect().top > window.innerHeight * 0.4) setActive(null);
        };
        window.addEventListener('scroll', onScroll, { passive: true });

        return () => {
            io.disconnect();
            window.removeEventListener('scroll', onScroll);
        };
    }, [ids]);

    return active;
}

export const Header: React.FC<{ nav: NavItem[]; cta: string; home?: string }> = ({ nav, cta, home = '/' }) => {
    const [condensed, setCondensed] = useState(false);
    const [open, setOpen] = useState(false);
    const [ids] = useState(() => nav.map(n => n.href.slice(1)));
    const active = useActiveSection(ids);
    const close = useCallback(() => setOpen(false), []);

    useEffect(() => {
        const onScroll = () => setCondensed(window.scrollY >= 50);
        const onResize = () => {
            if (window.innerWidth >= 1024) setOpen(false);
        };
        onScroll();
        window.addEventListener('scroll', onScroll, { passive: true });
        window.addEventListener('resize', onResize);
        return () => {
            window.removeEventListener('scroll', onScroll);
            window.removeEventListener('resize', onResize);
        };
    }, []);

    return (
        <header className="landing-rise fixed inset-x-0 top-0 z-50 h-20 px-4 flex items-center justify-center">
            <div
                className={`w-full max-w-6xl flex items-center justify-between gap-4 lg:gap-6 rounded-full border transition-[padding,background-color,border-color,box-shadow] duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] ${
                    condensed
                        ? 'p-2.5 ps-4 bg-surface/70 backdrop-blur-lg border-white/8 shadow-[0_18px_40px_-18px_rgba(0,0,0,0.9)]'
                        : 'px-2 bg-transparent border-transparent'
                }`}
            >
                <Logo to={home} />

                <nav aria-label="Sections" className="max-lg:hidden">
                    <ul className="flex items-center p-1 rounded-full bg-white/[0.04] border border-white/6">
                        {nav.map(item => {
                            const current = active === item.href.slice(1);
                            return (
                                <li key={item.href}>
                                    <a
                                        href={item.href}
                                        aria-current={current ? 'true' : undefined}
                                        className={`block px-4 py-2 rounded-full text-meta font-medium transition-colors duration-300 ${
                                            current
                                                ? 'bg-surface text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.1)]'
                                                : 'text-neutral-400 hover:text-white hover:bg-surface/60'
                                        }`}
                                    >
                                        {item.label}
                                    </a>
                                </li>
                            );
                        })}
                    </ul>
                </nav>

                <div className="flex items-center gap-2">
                    <Link
                        to="/login"
                        className="max-sm:hidden px-3 py-2 text-meta font-medium text-neutral-400 hover:text-white transition-colors duration-300"
                    >
                        Sign in
                    </Link>
                    <PillButton to="/login?mode=signup" size="md" className="max-lg:hidden">
                        {cta}
                    </PillButton>
                    <button
                        type="button"
                        onClick={() => setOpen(true)}
                        aria-expanded={open}
                        aria-label="Open menu"
                        className="lg:hidden w-10 h-10 rounded-full border border-white/12 text-white flex items-center justify-center hover:border-white/30 transition-colors"
                    >
                        <Menu size={18} aria-hidden />
                    </button>
                </div>
            </div>

            <Sheet open={open} onClose={close} label="Menu">
                <div className="flex items-center justify-between p-6">
                    <Logo to={home} />
                    <button
                        type="button"
                        onClick={close}
                        aria-label="Close menu"
                        className="w-10 h-10 rounded-full border border-white/12 text-white flex items-center justify-center hover:border-white/30 transition-colors"
                    >
                        <X size={16} aria-hidden />
                    </button>
                </div>

                <nav aria-label="Sections" className="flex-1 flex flex-col gap-10 px-6 pb-8 overflow-y-auto">
                    <ul className="flex flex-col gap-4 pt-4">
                        {nav.map(item => {
                            const current = active === item.href.slice(1);
                            return (
                                <li key={item.href}>
                                    <a
                                        href={item.href}
                                        onClick={close}
                                        className={`group/nav flex items-center text-[1.75rem] font-semibold tracking-[-0.03em] transition-[color,transform] duration-300 ${
                                            current ? 'text-white' : 'text-neutral-400 hover:text-white hover:translate-x-2'
                                        }`}
                                    >
                                        <span
                                            aria-hidden
                                            className={`h-0.5 bg-white transition-all duration-300 ${
                                                current
                                                    ? 'w-4 mr-3'
                                                    : 'w-0 mr-0 group-hover/nav:w-4 group-hover/nav:mr-3'
                                            }`}
                                        />
                                        {item.label}
                                    </a>
                                </li>
                            );
                        })}
                    </ul>

                    <div className="flex flex-col gap-4">
                        <PillButton to="/login?mode=signup">{cta}</PillButton>
                        <Link to="/login" className="text-body-sm text-neutral-400 hover:text-white w-fit">
                            Already a member? Sign in
                        </Link>
                    </div>

                    <p className="mt-auto text-meta text-neutral-500">© {new Date().getFullYear()} MagnetEngine</p>
                </nav>
            </Sheet>
        </header>
    );
};

export default Header;
