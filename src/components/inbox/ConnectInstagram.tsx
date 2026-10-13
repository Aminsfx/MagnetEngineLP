import React from 'react';
import { Check, ExternalLink, Instagram, Loader2 } from 'lucide-react';
import {
  EXTENSION_INSTALL_URL,
  type ExtensionStatus,
  type InstagramViewer,
} from '../../lib/extensionProtocol';
import { CARD_BEZEL } from '../../lib/theme';

interface ConnectInstagramProps {
  extension: ExtensionStatus;
  /** The account the extension last saw logged in to instagram.com, if any. */
  detected: InstagramViewer | null;
  onConnect: (viewer: InstagramViewer) => void;
}

const INSTAGRAM_INBOX_URL = 'https://www.instagram.com/direct/inbox/';

/** "@name", or a plain description when Instagram didn't give a username. */
export const igName = (viewer: { username: string }) =>
  viewer.username ? `@${viewer.username}` : 'this Instagram account';

/**
 * What the Inbox shows until the Operator connects their Instagram.
 *
 * There is no Instagram login here and nothing to type: the extension reads the
 * inbox of whoever is logged in to instagram.com in this browser. That is
 * exactly why connecting is an explicit step — the account in the browser may
 * belong to someone else (a shared computer, the Owner testing a second
 * MagnetEngine account), and until now the Inbox took in whatever it was handed.
 * The Operator sees the username and confirms it before a single DM is read.
 */
export const ConnectInstagram: React.FC<ConnectInstagramProps> = ({ extension, detected, onConnect }) => {
  const installed = extension.state === 'ready' || extension.state === 'legacy';
  const current = installed && !extension.needsUpdate;

  const steps: Array<{ title: string; done: boolean; body: React.ReactNode }> = [
    {
      title: current ? 'Extension installed' : installed ? 'Update the extension' : 'Install the Chrome extension',
      done: current,
      body: current ? null : (
        <>
          <p>
            {installed
              ? 'Your copy is older than the dashboard and can\'t tell us which Instagram account it reads. Open chrome://extensions, click Update, then reload this page.'
              : 'MagnetEngine sends your DMs and reads your replies through a small Chrome extension. Add it, then reload this page.'}
          </p>
          {!installed && (
            <a
              href={EXTENSION_INSTALL_URL}
              target="_blank"
              rel="noreferrer"
              className="mt-3 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white text-surface text-sm font-semibold hover:bg-neutral-200 transition-colors"
            >
              Add to Chrome
              <ExternalLink className="w-3.5 h-3.5" aria-hidden />
            </a>
          )}
        </>
      ),
    },
    {
      title: 'Open Instagram in this browser',
      done: !!detected,
      body: detected ? null : (
        <>
          <p>
            Log in as the account you DM prospects from. Keep that tab open — replies are read from it while
            it&apos;s open. Your Instagram password never comes to MagnetEngine.
          </p>
          <a
            href={INSTAGRAM_INBOX_URL}
            target="_blank"
            rel="noreferrer"
            aria-disabled={!current}
            className={`mt-3 inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${
              current
                ? 'bg-white text-surface hover:bg-neutral-200'
                : 'border border-white/10 text-neutral-400 pointer-events-none'
            }`}
          >
            <Instagram className="w-4 h-4" aria-hidden />
            Open Instagram
          </a>
          {current && (
            <p className="mt-3 flex items-center gap-2 text-neutral-400">
              <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden />
              Waiting for Instagram — this takes a few seconds once the tab has loaded.
            </p>
          )}
        </>
      ),
    },
    {
      title: 'Connect the account',
      done: false,
      body: detected ? (
        <>
          <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-3.5 py-3">
            {detected.avatarUrl ? (
              <img src={detected.avatarUrl} alt="" referrerPolicy="no-referrer" className="w-9 h-9 rounded-full object-cover" />
            ) : (
              <span className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center">
                <Instagram className="w-4 h-4 text-white" aria-hidden />
              </span>
            )}
            <div className="min-w-0">
              <p className="text-sm font-semibold text-white truncate">{igName(detected)}</p>
              <p className="text-label text-neutral-400">Logged in to Instagram in this browser</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => onConnect(detected)}
            className="mt-3 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white text-surface text-sm font-semibold hover:bg-neutral-200 transition-colors"
          >
            Connect {igName(detected)}
          </button>
          <p className="mt-3">
            Not your account? Log out of Instagram in this browser, log in with the one you DM from, and it
            shows up here.
          </p>
        </>
      ) : (
        <p>Your account appears here once Instagram is open. Check it&apos;s yours, then connect it.</p>
      ),
    },
  ];

  return (
    <div className="h-full overflow-auto">
      <div className="max-w-2xl">
        <h1 className="text-2xl font-semibold text-white tracking-tight leading-none">Inbox</h1>
        <p className="text-neutral-400 text-sm mt-1.5">
          Connect your Instagram so the AI can read the replies to your DMs and help you book calls from them.
        </p>

        <div className="mt-6 rounded-[1.5rem] p-[1px]" style={CARD_BEZEL.outer}>
          <ol className="bg-surface-sunken rounded-[calc(1.5rem-1px)] p-6 space-y-6" style={CARD_BEZEL.inner}>
            {steps.map((step, i) => {
              const active = !step.done && steps.slice(0, i).every((s) => s.done);
              return (
                <li key={step.title} className="flex gap-4">
                  <span
                    className={`flex-none w-7 h-7 rounded-full flex items-center justify-center text-label font-semibold tabular-nums ${
                      step.done
                        ? 'bg-positive-500/15 text-positive-400 border border-positive-500/30'
                        : active
                          ? 'bg-white text-surface'
                          : 'border border-white/10 text-neutral-400'
                    }`}
                    aria-hidden
                  >
                    {step.done ? <Check className="w-3.5 h-3.5" /> : i + 1}
                  </span>
                  <div className="min-w-0 flex-1 pt-0.5">
                    <h2 className={`text-sm font-semibold ${step.done || active ? 'text-white' : 'text-neutral-400'}`}>
                      {step.title}
                      {step.done && <span className="sr-only"> — done</span>}
                    </h2>
                    {active && step.body && (
                      <div className="mt-1.5 text-meta text-neutral-400 leading-relaxed">{step.body}</div>
                    )}
                  </div>
                </li>
              );
            })}
          </ol>
        </div>
      </div>
    </div>
  );
};
