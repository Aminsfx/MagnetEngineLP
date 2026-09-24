import React from 'react';
import { usePauseOffscreen } from './usePauseOffscreen';
import './marquee.css';

/**
 * An endless horizontal strip, ported from the reference's shadcnspace
 * marquee. The content is repeated `repeat` times and every copy slides by
 * its own width plus the gap, so the seam never shows.
 *
 * The reference injected its keyframes through a `<style>` tag on every
 * render; here they live once in marquee.css. It also pauses off screen and
 * stands still under reduced motion, which the reference did not.
 */
export const Marquee: React.FC<{
    children: React.ReactNode;
    /** Seconds per loop. */
    duration?: number;
    reverse?: boolean;
    pauseOnHover?: boolean;
    repeat?: number;
    className?: string;
}> = ({ children, duration = 40, reverse = false, pauseOnHover = false, repeat = 4, className = '' }) => {
    const ref = usePauseOffscreen<HTMLDivElement>();

    return (
        <div
            ref={ref}
            className={`marquee ${pauseOnHover ? 'marquee-pause' : ''} ${reverse ? 'marquee-reverse' : ''} ${className}`}
            style={{ '--duration': `${duration}s` } as React.CSSProperties}
        >
            {Array.from({ length: repeat }, (_, i) => (
                <div key={i} className="marquee-track" aria-hidden={i > 0 || undefined}>
                    {children}
                </div>
            ))}
        </div>
    );
};

export default Marquee;
