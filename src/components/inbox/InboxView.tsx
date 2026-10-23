import React, { useCallback, useMemo, useState } from 'react';
import {
  Inbox as InboxIcon, Send, Search, Tag, X,
  Bot, Calendar, MessageSquare, ChevronLeft, ArrowRight,
} from 'lucide-react';
import type { Conversation, Message, AppConfig, ConversationIntent, Lead } from '../../lib/types';
import type { ReplyResult } from '../../lib/api';
import { useToast } from '../common/Toast';
import { posthogCapture } from '../../lib/posthog';
import type { InstagramViewer } from '../../lib/extensionProtocol';
import { igName } from './ConnectInstagram';
import { Copilot } from './Copilot';
import type { Suggestion } from '../../lib/copilot';
import { triage, byPriority, PRIORITY_LABEL, QUALIFICATION_LABEL, type Priority, type Triage } from '../../lib/triage';
import { canonicalHandle } from '../../lib/intake';
import { DealPanel } from './DealPanel';

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
  onSendReply: (conv: Conversation, text: string) => Promise<void> | void;
  onUpdateConversation: (conv: Conversation) => void;
  onUpdateConfig: (config: AppConfig) => Promise<void> | void;
  /** The account logged in to Instagram in this browser right now, if known. */
  detected: InstagramViewer | null;
  onDisconnectInstagram: () => void;
}

type Filter = 'all' | 'qualified' | 'objection' | 'booked';

/** How loud each priority is in the list: one solid dot, one faint, one barely there. */
const PRIORITY_DOT: Record<Priority, string> = {
  high: 'bg-white',
  medium: 'bg-white/45',
  low: 'bg-white/15',
};

/** Booked is the funnel's good outcome; a qualified lead or an objection is worth your eye; the rest is chrome. */
const QUALIFICATION_CLS: Record<Triage['qualification'], string> = {
  booked: 'text-positive-300 border-positive-500/30 bg-positive-500/10',
  qualified: 'text-white border-white/30 bg-white/10',
  objection: 'text-white border-white/30 bg-white/10',
  unqualified: 'text-neutral-400 border-white/10 bg-white/5',
  unknown: 'text-neutral-400 border-white/10 bg-white/5',
};

/**
 * One role per intent. Every intent is the AI reading a Conversation, so
 * "the AI produced it" cannot be the whole rule — what separates them is how far
 * each one is allowed to travel:
 *
 * - `objection` carries severity, and severity outranks provenance → `caution`.
 * - `booked` is the only intent that becomes an Outcome: it stamps the Lead
 *   behind the Conversation and fires a webhook → `positive`.
 * - `interested` is a judgement that CONTEXT.md says "colours the Inbox but does
 *   not move the funnel" → `info`, the role held for what the AI merely thinks.
 *   Sharing a hue with `booked` would let a misread look like a booked call.
 * - `neutral` and `not_interested` assert nothing → chrome, the latter dimmer
 *   because it closes the Conversation rather than leaving it open.
 */
const INTENT_META: Record<ConversationIntent, { label: string; cls: string }> = {
  interested:     { label: 'Interested',     cls: 'text-white border-white/30 bg-white/10' },
  booked:         { label: 'Booked',         cls: 'text-positive-300 border-positive-500/30 bg-positive-500/10' },
  objection:      { label: 'Objection',      cls: 'text-white border-white/30 bg-white/10' },
  not_interested: { label: 'Not interested', cls: 'text-neutral-400 border-white/10 bg-white/5' },
  neutral:        { label: 'Neutral',        cls: 'text-neutral-300 border-neutral-500/30 bg-neutral-500/10' },
};

const QUICK_LABELS = ['Hot', 'Warm', 'Call booked', 'Follow up', 'Not now'];

