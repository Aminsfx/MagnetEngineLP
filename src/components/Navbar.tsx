import React, { useEffect, useState } from 'react';
import { Magnet } from 'lucide-react';
import { Link } from 'react-router-dom';

/**
 * Public-page navigation.
 *
 * The bar starts transparent over the hero and acquires its hairline and blur
 * once the page has moved — the standard the quality bar is set against
 * (Linear, Framer) treats the nav as part of the first viewport rather than a
 * strip bolted above it. One accent only: the trial CTA. Everything else is
 * neutral, because a nav with two competing actions has none.
 */
const LINKS = [
    { href: '#how', label: 'How it works' },
    { href: '#proof', label: 'The math' },
    { href: '#pricing', label: 'Pricing' },
    { href: '#faq', label: 'FAQ' },
];

const Navbar: React.FC = () => {
    const [lifted, setLifted] = useState(false);

    useEffect(() => {
        const onScroll = () => setLifted(window.scrollY > 12);
        onScroll();
        window.addEventListener('scroll', onScroll, { passive: true });
        return () => window.removeEventListener('scroll', onScroll);
    }, []);

    return (
        <nav
            className={`fixed top-0 w-full z-50 transition-colors duration-500 ${
                lifted ? 'border-b border-white/8 bg-surface' : 'border-b border-transparent'
            }`}
        >
            <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between gap-8">
                <Link to="/" className="flex items-center gap-2.5 flex-none group">
                    <span className="w-7 h-7 rounded-lg bg-white flex items-center justify-center">
                        <Magnet size={15} strokeWidth={2.4} className="text-surface rotate-90" />
                    </span>
                    <span className="text-white font-semibold tracking-[-0.02em] text-[15px]">
                        MagnetEngine
                    </span>
                </Link>

                <div className="hidden md:flex items-center gap-7 text-meta text-neutral-400">
                    {LINKS.map(({ href, label }) => (
                        <a key={href} href={href} className="hover:text-white transition-colors duration-300">
                            {label}
                        </a>
                    ))}
                </div>

                <div className="flex items-center gap-2 flex-none">
                    <Link
                        to="/login"
                        className="px-3.5 py-2 text-meta font-medium text-neutral-400 hover:text-white transition-colors duration-300"
                    >
                        Sign in
                    </Link>
                    <Link
                        to="/login?mode=signup"
                        className="px-4 py-2 rounded-lg bg-brand-500 hover:bg-brand-400 text-brand-950 text-meta font-semibold transition-colors duration-300"
                    >
                        Start trial
                    </Link>
                </div>
            </div>
        </nav>
    );
};

export default Navbar;
