import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, Circle, X, ChevronRight, Rocket } from 'lucide-react';
import { Lead, AppConfig } from '../../lib/types';
import { alpha, CARD_BEZEL, CHANNEL } from '../../lib/theme';
import { EXTENSION_INSTALL_URL, type ExtensionStatus } from '../../lib/extensionProtocol';
import { INBOX_PAUSED } from '../../lib/routes';

interface OnboardingChecklistProps {
  leads: Lead[];
  config: AppConfig;
  extension: ExtensionStatus;
}

interface Step {
  id: string;
  label: string;
  description: string;
  path: string;
  /** Leaves the app (the Chrome Web Store) instead of routing within it. */
  external?: boolean;
  linkText: string;
  complete: boolean;
}

const DISMISSED_KEY = 'magnetengine_onboarding_dismissed';

export const OnboardingChecklist: React.FC<OnboardingChecklistProps> = ({ leads, config, extension }) => {
  const [dismissed, setDismissed] = useState(() => {
    return localStorage.getItem(DISMISSED_KEY) === 'true';
  });

  // Nothing sends and no reply is read without the extension, so it comes
  // first. 'checking' counts as not yet — it settles within a few seconds.
  const extensionInstalled = extension.state === 'ready' || extension.state === 'legacy';

  // Plain words, in the order the work actually happens: each step says what
  // it is for and where to do it. The old copy spoke in our terms ("ICP",
  // "push approved DMs") rather than the Operator's.
  const allSteps: Step[] = [
    {
      id: 'extension',
      label: 'Add the Chrome extension',
      description: 'It sends your DMs from your own Instagram and brings the replies back here. Reload this page after adding it.',
      path: EXTENSION_INSTALL_URL,
      external: true,
      linkText: 'Add to Chrome',
      complete: extensionInstalled,
    },
    {
      id: 'instagram',
      label: 'Connect your Instagram',
      description: 'Log in to Instagram in this browser, then confirm the account you send DMs from.',
      path: '/inbox',
      linkText: 'Connect Instagram',
      complete: Boolean(config.instagramAccount),
    },
    {
      id: 'wizard',
      label: 'Tell the AI about your business',
      description: 'What you sell, who you sell to and how you talk. Every DM is written from this.',
      path: '/settings',
      linkText: 'Open Settings',
      complete: Boolean(config.onboardingComplete || config.businessName),
    },
    {
      id: 'filters',
      label: 'Choose who to reach',
      description: 'Set the follower range and the words a good lead has in their bio.',
      path: '/settings',
      linkText: 'Open Settings',
      complete: config.includeKeywords.length > 0 || config.minFollowers > 0 || config.maxFollowers < 100_000_000,
    },
    {
      id: 'search',
      label: 'Find your first leads',
      description: 'Search Instagram by keyword, hashtag, or the followers of an account like yours.',
      path: '/campaign',
      linkText: 'Find leads',
      complete: leads.length > 0,
    },
    {
      id: 'dms',
      label: 'Let the AI write your DMs',
      description: 'One personal first message per lead. You read and approve each one; nothing sends on its own.',
      path: '/queue',
      linkText: 'Open Approval Queue',
      complete: leads.some((l) => Boolean(l.dmContent)),
    },
    {
      id: 'send',
      label: 'Send your approved DMs',
      description: 'Press Send in the Approval Queue. The extension sends them one at a time, a few minutes apart.',
      path: '/queue',
      linkText: 'Open Approval Queue',
      complete: leads.some((l) => l.dmSent),
    },
    {
      id: 'deals',
      label: 'Track your deals',
      description: 'In the Inbox, type the price you’re pitching. Press Booked when they book a call and Mark as won when they pay. Your revenue fills in by itself.',
      path: '/inbox',
      linkText: 'Open Inbox',
      complete: leads.some((l) => (l.dealValue ?? 0) > 0),
    },
  ];
  // Connecting Instagram and tracking deals both happen in the Inbox, which is
  // hidden while paused.
  const steps = INBOX_PAUSED ? allSteps.filter((s) => s.id !== 'instagram' && s.id !== 'deals') : allSteps;
  // The one to do now is the one that stands out. The others keep their links,
  // quieter, for an Operator who'd rather go out of order.
  const nextId = steps.find((s) => !s.complete)?.id;

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
      style={{ background: `linear-gradient(135deg, ${alpha(CHANNEL.white, 0.15)} 0%, ${alpha(CHANNEL.white, 0.04)} 60%, ${alpha(CHANNEL.white, 0.08)} 100%)` }}
    >
      <div
        className="bg-surface-sunken rounded-[calc(1.5rem-1px)] p-6 relative overflow-hidden"
        style={CARD_BEZEL.inner}
      >
        {/* Background accent glow */}
        <div className="absolute top-0 right-0 w-64 h-32 bg-white/5 rounded-full blur-3xl pointer-events-none" />

        {/* Header */}
        <div className="flex items-start justify-between mb-5 relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center flex-shrink-0">
              <Rocket className="w-4 h-4 text-white" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white tracking-tight leading-none">
                Get set up<span className="text-neutral-400 font-normal"> · {completedCount} of {steps.length} done</span>
              </h3>
              <p className="text-label text-neutral-400 mt-1.5">
                Go in order. Each step takes a few minutes and ticks itself off when it’s done.
              </p>
            </div>
          </div>
          <button
            onClick={handleDismiss}
            id="onboarding-dismiss-btn"
            className="w-7 h-7 rounded-lg flex items-center justify-center text-neutral-400 hover:text-neutral-300 hover:bg-white/5 transition-colors"
            title="Dismiss checklist"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Progress bar */}
        <div className="h-1 bg-white/5 rounded-full mb-5 overflow-hidden relative z-10">
          <div
            className="h-full bg-gradient-to-r from-white to-neutral-400 rounded-full transition-all duration-700"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Steps grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 relative z-10">
          {steps.map((step, i) => {
            const isNext = step.id === nextId;
            const linkCls = `inline-flex items-center gap-1 text-label font-semibold transition-colors pl-5 ${
              isNext ? 'text-white' : 'text-neutral-400 hover:text-white'
            }`;
            return (
              <div
                key={step.id}
                className={`rounded-xl p-3 border transition-colors duration-300 ${
                  step.complete
                    ? 'bg-positive-500/6 border-positive-500/15'
                    : isNext
                      ? 'bg-white/[0.06] border-white/30'
                      : 'bg-white/3 border-white/7 hover:border-white/12'
                }`}
              >
                <div className="flex items-start gap-2 mb-2">
                  <span className="flex-shrink-0 mt-0.5">
                    {step.complete ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-positive-400" />
                    ) : (
                      <Circle className={`w-3.5 h-3.5 ${isNext ? 'text-white' : 'text-neutral-400'}`} />
                    )}
                  </span>
                  <span className={`text-label font-medium leading-snug ${step.complete ? 'text-positive-400 line-through opacity-60' : 'text-white'}`}>
                    {i + 1}. {step.label}
                  </span>
                  {isNext && (
                    <span className="ml-auto flex-none text-label px-1.5 py-0.5 rounded-full bg-white text-surface font-semibold leading-none">
                      Next
                    </span>
                  )}
                </div>
                <p className="text-label text-neutral-400 leading-relaxed mb-2 pl-5">{step.description}</p>
                {!step.complete && (step.external ? (
                  <a href={step.path} target="_blank" rel="noreferrer" id={`onboarding-step-${step.id}`} className={linkCls}>
                    {step.linkText}
                    <ChevronRight className="w-2.5 h-2.5" aria-hidden />
                  </a>
                ) : (
                  <Link to={step.path} id={`onboarding-step-${step.id}`} className={linkCls}>
                    {step.linkText}
                    <ChevronRight className="w-2.5 h-2.5" aria-hidden />
                  </Link>
                ))}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
