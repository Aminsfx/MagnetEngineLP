import React, { useMemo, useState } from 'react';
import {
  Inbox as InboxIcon, Send, Sparkles, Loader2, Search, Tag, X,
  Bot, Calendar, MessageSquare, ChevronLeft,
} from 'lucide-react';
import type { Conversation, Message, AppConfig, ConversationIntent } from '../../lib/types';
import type { ReplyResult } from '../../lib/api';
import { useToast } from '../common/Toast';

interface InboxViewProps {
  conversations: Conversation[];
  messages: Message[];
  config: AppConfig;
  onGenerateReply: (conv: Conversation) => Promise<ReplyResult>;
  onSendReply: (conv: Conversation, text: string) => Promise<void> | void;
  onUpdateConversation: (conv: Conversation) => void;
  onUpdateConfig: (config: AppConfig) => Promise<void> | void;
}

type Filter = 'all' | 'needs_reply' | 'interested' | 'booked';

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
  interested:     { label: 'Interested',     cls: 'text-info-300 border-info-500/30 bg-info-500/10' },
  booked:         { label: 'Booked',         cls: 'text-positive-300 border-positive-500/30 bg-positive-500/10' },
  objection:      { label: 'Objection',      cls: 'text-caution-300 border-caution-500/30 bg-caution-500/10' },
  not_interested: { label: 'Not interested', cls: 'text-neutral-500 border-white/10 bg-white/5' },
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
  conversations, messages, config, onGenerateReply, onSendReply, onUpdateConversation, onUpdateConfig,
}) => {
  const toast = useToast();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>('all');
  const [search, setSearch] = useState('');
  const [draft, setDraft] = useState('');
  const [generating, setGenerating] = useState(false);
  const [labelInput, setLabelInput] = useState('');

  const counts = useMemo(() => ({
    all: conversations.length,
    needs_reply: conversations.filter((c) => c.needsReply).length,
    interested: conversations.filter((c) => c.intent === 'interested').length,
    booked: conversations.filter((c) => c.status === 'booked' || c.intent === 'booked').length,
  }), [conversations]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return conversations
      .filter((c) => {
        if (filter === 'needs_reply' && !c.needsReply) return false;
        if (filter === 'interested' && c.intent !== 'interested') return false;
        if (filter === 'booked' && c.status !== 'booked' && c.intent !== 'booked') return false;
        if (q && !c.handle.toLowerCase().includes(q) && !(c.name ?? '').toLowerCase().includes(q)) return false;
        return true;
      })
      .sort((a, b) => (b.lastMessageAt ?? '').localeCompare(a.lastMessageAt ?? ''));
  }, [conversations, filter, search]);

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

  const openConversation = (c: Conversation) => {
    setSelectedId(c.id);
    setDraft('');
    setLabelInput('');
    if (c.unread) onUpdateConversation({ ...c, unread: false });
  };

  const handleGenerate = async () => {
    if (!selected) return;
    setGenerating(true);
    try {
      const result = await onGenerateReply(selected);
      setDraft(result.reply);
      const meta = INTENT_META[result.intent];
      if (meta) toast.info(`Draft ready · ${meta.label}`);
    } catch (e: any) {
      toast.error(`Couldn't generate a reply: ${e?.message ?? 'unknown error'}`);
    } finally {
      setGenerating(false);
    }
  };

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
    toast.success(`@${selected.handle} marked as booked 🎉`);
  };

  const toggleAutopilot = () => {
    onUpdateConfig({ ...config, autopilot: !config.autopilot });
  };

  const filterTabs: Array<{ key: Filter; label: string }> = [
    { key: 'all', label: 'All' },
    { key: 'needs_reply', label: 'Needs reply' },
    { key: 'interested', label: 'Interested' },
    { key: 'booked', label: 'Booked' },
  ];

  return (
    <div className="flex flex-col h-full">
      {/* Header row */}
      <div className="flex items-start justify-between gap-4 mb-4 flex-shrink-0">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-white/[0.08] bg-white/[0.04] text-[10px] font-semibold tracking-[0.2em] text-neutral-500 uppercase mb-3">
            Conversations
          </div>
          <h1 className="text-2xl font-semibold text-white tracking-tight leading-none">Inbox</h1>
          <p className="text-neutral-600 text-sm mt-1.5">Every reply in one place — the AI drafts responses and books calls for you.</p>
        </div>
        {/* Autopilot toggle */}
        <button
          onClick={toggleAutopilot}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl border text-xs font-medium transition-colors flex-shrink-0 ${
            config.autopilot
              ? 'text-brand-300 border-brand-500/40 bg-brand-500/10'
              : 'text-neutral-400 border-white/10 bg-white/5 hover:text-white'
          }`}
          title="When on, the AI auto-replies to new inbound DMs while this tab is open"
        >
          <Bot className="w-4 h-4" />
          Autopilot {config.autopilot ? 'ON' : 'OFF'}
        </button>
      </div>

      {config.autopilot && (
        <div className="mb-3 px-3.5 py-2 rounded-xl border border-brand-500/25 bg-brand-500/[0.08] text-brand-300/90 text-[12px] flex items-center gap-2 flex-shrink-0">
          <span className="relative flex h-1.5 w-1.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-brand-500" />
          </span>
          Autopilot is replying automatically while this tab stays open. Close it to pause.
        </div>
      )}

      {/* Two-pane */}
      <div className="flex flex-1 min-h-0 gap-4">
        {/* ── Left: thread list ── */}
        <div className={`${selectedId ? 'hidden lg:flex' : 'flex'} flex-col w-full lg:w-[340px] flex-shrink-0 rounded-2xl border border-white/[0.08] bg-white/[0.02] overflow-hidden`}>
          {/* Search + filters */}
          <div className="p-3 border-b border-white/5 space-y-2.5">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-neutral-600 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search @handle or name"
                className="w-full pl-9 pr-3 py-2 rounded-lg bg-white/5 border border-white/[0.08] text-sm text-white placeholder:text-neutral-600 focus:outline-none focus:border-brand-500/40"
              />
            </div>
            <div className="flex flex-wrap gap-1.5">
              {filterTabs.map((t) => (
                <button
                  key={t.key}
                  onClick={() => setFilter(t.key)}
                  className={`px-2.5 py-1 rounded-full text-[11px] font-medium border transition-colors ${
                    filter === t.key
                      ? 'text-brand-300 border-brand-500/30 bg-brand-500/10'
                      : 'text-neutral-500 border-white/[0.08] bg-transparent hover:text-white'
                  }`}
                >
                  {t.label} <span className="opacity-60">{counts[t.key]}</span>
                </button>
              ))}
            </div>
          </div>

          {/* List */}
          <div className="flex-1 overflow-y-auto">
            {filtered.length === 0 ? (
              <div className="p-8 text-center text-neutral-600 text-sm flex flex-col items-center gap-3">
                <InboxIcon className="w-8 h-8 text-neutral-700" />
                {conversations.length === 0
                  ? 'No conversations yet. Keep Instagram open in another tab with the MagnetEngine extension running — replies to your DMs will show up here.'
                  : 'No conversations match this filter.'}
              </div>
            ) : (
              filtered.map((c) => {
                const active = c.id === selectedId;
                return (
                  <button
                    key={c.id}
                    onClick={() => openConversation(c)}
                    className={`w-full text-left px-3 py-3 border-b border-white/[0.04] flex gap-3 transition-colors ${
                      active ? 'bg-brand-500/[0.08]' : 'hover:bg-white/[0.03]'
                    }`}
                  >
                    <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-neutral-700 to-neutral-800 border border-white/10 flex-shrink-0 overflow-hidden flex items-center justify-center">
                      {c.avatarUrl
                        ? <img src={c.avatarUrl} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        : <span className="text-[11px] font-bold text-neutral-400 uppercase">{c.handle[0] ?? '?'}</span>}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm text-white font-medium truncate">@{c.handle}</span>
                        <span className="text-[10px] text-neutral-600 flex-shrink-0">{timeAgo(c.lastMessageAt)}</span>
                      </div>
                      <p className="text-[12px] text-neutral-500 truncate mt-0.5">{c.lastMessageText ?? ''}</p>
                      <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                        {c.needsReply && (
                          <span className="text-[9px] px-1.5 py-0.5 rounded-full text-caution-300 border border-caution-500/30 bg-caution-500/10 font-medium">Needs reply</span>
                        )}
                        {c.intent && (
                          <span className={`text-[9px] px-1.5 py-0.5 rounded-full border font-medium ${INTENT_META[c.intent].cls}`}>{INTENT_META[c.intent].label}</span>
                        )}
                        {c.account && (
                          <span className="text-[9px] px-1.5 py-0.5 rounded-full text-neutral-500 border border-white/[0.08]">{c.account}</span>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* ── Right: thread + composer ── */}
        <div className={`${selectedId ? 'flex' : 'hidden lg:flex'} flex-col flex-1 min-w-0 rounded-2xl border border-white/[0.08] bg-white/[0.02] overflow-hidden`}>
          {!selected ? (
            <div className="flex-1 flex flex-col items-center justify-center text-neutral-600 gap-3 p-8 text-center">
              <MessageSquare className="w-10 h-10 text-neutral-700" />
              <p className="text-sm">Select a conversation to view the thread and draft a reply.</p>
            </div>
          ) : (
            <>
              {/* Thread header */}
              <div className="px-4 py-3 border-b border-white/5 flex items-center gap-3 flex-shrink-0">
                <button onClick={() => setSelectedId(null)} className="lg:hidden p-1 -ml-1 text-neutral-400 hover:text-white">
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-neutral-700 to-neutral-800 border border-white/10 overflow-hidden flex items-center justify-center flex-shrink-0">
                  {selected.avatarUrl
                    ? <img src={selected.avatarUrl} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    : <span className="text-[10px] font-bold text-neutral-400 uppercase">{selected.handle[0] ?? '?'}</span>}
                </div>
                <div className="min-w-0 flex-1">
                  <a href={`https://instagram.com/${selected.handle}`} target="_blank" rel="noreferrer" className="text-sm text-white font-medium hover:text-brand-300 truncate block">@{selected.handle}</a>
                  {selected.name && <p className="text-[11px] text-neutral-600 truncate">{selected.name}</p>}
                </div>
                {selected.intent && (
                  <span className={`text-[10px] px-2 py-1 rounded-full border font-medium ${INTENT_META[selected.intent].cls}`}>{INTENT_META[selected.intent].label}</span>
                )}
                {selected.status !== 'booked' && (
                  // Chrome, not `positive`: the control is the Operator's click,
                  // while the pill it produces is the funnel state. Colouring both
                  // emerald put a second accent beside the composer's one CTA.
                  <button onClick={setBooked} className="flex items-center gap-1 text-[11px] px-2.5 py-1.5 rounded-lg border border-white/10 bg-white/5 text-neutral-300 hover:text-white hover:border-white/20 transition-colors">
                    <Calendar className="w-3 h-3" /> Booked
                  </button>
                )}
              </div>

              {/* Labels */}
              <div className="px-4 py-2 border-b border-white/5 flex items-center gap-1.5 flex-wrap flex-shrink-0">
                <Tag className="w-3 h-3 text-neutral-600" />
                {(selected.labels ?? []).map((l) => (
                  <span key={l} className="text-[10px] px-2 py-0.5 rounded-full bg-white/[0.08] text-neutral-300 border border-white/10 flex items-center gap-1">
                    {l}
                    <button onClick={() => removeLabel(l)} className="hover:text-danger-400"><X className="w-2.5 h-2.5" /></button>
                  </span>
                ))}
                <input
                  value={labelInput}
                  onChange={(e) => setLabelInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') addLabel(labelInput); }}
                  placeholder="Add label"
                  className="text-[11px] bg-transparent border-none focus:outline-none text-neutral-300 placeholder:text-neutral-600 w-20"
                />
                {QUICK_LABELS.filter((q) => !(selected.labels ?? []).some((l) => l.toLowerCase() === q.toLowerCase())).slice(0, 3).map((q) => (
                  <button key={q} onClick={() => addLabel(q)} className="text-[10px] px-1.5 py-0.5 rounded-full text-neutral-600 border border-dashed border-white/10 hover:text-brand-300 hover:border-brand-500/30">+ {q}</button>
                ))}
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
                {thread.map((m) => (
                  <div key={m.id} className={`flex ${m.direction === 'out' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[75%] px-3.5 py-2 rounded-2xl text-sm leading-relaxed ${
                      m.direction === 'out'
                        ? 'bg-brand-500/15 text-brand-50 border border-brand-500/20 rounded-br-md'
                        : 'bg-white/5 text-neutral-200 border border-white/[0.08] rounded-bl-md'
                    }`}>
                      {m.text}
                      <div className={`text-[9px] mt-1 ${m.direction === 'out' ? 'text-brand-300/50' : 'text-neutral-600'}`}>{timeAgo(m.createdAt)}</div>
                    </div>
                  </div>
                ))}
                {thread.length === 0 && (
                  <div className="text-center text-neutral-600 text-sm py-8">No messages synced for this thread yet.</div>
                )}
              </div>

              {/* Composer + AI draft */}
              <div className="border-t border-white/5 p-3 flex-shrink-0 space-y-2">
                <textarea
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  rows={2}
                  placeholder="Write a reply, or let the AI draft one…"
                  className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/[0.08] text-sm text-white placeholder:text-neutral-600 focus:outline-none focus:border-brand-500/40 resize-none"
                />
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleGenerate}
                    disabled={generating}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-white/10 bg-white/5 text-neutral-300 text-xs font-medium hover:text-white hover:border-info-500/30 transition-colors disabled:opacity-50"
                  >
                    {generating ? <Loader2 className="w-3.5 h-3.5 animate-spin text-info-400" /> : <Sparkles className="w-3.5 h-3.5 text-info-400" />}
                    {generating ? 'Drafting…' : 'AI draft'}
                  </button>
                  <button
                    onClick={handleSend}
                    disabled={!draft.trim()}
                    className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-brand-500 text-brand-950 text-xs font-semibold hover:bg-brand-400 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <Send className="w-3.5 h-3.5" /> Approve &amp; Send
                  </button>
                </div>
                <p className="text-[10px] text-neutral-600">The extension sends this reply from your logged-in Instagram, paced by your DM delay.</p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
