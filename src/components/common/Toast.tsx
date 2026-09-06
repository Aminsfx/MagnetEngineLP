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
 */

type ToastVariant = 'success' | 'error' | 'info';

interface ToastItem {
    id: number;
    variant: ToastVariant;
    message: string;
}

interface ToastContextValue {
    success: (message: string) => void;
    error: (message: string) => void;
    info: (message: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const AUTO_DISMISS_MS = 4500;

/**
 * Variant → role. `success` and `error` are the data's state, so `positive`
 * and `danger`. `info` is deliberately NOT the `info` role: cyan is reserved
 * for AI and generation affordances (docs/DESIGN-TOKENS.md), and a toast
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

    const push = useCallback((variant: ToastVariant, message: string) => {
        const id = nextId.current++;
        setToasts(prev => [...prev.slice(-3), { id, variant, message }]); // keep max 4
        setTimeout(() => dismiss(id), AUTO_DISMISS_MS);
    }, [dismiss]);

    const api: ToastContextValue = {
        success: useCallback((m: string) => push('success', m), [push]),
        error: useCallback((m: string) => push('error', m), [push]),
        info: useCallback((m: string) => push('info', m), [push]),
    };

    return (
        <ToastContext.Provider value={api}>
            {children}
            {/* Toast stack */}
            <div className="fixed bottom-6 right-6 z-[100] flex flex-col gap-2 max-w-sm">
                {toasts.map(t => (
                    <div
                        key={t.id}
                        role="status"
                        className={`flex items-start gap-3 px-4 py-3.5 rounded-2xl shadow-2xl border bg-surface-sunken text-sm text-white animate-[toastIn_0.25s_ease-out] ${VARIANT_STYLES[t.variant].border}`}
                    >
                        <span className="mt-0.5">{VARIANT_STYLES[t.variant].icon}</span>
                        <span className="flex-1 leading-snug">{t.message}</span>
                        <button
                            onClick={() => dismiss(t.id)}
                            aria-label="Dismiss"
                            className="text-neutral-600 hover:text-neutral-300 transition-colors mt-0.5"
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
