import React, { useLayoutEffect, useRef } from 'react';
import { ChevronDown } from 'lucide-react';
import type { Conversation } from '../../lib/types';
import { QUALIFICATION_LABEL, type Triage } from '../../lib/triage';

/** Booked is the funnel's good outcome; a qualified lead or an objection is worth your eye; the rest is chrome. */
const QUALIFICATION_CLS: Record<Triage['qualification'], string> = {
  booked: 'text-positive-300 border-positive-500/30 bg-positive-500/10',
  qualified: 'text-white border-white/25 bg-white/[0.08]',
  objection: 'text-white border-white/25 bg-white/[0.08]',
  unqualified: 'text-neutral-400 border-white/[0.08]',
  unknown: 'text-neutral-400 border-white/[0.08]',
};

/** A row arriving at a new place: the Approval Queue's `queue-settle`, run on the row that moved. */
const SETTLE: Keyframe[] = [{ opacity: 0.45, transform: 'translateY(-3px)' }, { opacity: 1, transform: 'none' }];
const SETTLE_TIMING: KeyframeAnimationOptions = { duration: 220, easing: 'cubic-bezier(0.16, 1, 0.3, 1)' };

export function timeAgo(iso?: string): string {
  if (!iso) return '';
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'now';
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

const FULL_TIME = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });

export const Avatar: React.FC<{ conversation: Conversation; lit?: boolean }> = ({ conversation: c, lit }) => (
  <span className="relative block flex-none w-9 h-9">
    <span className="absolute inset-0 rounded-full bg-neutral-800 ring-1 ring-white/10 overflow-hidden flex items-center justify-center">
      {c.avatarUrl
        ? <img src={c.avatarUrl} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" loading="lazy" />
        : <span className="text-meta font-semibold text-white uppercase" aria-hidden>{(c.name || c.handle)[0] ?? '?'}</span>}
    </span>
    {lit && (
      <span className="absolute -left-0.5 -top-0.5 w-2.5 h-2.5 rounded-full bg-white ring-2 ring-surface-sunken">
        <span className="sr-only">New message</span>
      </span>
    )}
  </span>
);

/**
 * One conversation in the Inbox list: who, their last message, the next step
 * and how long it has waited, as a disclosure whose panel (the thread, the
 * copilot and the composer) unfolds under it.
 *
 * A conversation with a message the Operator hasn't opened stays lit. When a
 * new message, or a reply just sent, moves the row to a new place in the
 * list, it settles there visibly rather than silently reshuffling.
 */
export const ConversationRow: React.FC<{
  conversation: Conversation;
  triage: Triage;
  open: boolean;
  onToggle: (c: Conversation) => void;
  /** The open conversation, rendered under the row while `open`. */
  children?: React.ReactNode;
}> = ({ conversation: c, triage: t, open, onToggle, children }) => {
  const ref = useRef<HTMLLIElement>(null);
  const seen = useRef({ at: c.lastMessageAt, open });

  useLayoutEffect(() => {
    const prev = seen.current;
    seen.current = { at: c.lastMessageAt, open };
    // An open row never moves (InboxView pins it); a row moves when it gets a
    // new message while folded, or when it folds after one.
    if (open || (prev.at === c.lastMessageAt && !prev.open)) return;
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
    ref.current?.animate?.(SETTLE, SETTLE_TIMING);
  }, [c.lastMessageAt, open]);

  const lit = !!c.unread && !open;
  const ours = !c.needsReply;
  const title = c.name?.trim() || `@${c.handle}`;
  const panelId = `conversation-${c.id}`;

  return (
    <li ref={ref} id={`row-${c.id}`} className="border-b border-white/[0.06] last:border-b-0 scroll-mt-8">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        onClick={() => onToggle(c)}
        className={`group w-full text-left grid grid-cols-[2.25rem_minmax(0,1fr)_auto] md:grid-cols-[2.25rem_minmax(0,12rem)_minmax(0,1fr)_minmax(0,18rem)_2.75rem_1rem] items-center gap-x-3 md:gap-x-4 gap-y-1 px-4 md:px-5 py-3 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-white/40 ${
          // Open, the header sticks under the priority header (h-8), so who
          // and what's next stay in view while the Operator reads and replies.
          // Lit is its own ground, a clear step above rest and never the
          // value hover lands on.
          open ? 'sticky top-8 z-[5] bg-surface-overlay border-b border-white/[0.06]' : lit ? 'bg-white/[0.06] hover:bg-white/[0.08]' : 'hover:bg-white/[0.03]'
        }`}
      >
        <span className="row-span-3 md:row-span-1 self-start md:self-center">
          <Avatar conversation={c} lit={lit} />
        </span>

        <span className="col-start-2 row-start-1 min-w-0">
          <span className={`block truncate text-body-sm leading-snug ${lit || open ? 'font-semibold text-white' : 'font-medium text-neutral-100'}`}>
            {title}
          </span>
          {c.name?.trim() && <span className="block truncate font-mono text-label text-neutral-400">@{c.handle}</span>}
        </span>

        <span className={`col-start-2 col-span-2 row-start-2 md:col-start-3 md:col-span-1 md:row-start-1 min-w-0 text-meta max-md:line-clamp-2 md:truncate ${
          ours ? 'text-neutral-400' : lit ? 'text-white' : 'text-neutral-200'
        }`}>
          {ours && c.lastMessageText && <span className="text-neutral-400">You: </span>}
          {c.lastMessageText ?? ''}
        </span>

        <span className="col-start-2 col-span-2 row-start-3 md:col-start-4 md:col-span-1 md:row-start-1 min-w-0 flex items-center gap-2">
          {/* A fixed slot at md+, held empty when there's nothing to say, so
              every next step starts on one line down the list. */}
          <span className={`flex-none md:w-[4.75rem] ${t.qualification === 'unknown' ? 'max-md:hidden' : ''}`}>
            {t.qualification !== 'unknown' && (
              <span className={`inline-block px-2 py-0.5 rounded-full border text-label font-semibold ${QUALIFICATION_CLS[t.qualification]}`}>
                {QUALIFICATION_LABEL[t.qualification]}
              </span>
            )}
          </span>
          <span className={`min-w-0 truncate text-meta ${t.priority === 'high' ? 'text-white font-medium' : 'text-neutral-400'}`}>
            {t.nextAction}
          </span>
        </span>

        <time
          dateTime={c.lastMessageAt}
          title={c.lastMessageAt ? FULL_TIME.format(new Date(c.lastMessageAt)) : undefined}
          className="col-start-3 row-start-1 md:col-start-5 self-start md:self-center text-right font-mono text-label tabular-nums text-neutral-400"
        >
          {timeAgo(c.lastMessageAt)}
        </time>

        <ChevronDown
          aria-hidden
          className={`hidden md:block md:col-start-6 md:row-start-1 w-4 h-4 text-neutral-400 group-hover:text-white transition-transform duration-200 ${open ? 'rotate-180 text-white' : ''}`}
        />
      </button>
      {open && children}
    </li>
  );
};
