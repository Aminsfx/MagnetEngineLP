import { useState } from 'react';
import { Link } from 'react-router-dom';
import { analyticsEnabled, consent, setConsent } from '../../lib/analytics';

/**
 * Asks once whether product analytics (Mixpanel) may run. Nothing is sent
 * until "Accept"; "Decline" is one click, same size, same place — refusing
 * must be as easy as agreeing. Bottom-left, so it never sits on a toast.
 */
export default function ConsentBanner() {
    const [open, setOpen] = useState(() => analyticsEnabled() && consent() === 'unset');
    if (!open) return null;

    const choose = (choice: 'granted' | 'denied') => {
        setConsent(choice);
        setOpen(false);
    };

    return (
        <div
            role="dialog"
            aria-label="Analytics consent"
            className="fixed bottom-4 left-4 right-4 sm:right-auto sm:max-w-sm z-[90] rounded-2xl border border-white/10 bg-surface-overlay shadow-2xl p-4"
        >
            <p className="text-sm text-neutral-300 leading-snug">
                We use analytics to see which pages and features help. Nothing is collected until you accept.{' '}
                <Link to="/privacy" className="text-white underline underline-offset-2 hover:text-neutral-200">
                    Privacy policy
                </Link>
            </p>
            <div className="mt-3 flex gap-2">
                <button
                    type="button"
                    onClick={() => choose('denied')}
                    className="flex-1 px-3 py-2 rounded-lg text-sm font-semibold text-white bg-white/10 hover:bg-white/20 transition-colors"
                >
                    Decline
                </button>
                <button
                    type="button"
                    onClick={() => choose('granted')}
                    className="flex-1 px-3 py-2 rounded-lg text-sm font-semibold text-surface bg-white hover:bg-neutral-200 transition-colors"
                >
                    Accept
                </button>
            </div>
        </div>
    );
}