function timeAgo(iso?: string): string {
  if (!iso) return '';
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'now';
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

export const InboxView: React.FC<InboxViewProps> = ({
  conversations, messages, leads, onSaveDeal, config, onGenerateReply, onSendReply, onUpdateConversation, onUpdateConfig,
  detected, onDisconnectInstagram,
}) => {
  const account = config.instagramAccount!;
  // The browser is logged in to a different Instagram than the one connected:
  // nothing from it is taken in, and the Operator should know why it's quiet.
  const otherAccount = detected && detected.id !== account.id ? detected : null;
  const toast = useToast();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>('all');
  const [search, setSearch] = useState('');
  const [draft, setDraft] = useState('');
  const [labelInput, setLabelInput] = useState('');
  // Copilot suggestions per thread state, kept while the Inbox is open.
  const [copilotCache] = useState(() => new Map<string, Suggestion[]>());

  const triaged = useMemo(
    () => conversations.map((c) => ({ c, t: triage(c, { hasBookingLink: !!config.calendarLink }) })),
    [conversations, config.calendarLink],
  );
  const triageOf = useMemo(() => new Map<string, Triage>(triaged.map(({ c, t }) => [c.id, t])), [triaged]);

  const matchesFilter = (q: Triage['qualification'], f: Filter) =>
    f === 'all' || (f === 'qualified' ? q === 'qualified' : f === 'objection' ? q === 'objection' : q === 'booked');

  const counts = useMemo(() => {
    const n = (f: Filter) => triaged.filter(({ t }) => matchesFilter(t.qualification, f)).length;
    return { all: triaged.length, qualified: n('qualified'), objection: n('objection'), booked: n('booked') };
  }, [triaged]);

  const attention = useMemo(() => triaged.filter(({ t }) => t.priority === 'high').length, [triaged]);

  /** The list, sorted by priority and cut into its groups. */
  const groups = useMemo(() => {
    const q = search.trim().toLowerCase();
    const items = triaged
      .filter(({ c, t }) => {
        if (!matchesFilter(t.qualification, filter)) return false;
        if (q && !c.handle.toLowerCase().includes(q) && !(c.name ?? '').toLowerCase().includes(q)) return false;
        return true;
      })
      .sort(byPriority);
    return (['high', 'medium', 'low'] as Priority[])
      .map((priority) => ({ priority, items: items.filter(({ t }) => t.priority === priority) }))
      .filter((g) => g.items.length > 0);
  }, [triaged, filter, search]);
  const listed = groups.reduce((n, g) => n + g.items.length, 0);

  const selected = useMemo(
    () => conversations.find((c) => c.id === selectedId) ?? null,
    [conversations, selectedId],
  );

  const thread = useMemo(
    () => messages
      .filter((m) => m.conversationId === selectedId)
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
    [messages, selectedId],
  );

  // A Lead's Handle is canonical by construction (intake); a Conversation's is
  // whatever Instagram sent, so it is put in the same form to match.
  const selectedLead = useMemo(() => {
    const handle = selected ? canonicalHandle(selected.handle) : '';
    return handle ? leads.find((l) => l.handle === handle) : undefined;
  }, [leads, selected]);

  const openConversation = (c: Conversation) => {
    setSelectedId(c.id);
    setDraft('');
    setLabelInput('');
    if (c.unread) onUpdateConversation({ ...c, unread: false });
  };

  const generateFor = useCallback(
    (instruction?: string) => (selected ? onGenerateReply(selected, instruction) : Promise.reject(new Error('No conversation'))),
    [onGenerateReply, selected],
  );
  const selectedTriage = selected ? triageOf.get(selected.id) : undefined;

  const handleSend = async () => {
    if (!selected || !draft.trim()) return;
    await onSendReply(selected, draft);
    setDraft('');
  };

  const addLabel = (raw: string) => {
    if (!selected) return;
    const label = raw.trim();
    if (!label) return;
    const existing = selected.labels ?? [];
    if (existing.some((l) => l.toLowerCase() === label.toLowerCase())) return;
    onUpdateConversation({ ...selected, labels: [...existing, label] });
    setLabelInput('');
  };

  const removeLabel = (label: string) => {
    if (!selected) return;
    onUpdateConversation({ ...selected, labels: (selected.labels ?? []).filter((l) => l !== label) });
  };

  const setBooked = () => {
    if (!selected) return;
    onUpdateConversation({ ...selected, status: 'booked', intent: 'booked' });
    posthogCapture('conversation_marked_booked');
    toast.success(`@${selected.handle} marked as booked 🎉`);
  };

  const toggleAutopilot = async () => {
    const enabled = !config.autopilot;
    await onUpdateConfig({ ...config, autopilot: enabled });
    posthogCapture('autopilot_toggled', { enabled });
  };

  const filterTabs: Array<{ key: Filter; label: string }> = [
    { key: 'all', label: 'All' },
    { key: 'qualified', label: 'Qualified' },
    { key: 'objection', label: 'Objections' },
    { key: 'booked', label: 'Booked' },
  ];

  return (
    <div className="flex flex-col h-full">
      {/* Header row */}
      <div className="flex items-start justify-between gap-4 mb-4 flex-shrink-0">
        <div>
          <h1 className="text-2xl font-semibold text-white tracking-tight leading-none">Inbox</h1>
          <p className="text-neutral-400 text-sm mt-1.5">
            {attention > 0
              ? <><span className="text-white font-medium">{attention} {attention === 1 ? 'conversation needs' : 'conversations need'} you now.</span> Sorted by priority, with the next step for each.</>
              : 'Every reply in one place, sorted by priority, with the next step for each.'}
          </p>
          <p className="text-meta text-neutral-400 mt-2">
            Connected: <span className="text-white font-medium">{igName(account)}</span>
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
        {/* Autopilot toggle */}
        <button
          type="button"
          role="switch"
          aria-checked={!!config.autopilot}
          onClick={toggleAutopilot}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl border text-xs font-medium transition-colors flex-shrink-0 ${
            config.autopilot
              ? 'text-white border-white/40 bg-white/10'
              : 'text-neutral-400 border-white/10 bg-white/5 hover:text-white'
          }`}
          title="When on, the AI writes and sends replies to new inbound DMs without you reading them first, while this dashboard tab is open"
        >
          <Bot className="w-4 h-4" aria-hidden />
          Autopilot: {config.autopilot ? 'on' : 'off'}
        </button>
      </div>

      {otherAccount && (
        <div role="status" className="mb-3 px-3.5 py-2.5 rounded-xl border border-white/25 bg-white/[0.07] text-xs text-neutral-300 leading-relaxed flex-shrink-0">
          <span className="text-white font-medium">This browser is logged in to Instagram as {igName(otherAccount)}, not {igName(account)}.</span>{' '}
          Its DMs stay out of this Inbox. Log in to Instagram as {igName(account)} to see new replies here, or
          switch the connected account.
        </div>
      )}

      {config.autopilot && (
        <div className="mb-3 px-3.5 py-2 rounded-xl border border-white/25 bg-white/[0.08] text-white/90 text-xs flex items-center gap-2 flex-shrink-0">
          <span className="relative flex h-1.5 w-1.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-neutral-200 opacity-75" />
            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-white" />
          </span>
          Autopilot is sending AI replies without your review while this dashboard tab is open. Turn it off, or close this tab, to stop it.
        </div>
      )}

      {/* Two-pane */}
      <div className="flex flex-1 min-h-0 gap-4">
        {/* ── Left: thread list ── */}
        <div className={`${selectedId ? 'hidden lg:flex' : 'flex'} flex-col w-full lg:w-[264px] xl:w-[288px] flex-shrink-0 rounded-2xl border border-white/[0.08] bg-white/[0.02] overflow-hidden`}>
          {/* Search + filters */}
          <div className="p-3 border-b border-white/5 space-y-2.5">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search @handle or name"
                className="w-full pl-9 pr-3 py-2 rounded-lg bg-white/5 border border-white/[0.08] text-sm text-white placeholder:text-neutral-500 focus:outline-none focus:border-white/40"
              />
            </div>
            <div className="flex flex-wrap gap-1.5">
              {filterTabs.map((t) => (
                <button
                  key={t.key}
                  onClick={() => setFilter(t.key)}
                  className={`px-2.5 py-1 rounded-full text-label font-medium border transition-colors ${
                    filter === t.key
                      ? 'text-white border-white/30 bg-white/10'
                      : 'text-neutral-400 border-white/[0.08] bg-transparent hover:text-white'
                  }`}
                >
                  {t.label} <span className="opacity-60">{counts[t.key]}</span>
                </button>
              ))}
            </div>
          </div>

          {/* List, in priority groups */}
          <div className="flex-1 overflow-y-auto">
            {listed === 0 ? (
              <div className="p-8 text-center text-neutral-400 text-sm flex flex-col items-center gap-3">
                <InboxIcon className="w-8 h-8 text-neutral-400" />
                {conversations.length === 0
                  ? 'No conversations yet. Open your Instagram inbox (instagram.com/direct/inbox) in this browser with the MagnetEngine extension installed, and keep the tab open — replies to your DMs show up here within a couple of minutes.'
                  : 'No conversations match this filter.'}
              </div>
            ) : (
              groups.map(({ priority, items }) => (
                <section key={priority} aria-label={PRIORITY_LABEL[priority]}>
                  <h2 className="sticky top-0 z-10 px-3 py-1.5 bg-surface-raised/95 backdrop-blur border-b border-white/[0.04] flex items-center gap-2 text-label font-semibold text-neutral-300">
                    <span className={`w-1.5 h-1.5 rounded-full ${PRIORITY_DOT[priority]}`} aria-hidden />
                    {PRIORITY_LABEL[priority]}
                    <span className="text-neutral-500 font-normal tabular-nums">{items.length}</span>
                  </h2>
                  {items.map(({ c, t }) => {
                    const active = c.id === selectedId;
                    return (
                      <button
                        key={c.id}
                        onClick={() => openConversation(c)}
                        className={`w-full text-left px-3 py-3 border-b border-white/[0.04] flex gap-3 transition-colors ${
                          active ? 'bg-white/[0.08]' : 'hover:bg-white/[0.03]'
                        }`}
                      >
                        <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-neutral-700 to-neutral-800 border border-white/10 flex-shrink-0 overflow-hidden flex items-center justify-center">
                          {c.avatarUrl
                            ? <img src={c.avatarUrl} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                            : <span className="text-label font-bold text-neutral-400 uppercase">{c.handle[0] ?? '?'}</span>}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <span className={`text-sm text-white truncate ${c.unread ? 'font-semibold' : 'font-medium'}`}>@{c.handle}</span>
                            <span className="text-label text-neutral-400 flex-shrink-0">{timeAgo(c.lastMessageAt)}</span>
                          </div>
                          <p className="text-xs text-neutral-400 truncate mt-0.5">{c.lastMessageText ?? ''}</p>
                          <div className="flex items-center gap-1.5 mt-1.5 min-w-0">
                            <span className={`flex-none text-label px-1.5 py-0.5 rounded-full border font-medium ${QUALIFICATION_CLS[t.qualification]}`}>
                              {QUALIFICATION_LABEL[t.qualification]}
                            </span>
                            <span className={`text-label truncate ${t.priority === 'high' ? 'text-white' : 'text-neutral-400'}`}>
                              {t.nextAction}
                            </span>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </section>
              ))
            )}
          </div>
        </div>

        {/* ── Right: thread + composer ── */}
        <div className={`${selectedId ? 'flex' : 'hidden lg:flex'} flex-col flex-1 min-w-0 rounded-2xl border border-white/[0.08] bg-white/[0.02] overflow-hidden`}>
          {!selected ? (
            <div className="flex-1 flex flex-col items-center justify-center text-neutral-400 gap-3 p-8 text-center">
              <MessageSquare className="w-10 h-10 text-neutral-400" />
              <p className="text-sm">Select a conversation to view the thread and draft a reply.</p>
            </div>
          ) : (
            <>
              {/* Thread header */}
              <div className="px-4 py-3 border-b border-white/5 flex items-center gap-3 flex-shrink-0">
                <button type="button" onClick={() => setSelectedId(null)} aria-label="Back to conversations" className="lg:hidden p-1 -ml-1 text-neutral-400 hover:text-white">
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-neutral-700 to-neutral-800 border border-white/10 overflow-hidden flex items-center justify-center flex-shrink-0">
                  {selected.avatarUrl
                    ? <img src={selected.avatarUrl} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    : <span className="text-label font-bold text-neutral-400 uppercase">{selected.handle[0] ?? '?'}</span>}
                </div>
                <div className="min-w-0 flex-1">
                  <a href={`https://instagram.com/${selected.handle}`} target="_blank" rel="noreferrer" className="text-sm text-white font-medium hover:text-white truncate block">@{selected.handle}</a>
                  {selectedTriage ? (
                    <p className="text-label text-neutral-400 truncate flex items-center gap-1">
                      <ArrowRight className="w-3 h-3 flex-none" aria-hidden />
                      <span className={selectedTriage.priority === 'high' ? 'text-white' : ''}>{selectedTriage.nextAction}</span>
                    </p>
                  ) : selected.name && <p className="text-label text-neutral-400 truncate">{selected.name}</p>}
                </div>
                {selected.intent && (
                  <span className={`text-label px-2 py-1 rounded-full border font-medium ${INTENT_META[selected.intent].cls}`}>{INTENT_META[selected.intent].label}</span>
                )}
                {selected.status !== 'booked' && (
                  // Chrome, not `positive`: the control is the Operator's click,
                  // while the pill it produces is the funnel state. Colouring both
                  // it `positive` put a second accent beside the composer's one CTA.
                  <button onClick={setBooked} className="flex items-center gap-1 text-label px-2.5 py-1.5 rounded-lg border border-white/10 bg-white/5 text-neutral-300 hover:text-white hover:border-white/20 transition-colors">
                    <Calendar className="w-3 h-3" /> Booked
                  </button>
                )}
              </div>

              {/* Labels */}
              <div className="px-4 py-2 border-b border-white/5 flex items-center gap-1.5 flex-wrap flex-shrink-0">
                <Tag className="w-3 h-3 text-neutral-400" />
                {(selected.labels ?? []).map((l) => (
                  <span key={l} className="text-label px-2 py-0.5 rounded-full bg-white/[0.08] text-neutral-300 border border-white/10 flex items-center gap-1">
                    {l}
                    <button type="button" onClick={() => removeLabel(l)} aria-label={`Remove label ${l}`} className="p-0.5 -m-0.5 hover:text-danger-400"><X className="w-3 h-3" aria-hidden /></button>
                  </span>
                ))}
                <input
                  value={labelInput}
                  onChange={(e) => setLabelInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') addLabel(labelInput); }}
                  placeholder="Add label"
                  className="text-label bg-transparent border-none focus:outline-none text-neutral-300 placeholder:text-neutral-500 w-20"
                />
                {QUICK_LABELS.filter((q) => !(selected.labels ?? []).some((l) => l.toLowerCase() === q.toLowerCase())).slice(0, 3).map((q) => (
                  <button key={q} onClick={() => addLabel(q)} className="text-label px-1.5 py-0.5 rounded-full text-neutral-400 border border-dashed border-white/10 hover:text-white hover:border-white/30">+ {q}</button>
                ))}
              </div>

              <DealPanel
                conversation={selected}
                lead={selectedLead}
                onSave={(change) => onSaveDeal(selected, change)}
              />

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
                {thread.map((m) => (
                  <div key={m.id} className={`flex ${m.direction === 'out' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[75%] px-3.5 py-2 rounded-2xl text-sm leading-relaxed ${
                      m.direction === 'out'
                        ? 'bg-white/15 text-white border border-white/20 rounded-br-md'
                        : 'bg-white/5 text-neutral-200 border border-white/[0.08] rounded-bl-md'
                    }`}>
                      {m.text}
                      <div className={`text-label mt-1 ${m.direction === 'out' ? 'text-white/50' : 'text-neutral-400'}`}>{timeAgo(m.createdAt)}</div>
                    </div>
                  </div>
                ))}
                {thread.length === 0 && (
                  <div className="text-center text-neutral-400 text-sm py-8">No messages synced for this thread yet.</div>
                )}
              </div>

              {/* Copilot + composer */}
              <div className="flex-shrink-0">
              <Copilot
                key={`${selected.id}:${selected.lastMessageAt ?? ''}`}
                threadKey={`${selected.id}:${selected.lastMessageAt ?? ''}`}
                cache={copilotCache}
                auto={selected.needsReply && selectedTriage?.qualification !== 'unqualified'}
                generate={generateFor}
                onPick={setDraft}
              />
              <div className="p-3 space-y-2">
                <textarea
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  rows={3}
                  placeholder="Write a reply, or pick one of the copilot's…"
                  className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/[0.08] text-sm text-white placeholder:text-neutral-500 focus:outline-none focus:border-white/40 resize-none"
                />
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleSend}
                    disabled={!draft.trim()}
                    className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-white text-surface text-xs font-semibold hover:bg-neutral-200 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <Send className="w-3.5 h-3.5" /> Approve &amp; Send
                  </button>
                </div>
                <p className="text-label text-neutral-400">The extension sends this reply from your logged-in Instagram, paced by your DM delay.</p>
              </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
