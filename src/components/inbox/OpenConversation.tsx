import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Send, Tag, X, Calendar, Check, ArrowRight, ArrowUpRight, Plus } from 'lucide-react';
import type { Conversation, Lead, Message } from '../../lib/types';
import type { ReplyResult } from '../../lib/api';
import type { Suggestion } from '../../lib/copilot';
import type { Triage } from '../../lib/triage';
import { useToast } from '../common/Toast';
import { posthogCapture } from '../../lib/posthog';
import { Copilot, ROW_PILL } from './Copilot';
import { DealPanel } from './DealPanel';
import { timeAgo } from './ConversationRow';

/** The open row's one white pill (DESIGN.md: one white pill per action group). */
const PRIMARY = 'inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white text-surface text-meta font-semibold hover:bg-neutral-100 transition-colors disabled:opacity-40 disabled:pointer-events-none whitespace-nowrap';
const GHOST = 'inline-flex items-center gap-2 px-3.5 py-2 rounded-full border border-white/12 text-meta font-medium text-neutral-200 hover:text-white hover:border-white/30 hover:bg-white/[0.04] transition-colors whitespace-nowrap';
/**
 * The global keyboard ring (index.css), drawn on plain :focus. The pill after
 * a send takes focus from script, and Chrome won't count a Ctrl+Enter shortcut
 * as keyboard use, so :focus-visible would leave the Operator guessing where
 * Enter goes.
 */
const AFTER_SEND_RING = 'focus:outline focus:outline-2 focus:outline-offset-[3px] focus:outline-neutral-200';

const QUICK_LABELS = ['Hot', 'Warm', 'Call booked', 'Follow up', 'Not now'];

/** Messages shown when a conversation opens; the rest are one click up. */
const THREAD_TAIL = 6;

const IS_MAC = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform);

/**
 * An open conversation, unfolded under its row: the latest messages, the
 * copilot's three replies, the composer, and a bar for Booked, the deal and
 * labels. Mount it with `key={conversation.id}` — the draft belongs to one
 * conversation.
 *
 * After a reply is handed to the extension the composer offers the next
 * conversation that needs the Operator as its one white pill, so a run through
 * the Inbox is reply, send, next.
 */
