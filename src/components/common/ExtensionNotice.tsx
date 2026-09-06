import React from 'react';
import { AlertTriangle, PlugZap } from 'lucide-react';
import type { ExtensionStatus } from '../../lib/extensionProtocol';

/**
 * Says out loud what the app↔extension handshake found.
 *
 * The failure this exists for is silent by construction: the dashboard posts a
 * message, the content script doesn't recognise it, nothing happens, and every
 * surface still reads "queued". Once the extension ships from the Web Store the
 * two halves update days apart, so an Operator can sit in that state for a week
 * without a single visible symptom. This is the symptom.
 *
 * Deliberately renders nothing while `checking` — a banner that flashes on
 * every load teaches Operators to ignore banners.
 */
export const ExtensionNotice: React.FC<{ status: ExtensionStatus }> = ({ status }) => {
  if (status.state === 'checking') return null;
  if (status.state === 'ready' && !status.needsUpdate) return null;

  const absent = status.state === 'absent';
  const Icon = absent ? PlugZap : AlertTriangle;

  return (
    <div
      role="status"
      className="mx-4 sm:mx-8 mt-4 flex items-start gap-3 rounded-2xl border border-amber-500/25 bg-amber-500/[0.07] px-4 py-3"
    >
      <Icon className="w-4 h-4 mt-0.5 shrink-0 text-amber-400" />
      <div className="text-[13px] leading-relaxed">
        <p className="font-medium text-amber-200">
          {absent
            ? 'Extension not detected'
            : 'Your MagnetEngine extension is out of date'}
        </p>
        <p className="text-zinc-400 mt-0.5">
          {absent ? (
            <>
              DMs, follow-ups and inbox replies all send through the browser
              extension — without it, approving a DM won&apos;t send anything.
              Install it, or enable it and reload this page.
            </>
          ) : (
            <>
              This build
              {status.version ? <> (v{status.version})</> : null}
              {' '}is older than the dashboard, so newer actions won&apos;t reach it.
              Open <span className="font-mono text-zinc-300">chrome://extensions</span>,
              click Update, then reload this page.
            </>
          )}
        </p>
      </div>
    </div>
  );
};
