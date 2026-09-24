import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertCircle, Eye, EyeOff, Loader2, ArrowRight } from 'lucide-react';
import Logo from '../Logo';
import { CHANNEL, alpha } from '../../lib/theme';

/**
 * The frame every signed-out page shares: sign in, sign up, password reset.
 *
 * Split, not a card floating on a grid. The form owns the left half on a flat
 * ground; the right half shows the product — the same approval card the
 * landing page opens with — so the page between "I'm interested" and "I'm in"
 * still looks like the thing being bought. It used to be a frosted-glass box
 * over a grid and an orange haze, which is every SaaS login at once.
 *
 * In the dashboard's palette — white for the one action, grays for chrome —
 * so the page between the landing and the dashboard belongs to both.
 *
 * Below `lg` the aside drops away: on a phone the form is the whole job.
 */
export const AuthShell: React.FC<{ children: React.ReactNode; aside?: React.ReactNode }> = ({ children, aside }) => (
    <div className="min-h-[100dvh] bg-surface selection:bg-white/20 selection:text-white grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
        <div className="flex flex-col px-6 sm:px-10 py-8">
            <Logo size="sm" linkTo="/" />

            <main className="flex-1 flex items-center py-12">
                <div className="w-full max-w-sm mx-auto">
                    {children}
                </div>
            </main>

            <p className="text-label text-neutral-500">
                <Link to="/terms" className="hover:text-white transition-colors">Terms</Link>
                <span aria-hidden className="mx-2">·</span>
                <Link to="/privacy" className="hover:text-white transition-colors">Privacy</Link>
            </p>
        </div>

        {aside && (
            <aside
                aria-hidden
                className="hidden lg:flex relative isolate overflow-hidden flex-col justify-center border-l border-white/8 bg-surface-raised px-12 xl:px-16 py-16"
            >
                <div
                    className="absolute inset-0 -z-10 pointer-events-none"
                    style={{ background: `radial-gradient(ellipse 60% 50% at 60% 40%, ${alpha(CHANNEL.white, 0.05)}, transparent 70%)` }}
                />
                <div className="w-full max-w-xl mx-auto">{aside}</div>
            </aside>
        )}
    </div>
);

/** The page's heading block. */
export const AuthHeading: React.FC<{ title: string; children?: React.ReactNode }> = ({ title, children }) => (
    <div className="mb-8">
        <h1 className="text-[2rem] leading-[1.05] font-semibold text-white tracking-[-0.03em] text-balance">{title}</h1>
        {children && <div className="mt-3 text-body-sm text-neutral-400">{children}</div>}
    </div>
);

const INPUT =
    'w-full bg-surface-raised border border-white/10 rounded-xl px-4 py-3 text-body-sm text-white placeholder:text-neutral-500 ' +
    'hover:border-white/20 focus:outline-none focus:border-white/50 focus:ring-2 focus:ring-white/10 transition-colors';

/** A labelled field. The label sits above and stays — a placeholder is not a label. */
export const Field: React.FC<
    React.InputHTMLAttributes<HTMLInputElement> & { id: string; label: string; hint?: React.ReactNode }
> = ({ id, label, hint, className = '', ...input }) => (
    <div>
        <label htmlFor={id} className="block text-meta font-medium text-neutral-300 mb-2">{label}</label>
        <input id={id} className={`${INPUT} ${className}`} {...input} />
        {hint && <div className="mt-2">{hint}</div>}
    </div>
);

/** A password field with a show/hide control that is keyboard-reachable. */
export const PasswordField: React.FC<
    Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> & { id: string; label: string; hint?: React.ReactNode; aside?: React.ReactNode }
> = ({ id, label, hint, aside, ...input }) => {
    const [shown, setShown] = useState(false);
    return (
        <div>
            <div className="flex items-baseline justify-between mb-2">
                <label htmlFor={id} className="block text-meta font-medium text-neutral-300">{label}</label>
                {aside}
            </div>
            <div className="relative">
                <input id={id} type={shown ? 'text' : 'password'} className={`${INPUT} pr-11`} {...input} />
                <button
                    type="button"
                    onClick={() => setShown(v => !v)}
                    aria-label={shown ? 'Hide password' : 'Show password'}
                    aria-pressed={shown}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-lg text-neutral-400 hover:text-white transition-colors"
                >
                    {shown ? <EyeOff className="w-4 h-4" aria-hidden /> : <Eye className="w-4 h-4" aria-hidden />}
                </button>
            </div>
            {hint && <div className="mt-2">{hint}</div>}
        </div>
    );
};

/** An inline error, announced when it appears. */
export const FormError: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <div role="alert" className="flex items-start gap-2.5 p-3 rounded-xl bg-danger-500/8 border border-danger-500/25">
        <AlertCircle className="w-4 h-4 text-danger-400 flex-shrink-0 mt-0.5" aria-hidden />
        <p className="text-body-sm text-danger-300">{children}</p>
    </div>
);

/** The page's one primary action. */
export const SubmitButton: React.FC<{ loading: boolean; children: React.ReactNode }> = ({ loading, children }) => (
    <button
        type="submit"
        disabled={loading}
        className="group w-full flex items-center justify-center gap-2 h-12 rounded-full bg-white hover:bg-neutral-200 text-surface text-body-sm font-semibold shadow-[0_10px_30px_-12px_rgba(255,255,255,0.35)] transition-[background-color,transform] duration-200 active:scale-[0.98] disabled:opacity-70 disabled:active:scale-100"
    >
        {loading ? (
            <Loader2 className="w-4 h-4 animate-spin" aria-label="Working" />
        ) : (
            <>
                {children}
                <ArrowRight className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-0.5" aria-hidden />
            </>
        )}
    </button>
);

/** A quiet in-page text action ("Forgot password?", "Back to sign in"). */
export const TextAction: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement>> = ({ className = '', ...b }) => (
    <button
        type="button"
        className={`text-meta font-medium text-neutral-300 underline decoration-white/25 underline-offset-4 hover:text-white hover:decoration-white transition-colors ${className}`}
        {...b}
    />
);
