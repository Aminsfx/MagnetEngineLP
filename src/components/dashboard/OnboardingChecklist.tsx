import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, Circle, X, ChevronRight, Rocket } from 'lucide-react';
import { Lead, AppConfig } from '../../lib/types';
import { alpha, CARD_BEZEL, CHANNEL } from '../../lib/theme';

interface OnboardingChecklistProps {
  leads: Lead[];
  config: AppConfig;
}

interface Step {
  id: string;
  label: string;
  description: string;
  path: string;
  linkText: string;
  complete: boolean;
}

const DISMISSED_KEY = 'magnetengine_onboarding_dismissed';

export const OnboardingChecklist: React.FC<OnboardingChecklistProps> = ({ leads, config }) => {
  const [dismissed, setDismissed] = useState(() => {
    return localStorage.getItem(DISMISSED_KEY) === 'true';
  });

  const steps: Step[] = [
    {
      id: 'wizard',
      label: 'Set up your AI prompt',
      description: 'Tell the AI your niche, audience, and tone',
      path: '/settings',
      linkText: 'Open Settings →',
      complete: Boolean(config.onboardingComplete || config.businessName),
    },
    {
      id: 'filters',
      label: 'Configure lead filters',
      description: 'Set follower range and bio keywords for your ICP',
      path: '/settings',
      linkText: 'Open Settings →',
      complete: config.includeKeywords.length > 0 || config.minFollowers > 0 || config.maxFollowers < 100_000_000,
    },
    {
      id: 'search',
      label: 'Run your first search',
      description: 'Find Instagram prospects matching your ICP',
      path: '/campaign',
      linkText: 'Campaign Builder →',
      complete: leads.length > 0,
    },
    {
      id: 'dms',
      label: 'Generate AI DMs',
      description: 'Let the AI write personalised openers for each lead',
      path: '/queue',
      linkText: 'Approval Queue →',
      complete: leads.some((l) => Boolean(l.dmContent)),
    },
    {
      id: 'send',
      label: 'Send your first batch',
      description: 'Push approved DMs to the Chrome extension',
      path: '/queue',
      linkText: 'Approval Queue →',
      complete: leads.some((l) => l.dmSent),
    },
  ];

  const completedCount = steps.filter((s) => s.complete).length;
  const allComplete = completedCount === steps.length;
  const progress = (completedCount / steps.length) * 100;

  // Auto-dismiss permanently once all steps are done
  const handleDismiss = () => {
    localStorage.setItem(DISMISSED_KEY, 'true');
    setDismissed(true);
  };

  if (dismissed || allComplete) return null;

  return (
    <div
      className="rounded-[1.5rem] p-[1px] mb-6"
      style={{ background: `linear-gradient(135deg, ${alpha(CHANNEL.brand, 0.15)} 0%, ${alpha(CHANNEL.white, 0.04)} 60%, ${alpha(CHANNEL.info, 0.08)} 100%)` }}
    >
      <div
        className="bg-surface-sunken rounded-[calc(1.5rem-1px)] p-6 relative overflow-hidden"
        style={CARD_BEZEL.inner}
      >
        {/* Background accent glow */}
        <div className="absolute top-0 right-0 w-64 h-32 bg-brand-500/5 rounded-full blur-3xl pointer-events-none" />

        {/* Header */}
        <div className="flex items-start justify-between mb-5 relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-brand-500/10 border border-brand-500/20 flex items-center justify-center flex-shrink-0">
              <Rocket className="w-4 h-4 text-brand-400" />
            </div>
            <div>
              <p className="text-[10px] font-semibold tracking-[0.2em] text-neutral-600 uppercase">Quick Start</p>
              <h3 className="text-sm font-semibold text-white tracking-tight leading-none">
                {completedCount} of {steps.length} steps complete
              </h3>
            </div>
          </div>
          <button
            onClick={handleDismiss}
            id="onboarding-dismiss-btn"
            className="w-7 h-7 rounded-lg flex items-center justify-center text-neutral-600 hover:text-neutral-300 hover:bg-white/5 transition-all"
            title="Dismiss checklist"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Progress bar */}
        <div className="h-1 bg-white/5 rounded-full mb-5 overflow-hidden relative z-10">
          <div
            className="h-full bg-gradient-to-r from-brand-500 to-info-500 rounded-full transition-all duration-700"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Steps grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2 relative z-10">
          {steps.map((step, i) => (
            <div
              key={step.id}
              className={`rounded-xl p-3 border transition-all duration-300 ${
                step.complete
                  ? 'bg-positive-500/6 border-positive-500/15'
                  : 'bg-white/3 border-white/7 hover:border-white/12'
              }`}
            >
              <div className="flex items-start gap-2 mb-2">
                <span className="flex-shrink-0 mt-0.5">
                  {step.complete ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-positive-400" />
                  ) : (
                    <Circle className="w-3.5 h-3.5 text-neutral-700" />
                  )}
                </span>
                <span className={`text-[11px] font-medium leading-snug ${step.complete ? 'text-positive-400 line-through opacity-60' : 'text-white'}`}>
                  {i + 1}. {step.label}
                </span>
              </div>
              <p className="text-[10px] text-neutral-600 leading-relaxed mb-2 pl-5">{step.description}</p>
              {!step.complete && (
                <Link
                  to={step.path}
                  id={`onboarding-step-${step.id}`}
                  className="inline-flex items-center gap-1 text-[10px] font-semibold text-brand-500 hover:text-brand-400 transition-colors pl-5"
                >
                  {step.linkText}
                  <ChevronRight className="w-2.5 h-2.5" />
                </Link>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
