import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import { CheckCircle, AlertCircle, Info, X } from 'lucide-react';

/**
 * Lightweight toast notification system — replaces browser alert() calls
 * throughout the dashboard so feedback matches the app's design.
 *
 * Usage:
 *   const toast = useToast();
 *   toast.success('12 DMs generated');
 *   toast.error('Daily send limit reached');
 *   toast.info('Campaign queued');
 *   toast.success('10 DMs approved', { action: { label: 'Undo', onClick: undo } });
 */

type ToastVariant = 'success' | 'error' | 'info';

/** One follow-up the toast offers, e.g. Undo. Clicking it also dismisses the toast. */
export interface ToastAction {
    label: string;
    onClick: () => void;
}

interface ToastOptions {
    action?: ToastAction;
}

interface ToastItem {
    id: number;
    variant: ToastVariant;
    message: string;
    action?: ToastAction;
}

type Notify = (message: string, options?: ToastOptions) => void;

interface ToastContextValue {
    success: Notify;
    error: Notify;
    info: Notify;
}

const ToastContext = createContext<ToastContextValue | null>(null);

/**
 * How long each toast stays. An error names what failed and how to recover,
 * which takes longer to read than a confirmation, and 4.5 s was shorter than
 * several of the recovery messages take to read. A toast carrying an action
 * gets the long timer too — an Undo you can't reach in time is not one.
 */
const DISMISS_MS = { short: 4500, long: 9000 } as const;

/**
 * Variant → role. `success` and `error` are the data's state, so `positive`
 * and `danger`. `info` is deliberately NOT the `info` role: that role is
 * reserved for AI and generation affordances (docs/DESIGN-TOKENS.md), and a toast
 * saying "Campaign queued" is app chatter, not something the AI produced.
 * Chatter is chrome, so it takes `neutral` — which also keeps the two toasts
 * that *do* carry meaning the only coloured ones on screen.
 */
const VARIANT_STYLES: Record<ToastVariant, { border: string; icon: React.ReactNode }> = {
    success: {
        border: 'border-positive-500/30',
        icon: <CheckCircle className="w-4 h-4 text-positive-400 flex-shrink-0" />,
    },
    error: {
        border: 'border-danger-500/30',
        icon: <AlertCircle className="w-4 h-4 text-danger-400 flex-shrink-0" />,
    },
    info: {
        border: 'border-neutral-500/30',
        icon: <Info className="w-4 h-4 text-neutral-400 flex-shrink-0" />,
    },
};

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [toasts, setToasts] = useState<ToastItem[]>([]);
    const nextId = useRef(1);

    const dismiss = useCallback((id: number) => {
        setToasts(prev => prev.filter(t => t.id !== id));
    }, []);

    const push = useCallback((variant: ToastVariant, message: string, options?: ToastOptions) => {
        const id = nextId.current++;
        setToasts(prev => [...prev.slice(-3), { id, variant, message, action: options?.action }]); // keep max 4
        const long = variant === 'error' || Boolean(options?.action);
        setTimeout(() => dismiss(id), long ? DISMISS_MS.long : DISMISS_MS.short);
    }, [dismiss]);

    const api: ToastContextValue = {
        success: useCallback<Notify>((m, o) => push('success', m, o), [push]),
        error: useCallback<Notify>((m, o) => push('error', m, o), [push]),
        info: useCallback<Notify>((m, o) => push('info', m, o), [push]),
    };

    return (
        <ToastContext.Provider value={api}>
            {children}
            {/* Toast stack */}
            <div className="fixed bottom-6 right-6 z-[100] flex flex-col gap-2 max-w-sm">
                {toasts.map(t => (
                    <div
                        key={t.id}
                        // An error interrupts; everything else waits its turn.
                        role={t.variant === 'error' ? 'alert' : 'status'}
                        className={`flex items-start gap-3 px-4 py-3.5 rounded-2xl shadow-2xl border bg-surface-sunken text-sm text-white animate-[toastIn_0.25s_ease-out] ${VARIANT_STYLES[t.variant].border}`}
                    >
                        <span className="mt-0.5">{VARIANT_STYLES[t.variant].icon}</span>
                        <span className="flex-1 leading-snug">{t.message}</span>
                        {t.action && (
                            <button
                                type="button"
                                onClick={() => { t.action!.onClick(); dismiss(t.id); }}
                                className="-my-1 px-2.5 py-1 rounded-lg text-sm font-semibold text-white bg-white/10 hover:bg-white/20 transition-colors"
                            >
                                {t.action.label}
                            </button>
                        )}
                        <button
                            type="button"
                            onClick={() => dismiss(t.id)}
                            aria-label="Dismiss"
                            className="text-neutral-400 hover:text-white transition-colors mt-0.5"
                        >
                            <X className="w-3.5 h-3.5" />
                        </button>
                    </div>
                ))}
            </div>
        </ToastContext.Provider>
    );
};

export function useToast(): ToastContextValue {
    const ctx = useContext(ToastContext);
    if (!ctx) throw new Error('useToast must be used within <ToastProvider>');
    return ctx;
}
