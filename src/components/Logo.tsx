import React from 'react';
import { Magnet } from 'lucide-react';
import { Link } from 'react-router-dom';

interface LogoProps {
    /** Size variant — 'sm' for auth/legal pages, 'md' for nav/sidebar (default) */
    size?: 'sm' | 'md';
    /** If provided, wraps the logo in a Link */
    linkTo?: string;
    /** Show subtitle (e.g. in sidebar) */
    subtitle?: string;
}

export const Logo: React.FC<LogoProps> = ({ size = 'md', linkTo, subtitle }) => {
    const iconSize = size === 'sm' ? 'w-8 h-8' : 'w-10 h-10';
    const iconInner = size === 'sm' ? 18 : 22;
    const textSize = size === 'sm' ? 'text-base' : 'text-lg';

    const inner = (
        <div className="flex items-center gap-2.5">
            <div className={`${iconSize} rounded-full flex items-center justify-center bg-white shadow-[0_0_15px_-3px_rgba(255,255,255,0.2)] shrink-0`}>
                <Magnet size={iconInner} strokeWidth={2.5} className="text-[#030604] rotate-90" />
            </div>
            <div>
                <span className={`${textSize} font-bold text-white tracking-tight leading-none block`}>
                    MagnetEngine
                </span>
                {subtitle && (
                    <span className="text-xs text-zinc-500 leading-none mt-0.5 block">{subtitle}</span>
                )}
            </div>
        </div>
    );

    if (linkTo) {
        return (
            <Link to={linkTo} className="inline-flex">
                {inner}
            </Link>
        );
    }

    return inner;
};

export default Logo;
