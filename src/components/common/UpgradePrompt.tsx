import React from 'react';
import { Lock } from 'lucide-react';
import { UPGRADE_CONTACT } from '../../lib/plans';

type Variant = 'inline' | 'overlay' | 'tooltip';

interface UpgradePromptProps {
    message: string;
    requiredPlan?: 'pro' | 'agency';
    variant?: Variant;
}

export const UpgradePrompt: React.FC<UpgradePromptProps> = ({
    message,
    requiredPlan = 'pro',
    variant = 'inline',
}) => {
    const planLabel = requiredPlan === 'agency' ? 'Agency' : 'Pro';

    if (variant === 'tooltip') {
        return (
            <a
                href={UPGRADE_CONTACT}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[10px] font-semibold hover:bg-amber-500/20 transition-all"
                title={`${planLabel} plan — ${message}`}
            >
                <Lock className="w-3 h-3" />
                {planLabel}
            </a>
        );
    }

    if (variant === 'overlay') {
        return (
            <div className="absolute inset-0 z-10 flex items-center justify-center rounded-xl bg-[#030604]/70 backdrop-blur-[2px] border border-amber-500/10">
                <div className="flex flex-col items-center gap-2 text-center px-4">
                    <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
                        <Lock className="w-4 h-4 text-amber-400" />
                    </div>
                    <p className="text-xs font-semibold text-white">{planLabel} feature</p>
                    <p className="text-[11px] text-zinc-500">{message}</p>
                    <a
                        href={UPGRADE_CONTACT}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-1 text-[11px] font-semibold text-amber-400 hover:text-amber-300 underline underline-offset-2 transition-colors"
                    >
                        Upgrade to {planLabel} →
                    </a>
                </div>
            </div>
        );
    }

    // inline (default)
    return (
        <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-amber-500/5 border border-amber-500/15 mt-2">
            <Lock className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
            <div className="flex-1 min-w-0">
                <span className="text-[11px] text-amber-400/80">{planLabel} — {message}</span>
            </div>
            <a
                href={UPGRADE_CONTACT}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[10px] font-semibold text-amber-400 hover:text-amber-300 whitespace-nowrap transition-colors"
            >
                Upgrade →
            </a>
        </div>
    );
};
