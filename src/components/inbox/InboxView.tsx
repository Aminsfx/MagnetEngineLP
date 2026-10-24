import React, { useCallback, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Inbox as InboxIcon, Search, Bot } from 'lucide-react';
import type { Conversation, Message, AppConfig, Lead } from '../../lib/types';
import type { ReplyResult } from '../../lib/api';
import { posthogCapture } from '../../lib/posthog';
import type { InstagramViewer } from '../../lib/extensionProtocol';
import { igName } from './ConnectInstagram';
import type { Suggestion } from '../../lib/copilot';
import { triage, byPriority, PRIORITY_LABEL, type Priority, type Triage } from '../../lib/triage';
import { canonicalHandle } from '../../lib/intake';
import { CARD_BEZEL } from '../../lib/theme';
import { ConversationRow } from './ConversationRow';
import { OpenConversation } from './OpenConversation';

interface InboxViewProps {
  conversations: Conversation[];
  messages: Message[];
  /** Every Lead, so each Conversation can show the deal on the Lead behind it. */
  leads: Lead[];
  /** Change the deal with the person in `conv`, making them a Lead if they aren't one. */
  onSaveDeal: (conv: Conversation, change: (lead: Lead) => Lead) => void;
  config: AppConfig;
  /** `instruction` steers one copilot suggestion; without it, the reply prompt as written. */
  onGenerateReply: (conv: Conversation, instruction?: string) => Promise<ReplyResult>;
  /** Hands the reply to the extension: false when it was refused, so the draft stays. */
  onSendReply: (conv: Conversation, text: string) => Promise<boolean> | boolean;
  onUpdateConversation: (conv: Conversation) => void;
  onUpdateConfig: (config: AppConfig) => Promise<void> | void;
  /** The account logged in to Instagram in this browser right now, if known. */
  detected: InstagramViewer | null;
  onDisconnectInstagram: () => void;
}

type Filter = 'all' | 'qualified' | 'objection' | 'booked';

const FILTERS: Array<{ key: Filter; label: string }> = [
  { key: 'all', label: 'All' },
  { key: 'qualified', label: 'Qualified' },
  { key: 'objection', label: 'Objections' },
  { key: 'booked', label: 'Booked' },
];

const PRIORITIES: Priority[] = ['high', 'medium', 'low'];

/** How loud each priority is in the list: one solid dot, one faint, one barely there. */
const PRIORITY_DOT: Record<Priority, string> = {
  high: 'bg-white',
  medium: 'bg-white/45',
  low: 'bg-white/15',
};

/** The sticky priority header (h-8) a scrolled row must clear. */
const STICKY_HEADER_PX = 32;

/** The element that scrolls the list: the dashboard's <main>, or null for the window. */
function scrollerOf(el: HTMLElement): HTMLElement | null {
  for (let p = el.parentElement; p; p = p.parentElement) {
    const { overflowY } = getComputedStyle(p);
    if (overflowY === 'auto' || overflowY === 'scroll') return p;
  }
  return null;
}

const matchesFilter = (q: Triage['qualification'], f: Filter) =>
  f === 'all' || (f === 'qualified' ? q === 'qualified' : f === 'objection' ? q === 'objection' : q === 'booked');

/**
 * Where the open conversation sat when it unfolded. It stays there until it
 * folds: a reply sent, or a new message, would otherwise move the row out from
 * under the Operator's hands.
 */
interface Pin {
  id: string;
  t: Triage;
  at?: string;
}