export const OpenConversation: React.FC<{
  conversation: Conversation;
  triage: Triage;
  /** This conversation's messages, oldest first. */
  thread: Message[];
  lead: Lead | undefined;
  copilotCache: Map<string, Suggestion[]>;
  generate: (instruction?: string) => Promise<ReplyResult>;
  /** Hands the reply to the extension; false when it was refused (the reason is already on screen). */
  onSend: (text: string) => Promise<boolean>;
  onUpdate: (c: Conversation) => void;
  onSaveDeal: (change: (lead: Lead) => Lead) => void;
  /** The conversation to offer once a reply goes out, if any still needs the Operator. */
  next: Conversation | null;
  onNext: () => void;
  onClose: () => void;
}> = ({ conversation: c, triage: t, thread, lead, copilotCache, generate, onSend, onUpdate, onSaveDeal, next, onNext, onClose }) => {
  const toast = useToast();
  const [draft, setDraft] = useState('');
  const [labelInput, setLabelInput] = useState('');
  const [sending, setSending] = useState(false);
  /** A reply went out and the composer hasn't been touched since. */
  const [sent, setSent] = useState(false);
  const [showAll, setShowAll] = useState(false);
  /** Whether the copilot has replies on screen, so the composer's hint can point at them. */
  const [replies, setReplies] = useState(false);
  const composer = useRef<HTMLTextAreaElement>(null);
  const after = useRef<HTMLButtonElement>(null);

  // Send, then Next, without the mouse: once a reply is handed off, the pill
  // that follows (Next, or Close when no one else is waiting) takes focus.
  useEffect(() => {
    if (sent) after.current?.focus({ preventScroll: true });
  }, [sent]);

  const earlier = showAll ? 0 : Math.max(0, thread.length - THREAD_TAIL);
  const shown = useMemo(() => thread.slice(earlier), [thread, earlier]);
  const threadKey = `${c.id}:${c.lastMessageAt ?? ''}`;
  const booked = c.status === 'booked' || !!lead?.booked;
  const labels = c.labels ?? [];

  const type = (text: string) => {
    setDraft(text);
    setSent(false);
  };

  const pick = (text: string) => {
    type(text);
    composer.current?.focus();
  };

  const send = async () => {
    const text = draft.trim();
    if (!text || sending) return;
    setSending(true);
    try {
      if (await onSend(text)) {
        setDraft('');
        setSent(true);
      }
    } finally {
      setSending(false);
    }
  };

  const addLabel = (raw: string) => {
    const label = raw.trim();
    if (!label || labels.some((l) => l.toLowerCase() === label.toLowerCase())) return;
    onUpdate({ ...c, labels: [...labels, label] });
    setLabelInput('');
  };

  const removeLabel = (label: string) => onUpdate({ ...c, labels: labels.filter((l) => l !== label) });

  const markBooked = () => {
    onUpdate({ ...c, status: 'booked', intent: 'booked' });
    posthogCapture('conversation_marked_booked');
    toast.success(`@${c.handle} marked as booked`);
  };

  const quick = QUICK_LABELS.filter((q) => !labels.some((l) => l.toLowerCase() === q.toLowerCase())).slice(0, 3);

  return (
    <div
      id={`conversation-${c.id}`}
      role="region"
      aria-label={`Conversation with @${c.handle}`}
      className="queue-settle border-t border-white/[0.06] bg-white/[0.015] px-4 md:px-5 pt-4 pb-5 space-y-5"
    >
      {/* ── Thread ── */}
      <ol aria-label="Messages" className="space-y-2">
        {earlier > 0 && (
          <li className="flex justify-center">
            <button
              type="button"
              onClick={() => setShowAll(true)}
              className="text-meta font-medium text-neutral-400 hover:text-white transition-colors"
            >
              Show {earlier} earlier {earlier === 1 ? 'message' : 'messages'}
            </button>
          </li>
        )}
        {shown.map((m) => {
          const out = m.direction === 'out';
          return (
            <li key={m.id} className={`flex ${out ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[min(36rem,85%)] px-3.5 py-2 text-body-sm leading-relaxed border ${
                out
                  ? 'bg-white/[0.12] border-white/15 text-white rounded-[1.1rem] rounded-br-[0.35rem]'
                  : 'bg-white/[0.04] border-white/[0.08] text-neutral-100 rounded-[1.1rem] rounded-bl-[0.35rem]'
              }`}>
                <span className="sr-only">{out ? 'You: ' : `@${c.handle}: `}</span>
                <span className="whitespace-pre-wrap">{m.text}</span>
                <time dateTime={m.createdAt} className={`block mt-0.5 font-mono text-label tabular-nums ${out ? 'text-right text-white/60' : 'text-neutral-400'}`}>
                  {timeAgo(m.createdAt)}
                </time>
              </div>
            </li>
          );
        })}
        {thread.length === 0 && (
          <li className="text-center text-meta text-neutral-400 py-4">No messages synced for this thread yet.</li>
        )}
      </ol>

      {/* ── Copilot ── */}
      <Copilot
        key={threadKey}
        threadKey={threadKey}
        cache={copilotCache}
        auto={!!c.needsReply && t.qualification !== 'unqualified'}
        generate={generate}
        onPick={pick}
        onShown={setReplies}
      />

      {/* ── Composer ── */}
      <div id={`composer-${c.id}`}>
        <label htmlFor={`reply-${c.id}`} className="block text-meta font-medium text-neutral-300 mb-1.5">Your reply</label>
        <textarea
          id={`reply-${c.id}`}
          ref={composer}
          value={draft}
          onChange={(e) => type(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); void send(); }
          }}
          rows={3}
          placeholder={replies ? 'Write a reply, or use one of the suggestions above…' : 'Write a reply…'}
          className="w-full px-4 py-3 rounded-2xl bg-white/[0.03] border border-white/[0.08] text-body-sm text-white placeholder:text-neutral-500 focus:outline-none focus:border-white/40 focus:ring-2 focus:ring-white/10 resize-y min-h-[5.5rem] transition-colors"
        />
        <div className="mt-2.5 flex flex-wrap items-center justify-end gap-x-4 gap-y-2.5">
          {sent && !draft ? (
            <p role="status" className="queue-settle mr-auto flex items-center gap-1.5 text-meta text-neutral-200">
              <Check className="w-4 h-4 text-white flex-none" aria-hidden />
              {next
                ? 'Reply handed to the extension. It goes out from your Instagram, paced by your DM delay.'
                : 'Reply handed to the extension. That’s everyone who needs you for now.'}
            </p>
          ) : (
            <p className="mr-auto text-label text-neutral-400">
              The extension sends it from your logged-in Instagram, paced by your DM delay.{' '}
              <span className="max-md:hidden">
                <kbd className="font-mono text-neutral-300">{IS_MAC ? '⌘' : 'Ctrl'}</kbd> + <kbd className="font-mono text-neutral-300">Enter</kbd> sends.
              </span>
            </p>
          )}
          {sent && !draft ? (
            next ? (
              <button ref={after} type="button" onClick={onNext} className={`${PRIMARY} ${AFTER_SEND_RING}`}>
                Next: <span className="font-mono">@{next.handle}</span> <ArrowRight className="w-4 h-4" aria-hidden />
              </button>
            ) : (
              <button ref={after} type="button" onClick={onClose} className={`${GHOST} ${AFTER_SEND_RING}`}>
                Close
              </button>
            )
          ) : (
            <button type="button" onClick={() => void send()} disabled={!draft.trim() || sending} className={PRIMARY}>
              <Send className="w-4 h-4" aria-hidden /> Approve &amp; Send
            </button>
          )}
        </div>
      </div>

      {/* ── Booked, deal, labels ── */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-3 pt-4 border-t border-white/[0.06]">
        {booked ? (
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-positive-500/30 bg-positive-500/10 text-meta font-medium text-positive-300">
            <Calendar className="w-3.5 h-3.5" aria-hidden /> Booked
          </span>
        ) : (
          // Chrome, not `positive`: the control is the Operator's click, while
          // the pill it produces is the funnel state.
          <button type="button" onClick={markBooked} className={ROW_PILL}>
            <Calendar className="w-3.5 h-3.5" aria-hidden /> Mark booked
          </button>
        )}

        <DealPanel conversation={c} lead={lead} onSave={onSaveDeal} />

        <div className="flex flex-wrap items-center gap-1.5 min-w-0">
          <Tag className="w-3.5 h-3.5 text-neutral-400" aria-hidden />
          {labels.map((l) => (
            <span key={l} className="inline-flex items-center gap-1 pl-2.5 pr-1.5 py-1 rounded-full border border-white/12 bg-white/[0.05] text-label font-medium text-neutral-200">
              {l}
              <button type="button" onClick={() => removeLabel(l)} aria-label={`Remove label ${l}`} className="p-0.5 rounded-full text-neutral-400 hover:text-danger-300">
                <X className="w-3 h-3" aria-hidden />
              </button>
            </span>
          ))}
          <input
            value={labelInput}
            onChange={(e) => setLabelInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') addLabel(labelInput); }}
            aria-label="Add a label"
            placeholder="Add label"
            className="w-24 px-2.5 py-1 rounded-full bg-transparent border border-transparent text-label text-neutral-200 placeholder:text-neutral-500 focus:outline-none focus:border-white/25"
          />
          {quick.map((q) => (
            <button
              key={q}
              type="button"
              onClick={() => addLabel(q)}
              className="inline-flex items-center gap-1 pl-2 pr-2.5 py-1 rounded-full border border-dashed border-white/15 text-label font-medium text-neutral-400 hover:text-white hover:border-white/30 transition-colors"
            >
              <Plus className="w-3 h-3" aria-hidden /> {q}
            </button>
          ))}
        </div>

        <a
          href={`https://instagram.com/${c.handle}`}
          target="_blank"
          rel="noreferrer"
          className="ml-auto inline-flex items-center gap-1 text-meta font-medium text-neutral-400 hover:text-white transition-colors"
        >
          Instagram profile <ArrowUpRight className="w-3.5 h-3.5" aria-hidden />
        </a>
      </div>
    </div>
  );
};