export const InboxView: React.FC<InboxViewProps> = ({
  conversations, messages, leads, onSaveDeal, config, onGenerateReply, onSendReply, onUpdateConversation, onUpdateConfig,
  detected, onDisconnectInstagram,
}) => {
  const account = config.instagramAccount!;
  // The browser is logged in to a different Instagram than the one connected:
  // nothing from it is taken in, and the Operator should know why it's quiet.
  const otherAccount = detected && detected.id !== account.id ? detected : null;
  const [filter, setFilter] = useState<Filter>('all');
  const [search, setSearch] = useState('');
  const [openId, setOpenId] = useState<string | null>(null);
  const [pin, setPin] = useState<Pin | null>(null);
  /** Set by Next, so the conversation it opens takes keyboard focus in its composer. */
  const focusComposer = useRef(false);
  // Copilot suggestions per thread state, kept while the Inbox is open.
  const [copilotCache] = useState(() => new Map<string, Suggestion[]>());

  const triaged = useMemo(
    () => conversations.map((c) => ({ c, t: triage(c, { hasBookingLink: !!config.calendarLink }) })),
    [conversations, config.calendarLink],
  );
  const triageOf = useMemo(() => new Map<string, Triage>(triaged.map(({ c, t }) => [c.id, t])), [triaged]);

  const counts = useMemo(() => {
    const n = (f: Filter) => triaged.filter(({ t }) => matchesFilter(t.qualification, f)).length;
    return { all: triaged.length, qualified: n('qualified'), objection: n('objection'), booked: n('booked') };
  }, [triaged]);

  const attention = useMemo(() => triaged.filter(({ t }) => t.priority === 'high').length, [triaged]);

  /** The list, sorted by priority and cut into its groups, with the open conversation held where it was. */
  const groups = useMemo(() => {
    const q = search.trim().toLowerCase();
    const items = triaged
      .filter(({ c, t }) => {
        if (!matchesFilter(t.qualification, filter)) return false;
        if (q && !c.handle.toLowerCase().includes(q) && !(c.name ?? '').toLowerCase().includes(q)) return false;
        return true;
      })
      .map(({ c, t }) => ({
        c,
        t,
        place: pin?.id === c.id ? { c: { ...c, lastMessageAt: pin.at }, t: pin.t } : { c, t },
      }))
      .sort((a, b) => byPriority(a.place, b.place));
    return PRIORITIES
      .map((priority) => ({ priority, items: items.filter(({ place }) => place.t.priority === priority) }))
      .filter((g) => g.items.length > 0);
  }, [triaged, filter, search, pin]);
  const listed = groups.reduce((n, g) => n + g.items.length, 0);

  /** Who to offer after a reply goes out: the first conversation down the list that still needs the Operator. */
  const next = useMemo(() => {
    for (const g of groups) {
      const hit = g.items.find(({ c, t }) => c.id !== openId && t.priority !== 'low');
      if (hit) return hit.c;
    }
    return null;
  }, [groups, openId]);

  const open = useMemo(() => conversations.find((c) => c.id === openId) ?? null, [conversations, openId]);

  const thread = useMemo(
    () => messages
      .filter((m) => m.conversationId === openId)
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
    [messages, openId],
  );

  // A Lead's Handle is canonical by construction (intake); a Conversation's is
  // whatever Instagram sent, so it is put in the same form to match.
  const openLead = useMemo(() => {
    const handle = open ? canonicalHandle(open.handle) : '';
    return handle ? leads.find((l) => l.handle === handle) : undefined;
  }, [leads, open]);

  const unfold = useCallback((c: Conversation) => {
    setOpenId(c.id);
    setPin({ id: c.id, t: triageOf.get(c.id) ?? triage(c), at: c.lastMessageAt });
    if (c.unread) onUpdateConversation({ ...c, unread: false });
  }, [onUpdateConversation, triageOf]);

  const fold = useCallback(() => {
    setOpenId(null);
    setPin(null);
  }, []);

  const toggle = useCallback((c: Conversation) => (c.id === openId ? fold() : unfold(c)), [fold, openId, unfold]);

  // The row that unfolds can sit where the one that just folded used to be, or
  // low on the screen. Side by side (md+), scroll just enough to show the
  // composer and its send pill; a long thread slides up under the row's
  // header, which sticks. Stacked on a phone, the replies would be scrolled
  // past, so the header goes to the top and the conversation reads down.
  useLayoutEffect(() => {
    if (!openId) return;
    const sideBySide = window.matchMedia?.('(min-width: 768px)').matches ?? true;
    // Arrived by Next: the keyboard carries on in the new composer. On a phone
    // that would raise the on-screen keyboard over the thread, so focus goes
    // to the row's header instead.
    if (focusComposer.current) {
      focusComposer.current = false;
      const target = sideBySide
        ? document.getElementById(`reply-${openId}`)
        : document.querySelector<HTMLElement>(`#row-${openId} > button`);
      target?.focus({ preventScroll: true });
    }
    const row = document.getElementById(`row-${openId}`);
    const composer = document.getElementById(`composer-${openId}`);
    if (!row || !composer || row.getBoundingClientRect().height === 0) return;
    const scroller = scrollerOf(row);
    const view = scroller ? scroller.getBoundingClientRect() : { top: 0, bottom: window.innerHeight };
    const headroom = row.getBoundingClientRect().top - (view.top + STICKY_HEADER_PX);
    const cut = composer.getBoundingClientRect().bottom + 16 - view.bottom;
    const by = headroom < 0 || !sideBySide ? headroom : Math.max(0, cut);
    if (Math.abs(by) < 1) return;
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    (scroller ?? window).scrollBy?.({ top: by, behavior: reduced ? 'auto' : 'smooth' });
  }, [openId]);

  const generateFor = useCallback(
    (instruction?: string) => (open ? onGenerateReply(open, instruction) : Promise.reject(new Error('No conversation'))),
    [onGenerateReply, open],
  );

  const sendFor = useCallback(
    async (text: string) => (open ? (await onSendReply(open, text)) !== false : false),
    [onSendReply, open],
  );

  const showFilter = (f: Filter) => {
    setFilter(f);
    fold();
  };

  const toggleAutopilot = async () => {
    const enabled = !config.autopilot;
    await onUpdateConfig({ ...config, autopilot: enabled });
    posthogCapture('autopilot_toggled', { enabled });
  };

  return (
    <div className="space-y-4 [color-scheme:dark]">
      {/* ── Header ── */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold text-white tracking-tight">Inbox</h1>
          <p className="text-neutral-400 text-sm mt-1.5">
            {attention > 0
              ? <><span className="text-white font-medium"><span className="font-mono tabular-nums">{attention}</span> {attention === 1 ? 'conversation needs' : 'conversations need'} you now.</span> Sorted by who needs you, with the next step for each.</>
              : 'Every reply in one place, sorted by who needs you, with the next step for each.'}
          </p>
          <p className="text-meta text-neutral-400 mt-1.5">
            Connected: <span className="font-mono text-neutral-200">{igName(account)}</span>
            {' · '}
            <button
              type="button"
              onClick={onDisconnectInstagram}
              className="text-neutral-300 underline decoration-white/30 underline-offset-2 hover:text-white hover:decoration-white"
            >
              Switch account
            </button>
          </p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={!!config.autopilot}
          onClick={toggleAutopilot}
          title="When on, the AI writes and sends replies to new inbound DMs without you reading them first, while this dashboard tab is open"
          className={`flex-none inline-flex items-center gap-2.5 pl-3.5 pr-2 py-1.5 rounded-full border text-meta font-medium transition-colors ${
            config.autopilot
              ? 'border-white/30 bg-white/[0.08] text-white'
              : 'border-white/12 text-neutral-300 hover:text-white hover:border-white/30'
          }`}
        >
          <Bot className="w-4 h-4" aria-hidden />
          Autopilot
          <span aria-hidden className={`relative w-8 h-[18px] rounded-full transition-colors ${config.autopilot ? 'bg-white' : 'bg-white/15'}`}>
            <span className={`absolute top-[2px] left-[2px] w-[14px] h-[14px] rounded-full transition-transform duration-200 ${
              config.autopilot ? 'translate-x-[14px] bg-surface' : 'bg-white'
            }`} />
          </span>
        </button>
      </div>

      {otherAccount && (
        <div role="status" className="px-4 py-3 rounded-2xl border border-white/20 bg-white/[0.06] text-meta text-neutral-300 leading-relaxed">
          <span className="text-white font-medium">This browser is logged in to Instagram as {igName(otherAccount)}, not {igName(account)}.</span>{' '}
          Its DMs stay out of this Inbox. Log in to Instagram as {igName(account)} to see new replies here, or
          switch the connected account.
        </div>
      )}

      {config.autopilot && (
        <div role="status" className="flex items-center gap-2.5 px-4 py-3 rounded-2xl border border-white/20 bg-white/[0.06] text-meta text-neutral-200">
          <span className="relative flex flex-none h-1.5 w-1.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-neutral-200 opacity-75" />
            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-white" />
          </span>
          Autopilot is sending AI replies without your review while this dashboard tab is open. Turn it off, or close this tab, to stop it.
        </div>
      )}

      {/* ── Filters + search ── */}
      <div className="flex flex-wrap items-center gap-3">
        <div role="tablist" aria-label="Show" className="inline-flex max-w-full overflow-x-auto [scrollbar-width:none] items-center gap-0.5 p-1 rounded-full bg-white/[0.04] border border-white/[0.06]">
          {FILTERS.map((f) => {
            const active = filter === f.key;
            return (
              <button
                key={f.key}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => showFilter(f.key)}
                className={`flex-none inline-flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3.5 py-1.5 rounded-full text-meta font-medium transition-colors ${
                  active ? 'bg-surface text-white ring-1 ring-inset ring-white/12' : 'text-neutral-400 hover:text-white'
                }`}
              >
                {f.label}
                <span className={`font-mono text-label tabular-nums ${active ? 'text-neutral-300' : 'text-neutral-400'}`}>{counts[f.key]}</span>
              </button>
            );
          })}
        </div>
        <div className="relative w-full sm:w-64 sm:ml-auto">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-neutral-500" aria-hidden />
          <input
            type="search"
            value={search}
            onChange={(e) => { setSearch(e.target.value); fold(); }}
            placeholder="Search @handle or name"
            aria-label="Search conversations by handle or name"
            className="w-full pl-9 pr-3 py-2 rounded-full bg-white/[0.03] border border-white/[0.08] text-meta text-white placeholder:text-neutral-500 focus:outline-none focus:border-white/40 focus:ring-2 focus:ring-white/10 transition-colors"
          />
        </div>
      </div>

      {/* ── The list ── */}
      <div className="rounded-[1.5rem] p-[1px]" style={CARD_BEZEL.outer}>
        <div role="tabpanel" aria-label={FILTERS.find((f) => f.key === filter)!.label} className="bg-surface-sunken rounded-[calc(1.5rem-1px)] overflow-clip" style={CARD_BEZEL.inner}>
          {listed === 0 ? (
            <div className="px-6 py-14 flex flex-col items-center gap-3 text-center">
              <InboxIcon className="w-8 h-8 text-neutral-400" aria-hidden />
              {conversations.length === 0 ? (
                <>
                  <p className="text-body-sm font-medium text-white">No conversations yet</p>
                  <p className="max-w-md text-meta text-neutral-400">
                    Open your Instagram inbox (instagram.com/direct/inbox) in this browser with the MagnetEngine
                    extension installed, and keep the tab open. Replies to your DMs show up here within a couple of minutes.
                  </p>
                </>
              ) : (
                <>
                  <p className="text-body-sm font-medium text-white">No conversations match</p>
                  <button
                    type="button"
                    onClick={() => { setFilter('all'); setSearch(''); }}
                    className="inline-flex items-center gap-2 px-3.5 py-2 rounded-full border border-white/12 text-meta font-medium text-neutral-200 hover:text-white hover:border-white/30 hover:bg-white/[0.04] transition-colors"
                  >
                    Show every conversation
                  </button>
                </>
              )}
            </div>
          ) : (
            groups.map(({ priority, items }) => (
              <section key={priority} aria-label={PRIORITY_LABEL[priority]}>
                <h2 className="sticky top-0 z-10 h-8 flex items-center gap-2 px-4 md:px-5 bg-surface-sunken border-b border-white/[0.06] text-label font-semibold text-neutral-300">
                  <span className={`w-1.5 h-1.5 rounded-full ${PRIORITY_DOT[priority]}`} aria-hidden />
                  {PRIORITY_LABEL[priority]}
                  <span className="font-mono font-normal tabular-nums text-neutral-400">{items.length}</span>
                </h2>
                <ul>
                  {items.map(({ c, t }) => (
                    <ConversationRow key={c.id} conversation={c} triage={t} open={c.id === openId} onToggle={toggle}>
                      {c.id === openId && (
                        <OpenConversation
                          key={c.id}
                          conversation={c}
                          triage={t}
                          thread={thread}
                          lead={openLead}
                          copilotCache={copilotCache}
                          generate={generateFor}
                          onSend={sendFor}
                          onUpdate={onUpdateConversation}
                          onSaveDeal={(change) => onSaveDeal(c, change)}
                          next={next}
                          onNext={() => {
                            if (!next) return;
                            focusComposer.current = true;
                            unfold(next);
                          }}
                          onClose={fold}
                        />
                      )}
                    </ConversationRow>
                  ))}
                </ul>
              </section>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
