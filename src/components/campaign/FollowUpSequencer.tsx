import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Plus, Trash2, Save, Play, Pause, CalendarClock, ChevronDown, Info, CheckCircle2, AlertCircle, Send } from 'lucide-react';
import { FollowUpStep, FollowUpSequence, FollowUpCondition, AppConfig, Lead } from '../../lib/types';
import { CARD_BEZEL } from '../../lib/theme';
import type { WorkspaceStore } from '../../lib/store';
import { buildFollowUpLadder, buildRescueLadder, migrateSequence } from '../../lib/prompt';
import { computeDueFollowUps, renderTemplate, type DueFollowUp } from '../../lib/followups';

const DELAY_OPTIONS = [1, 2, 3, 4, 5, 7, 10, 14];
const CONDITION_LABELS: Record<FollowUpCondition, string> = {
  no_reply: 'Only if no reply',
  always: 'Always send',
  replied_not_booked: 'Only if they replied but never booked',
};

/**
 * The two ladders, and why there are two.
 *
 * One follows a Lead who never answered; the other follows a Lead who answered
 * and then went quiet. They are different jobs — the first needs a new reason
 * to write, the second needs a smaller ask — and until `replied_not_booked`
 * existed only the first was reachable at all.
 *
 * A sequence is classified by what its steps actually do rather than by a
 * column, so no table change was needed to hold two of them. A sequence IS the
 * thing its conditions describe.
 */
type LadderKind = 'no_reply' | 'rescue';

const LADDERS: Record<LadderKind, {
  tab: string;
  title: string;
  blurb: string;
  build: (config: AppConfig) => FollowUpStep[];
}> = {
  no_reply: {
    tab: 'No reply',
    title: 'Never answered',
    blurb: 'New angle on day 3, something useful on day 7, permission to close the file on day 14. Each touch changes the ask — none of them repeats it.',
    build: buildFollowUpLadder,
  },
  rescue: {
    tab: 'Replied, no booking',
    title: 'Answered, then went quiet',
    blurb: 'Your warmest segment, and nothing reached it before. Counts from the day they replied, and steps the ask down each time: a couple of times → answer it here → a date.',
    build: buildRescueLadder,
  },
};

const KINDS = Object.keys(LADDERS) as LadderKind[];

function kindOf(sequence: FollowUpSequence): LadderKind {
  return sequence.steps.some((s) => s.condition === 'replied_not_booked') ? 'rescue' : 'no_reply';
}

function generateId() {
  return Math.random().toString(36).slice(2, 10);
}

/** A blank step, shaped for the ladder it is being added to. */
function createStep(kind: LadderKind, index: number): FollowUpStep {
  const ladder = LADDERS[kind].build({} as AppConfig);
  const seed = ladder[index] ?? ladder[ladder.length - 1];
  return { ...seed, id: generateId(), messageTemplate: '' };
}

interface SaveState { type: 'idle' | 'saving' | 'saved' | 'error'; message?: string }

interface FollowUpSequencerProps {
  leads: Lead[];
  config: AppConfig;
  store: WorkspaceStore;
  onSendFollowUps: (due: DueFollowUp[]) => Promise<number>;
}

export const FollowUpSequencer: React.FC<FollowUpSequencerProps> = ({ leads, config, store, onSendFollowUps }) => {
  const [sequences, setSequences] = useState<Record<LadderKind, FollowUpSequence | null>>({
    no_reply: null,
    rescue: null,
  });
  const [kind, setKind] = useState<LadderKind>('no_reply');
  const [saveState, setSaveState] = useState<SaveState>({ type: 'idle' });
  const [previewHandle, setPreviewHandle] = useState('johndoe');
  const [previewName, setPreviewName] = useState('John');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  const activeSeq = sequences[kind];

  /**
   * Everything due across BOTH ladders, from the CURRENT (possibly unsaved)
   * sequences, so what the Operator sees is exactly what sends.
   *
   * Deduped by Lead: the two conditions are mutually exclusive by construction
   * (`no_reply` needs `!replied`, `replied_not_booked` needs `replied`), but an
   * Operator can set a step to "Always send" and collide them, and sending one
   * Lead two DMs in the same batch is not a thing we let happen by accident.
   */
  const due = useMemo(() => {
    const seen = new Set<string>();
    const all: DueFollowUp[] = [];
    for (const k of KINDS) {
      for (const d of computeDueFollowUps(leads, sequences[k], new Date(), config)) {
        if (seen.has(d.lead.id)) continue;
        seen.add(d.lead.id);
        all.push(d);
      }
    }
    return all;
  }, [leads, sequences, config]);

  const dueHere = useMemo(
    () => computeDueFollowUps(leads, activeSeq, new Date(), config),
    [leads, activeSeq, config],
  );

  const handleSendDue = async () => {
    if (due.length === 0 || sending) return;
    setSending(true);
    try {
      await onSendFollowUps(due);
    } finally {
      setSending(false);
    }
  };

  // Load both ladders, bring stored copy forward, seed whichever is missing.
  useEffect(() => {
    let cancelled = false;
    store.loadSequences().then((stored) => {
      if (cancelled) return;
      const next: Record<LadderKind, FollowUpSequence | null> = { no_reply: null, rescue: null };

      for (const seq of stored) {
        const migrated = migrateSequence(seq, config);
        // A sequence whose copy we just brought forward is worth persisting —
        // otherwise the Operator sees the new ladder and the database keeps the
        // old one until they happen to press Save.
        if (migrated !== seq) store.saveSequence(migrated).catch(console.error);
        next[kindOf(migrated)] = migrated;
      }

      for (const k of KINDS) {
        if (next[k]) continue;
        next[k] = {
          id: `new-${k}`,
          steps: LADDERS[k].build(config),
          // The rescue ladder starts paused on purpose. Switching it on messages
          // people who already replied to you, retroactively, and that is the
          // Operator's call to make deliberately rather than ours to make for
          // them the first time this page loads.
          active: k === 'no_reply',
        };
      }

      setSequences(next);
      setLoading(false);
    });
    return () => { cancelled = true; };
    // Config is read for the Offer Ledger at seed time only; re-seeding on every
    // keystroke in Settings would throw away unsaved step edits.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [store]);

  const patchActive = useCallback((patch: Partial<FollowUpSequence>) => {
    setSequences((prev) => {
      const current = prev[kind];
      return current ? { ...prev, [kind]: { ...current, ...patch } } : prev;
    });
  }, [kind]);

  const handleAddStep = () => {
    if (!activeSeq || activeSeq.steps.length >= 3) return;
    patchActive({ steps: [...activeSeq.steps, createStep(kind, activeSeq.steps.length)] });
  };

  const handleRemoveStep = (stepId: string) => {
    if (!activeSeq) return;
    patchActive({ steps: activeSeq.steps.filter((s) => s.id !== stepId) });
  };

  const handleUpdateStep = (stepId: string, field: keyof FollowUpStep, value: unknown) => {
    if (!activeSeq) return;
    patchActive({
      steps: activeSeq.steps.map((s) => (s.id === stepId ? { ...s, [field]: value } : s)),
    });
  };

  const handleResetCopy = () => {
    if (!activeSeq) return;
    const ladder = LADDERS[kind].build(config);
    patchActive({
      steps: activeSeq.steps.map((s, i) =>
        ladder[i] ? { ...s, messageTemplate: ladder[i].messageTemplate } : s,
      ),
    });
  };

  const handleToggleActive = () => {
    if (!activeSeq) return;
    patchActive({ active: !activeSeq.active });
  };

  const handleSave = useCallback(async () => {
    if (!activeSeq) return;
    setSaveState({ type: 'saving' });

    try {
      const saved = await store.saveSequence(activeSeq);
      if (saved) {
        setSequences((prev) => ({ ...prev, [kind]: saved }));
        setSaveState({ type: 'saved', message: 'Sequence saved' });
      } else {
        setSaveState({ type: 'error', message: 'Save failed — check console' });
      }
    } catch {
      setSaveState({ type: 'error', message: 'Unexpected error' });
    }

    setTimeout(() => setSaveState({ type: 'idle' }), 3000);
  }, [activeSeq, kind, store]);

  /**
   * Preview through the real renderer, with the real Offer Ledger.
   *
   * The old preview did its own two-token string replace, so it could not show
   * the thing most worth seeing: a sentence disappearing because the Ledger
   * field behind it is still empty.
   */
  const previewLead = useMemo(
    () => ({ handle: previewHandle, name: previewName } as Lead),
    [previewHandle, previewName],
  );
  const renderPreview = (template: string) => renderTemplate(template, previewLead, config);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48 text-neutral-400 text-sm">
        <div className="animate-spin w-4 h-4 border-2 border-white/30 border-t-white/20 rounded-full mr-3" />
        Loading sequences…
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ── Due follow-ups panel ─────────────────────────────────────── */}
      <div className="rounded-[1.5rem] p-[1px]" style={CARD_BEZEL.outer}>
        <div className="bg-surface-sunken rounded-[calc(1.5rem-1px)] p-6" style={CARD_BEZEL.inner}>
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-neutral-500/10 border border-neutral-500/20 flex items-center justify-center">
                <CalendarClock className="w-4 h-4 text-neutral-400" />
              </div>
              <div>
                <p className="text-label font-semibold tracking-[0.2em] text-neutral-400 uppercase">Due follow-ups</p>
                <p className="text-sm text-white font-semibold leading-none mt-1">
                  {due.length > 0
                    ? `${due.length} lead${due.length !== 1 ? 's' : ''} ${due.length === 1 ? 'is' : 'are'} due a touch`
                    : 'Nothing due right now'}
                </p>
              </div>
            </div>
            <button
              id="send-due-followups-btn"
              onClick={handleSendDue}
              disabled={due.length === 0 || sending}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold bg-white hover:bg-neutral-200 text-surface transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {sending
                ? <div aria-hidden className="w-3.5 h-3.5 border-2 border-surface/25 border-t-surface rounded-full animate-spin" />
                : <Send className="w-3.5 h-3.5" />}
              Send due follow-ups ({due.length})
            </button>
          </div>

          {due.length > 0 && (
            <div className="mt-4 space-y-1.5">
              {due.slice(0, 3).map(d => (
                <p key={d.lead.id} className="text-label text-neutral-400 truncate">
                  @{d.lead.handle} → {d.message.slice(0, 70)}{d.message.length > 70 ? '…' : ''}
                </p>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Ladder tabs ──────────────────────────────────────────────── */}
      <div className="flex items-center gap-2">
        {KINDS.map((k) => (
          <button
            key={k}
            id={`ladder-tab-${k}`}
            onClick={() => setKind(k)}
            className={`px-4 py-2 rounded-xl text-xs font-semibold border transition-colors duration-300 ${
              kind === k
                ? 'bg-white/10 border-white/20 text-white'
                : 'bg-white/[0.02] border-white/6 text-neutral-400 hover:text-neutral-300'
            }`}
          >
            {LADDERS[k].tab}
            {!sequences[k]?.active && <span className="ml-2 text-neutral-400">paused</span>}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Left column: Sequence editor */}
      <div className="lg:col-span-2 space-y-4">
        {/* Header */}
        <div className="rounded-[1.5rem] p-[1px]" style={CARD_BEZEL.outer}>
          <div className="bg-surface-sunken rounded-[calc(1.5rem-1px)] p-6" style={CARD_BEZEL.inner}>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-neutral-500/10 border border-neutral-500/20 flex items-center justify-center">
                  <CalendarClock className="w-4 h-4 text-neutral-400" />
                </div>
                <div>
                  <p className="text-label font-semibold tracking-[0.2em] text-neutral-400 uppercase">Follow-Up Engine</p>
                  <h3 className="text-sm font-semibold text-white leading-none">{LADDERS[kind].title}</h3>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  id="sequence-toggle-btn"
                  onClick={handleToggleActive}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-label font-semibold border transition-colors duration-300 ${
                    activeSeq?.active
                      ? 'bg-white/10 border-white/20 text-white'
                      : 'bg-white/4 border-white/10 text-neutral-400'
                  }`}
                >
                  {activeSeq?.active ? (
                    <><Play className="w-3 h-3" />Active</>
                  ) : (
                    <><Pause className="w-3 h-3" />Paused</>
                  )}
                </button>

                <button
                  id="sequence-save-btn"
                  onClick={handleSave}
                  disabled={saveState.type === 'saving'}
                  className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-label font-semibold bg-white hover:bg-neutral-200 text-surface transition-all disabled:opacity-60"
                >
                  {saveState.type === 'saving' ? (
                    <div className="w-3 h-3 border-2 border-white/40 border-t-white/20 rounded-full animate-spin" />
                  ) : (
                    <Save className="w-3 h-3" />
                  )}
                  {saveState.type === 'saving' ? 'Saving…' : 'Save Sequence'}
                </button>
              </div>
            </div>

            <p className="text-label text-neutral-400 leading-relaxed mt-3">{LADDERS[kind].blurb}</p>

            {saveState.type === 'saved' && (
              <div className="flex items-center gap-2 mt-3 text-white text-xs">
                <CheckCircle2 className="w-3.5 h-3.5" />{saveState.message}
              </div>
            )}
            {saveState.type === 'error' && (
              <div className="flex items-center gap-2 mt-3 text-danger-400 text-xs">
                <AlertCircle className="w-3.5 h-3.5" />{saveState.message}
              </div>
            )}

            <div className="flex items-start gap-2 mt-4 p-3 rounded-xl bg-neutral-500/6 border border-neutral-500/12">
              <Info className="w-3.5 h-3.5 text-neutral-400 flex-shrink-0 mt-0.5" />
              <p className="text-label text-neutral-400 leading-relaxed">
                Tokens come from your Offer Ledger in Settings:{' '}
                <code className="text-neutral-300 bg-neutral-500/10 px-1 rounded">{'{{firstName}}'}</code>{' '}
                <code className="text-neutral-300 bg-neutral-500/10 px-1 rounded">{'{{proof}}'}</code>{' '}
                <code className="text-neutral-300 bg-neutral-500/10 px-1 rounded">{'{{give}}'}</code>{' '}
                <code className="text-neutral-300 bg-neutral-500/10 px-1 rounded">{'{{price}}'}</code>{' '}
                <code className="text-neutral-300 bg-neutral-500/10 px-1 rounded">{'{{outcome}}'}</code>.
                A sentence whose fact you haven&rsquo;t filled in is dropped rather than sent with a hole in it — watch the preview.
              </p>
            </div>
          </div>
        </div>

        {/* Steps */}
        <div className="space-y-3">
          {activeSeq?.steps.map((step, index) => (
            <div key={step.id} className="rounded-[1.5rem] p-[1px]" style={CARD_BEZEL.outer}>
              <div className="bg-surface-sunken rounded-[calc(1.5rem-1px)] p-5" style={CARD_BEZEL.inner}>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-6 h-6 rounded-full bg-neutral-500/15 border border-neutral-500/25 flex items-center justify-center">
                      <span className="text-label font-bold text-neutral-400">{index + 1}</span>
                    </div>
                    <span className="text-sm font-semibold text-white">Touch {index + 1}</span>
                  </div>
                  <button
                    type="button"
                    id={`remove-step-${index}-btn`}
                    onClick={() => handleRemoveStep(step.id)}
                    aria-label={`Remove touch ${index + 1}`}
                    className="w-6 h-6 rounded-lg flex items-center justify-center text-neutral-400 hover:text-danger-400 hover:bg-danger-400/8 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div>
                    <label htmlFor={`step-delay-${index}`} className="block text-label font-semibold text-neutral-400 uppercase tracking-wider mb-1.5">
                      {kind === 'rescue' && index === 0 ? 'Days after their reply' : 'Send after'}
                    </label>
                    <div className="relative">
                      <select
                        id={`step-delay-${index}`}
                        value={step.delayDays}
                        onChange={(e) => handleUpdateStep(step.id, 'delayDays', Number(e.target.value))}
                        className="w-full bg-surface-overlay border border-white/8 rounded-xl py-2.5 pl-3 pr-8 text-sm text-white focus:outline-none focus:ring-1 focus:ring-white/50 focus:border-white/30 transition-colors appearance-none"
                      >
                        {DELAY_OPTIONS.map((d) => (
                          <option key={d} value={d} className="bg-neutral-900">Day {d}</option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-neutral-400 pointer-events-none" />
                    </div>
                  </div>

                  <div>
                    <label htmlFor={`step-condition-${index}`} className="block text-label font-semibold text-neutral-400 uppercase tracking-wider mb-1.5">
                      Condition
                    </label>
                    <div className="relative">
                      <select
                        id={`step-condition-${index}`}
                        value={step.condition}
                        onChange={(e) => handleUpdateStep(step.id, 'condition', e.target.value as FollowUpCondition)}
                        className="w-full bg-surface-overlay border border-white/8 rounded-xl py-2.5 pl-3 pr-8 text-sm text-white focus:outline-none focus:ring-1 focus:ring-white/50 focus:border-white/30 transition-colors appearance-none"
                      >
                        {Object.entries(CONDITION_LABELS).map(([val, label]) => (
                          <option key={val} value={val} className="bg-neutral-900">{label}</option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-neutral-400 pointer-events-none" />
                    </div>
                  </div>
                </div>

                <div>
                  <label htmlFor={`step-template-${index}`} className="block text-label font-semibold text-neutral-400 uppercase tracking-wider mb-1.5">
                    Message Template
                  </label>
                  <textarea
                    id={`step-template-${index}`}
                    value={step.messageTemplate}
                    onChange={(e) => handleUpdateStep(step.id, 'messageTemplate', e.target.value)}
                    placeholder="Write your follow-up message… use {{firstName}}, {{proof}}, {{give}} for personalisation"
                    rows={3}
                    className="w-full bg-surface-overlay border border-white/8 rounded-xl py-2.5 px-3 text-sm text-white placeholder:text-neutral-500 focus:outline-none focus:ring-1 focus:ring-white/50 focus:border-white/30 transition-colors resize-none leading-relaxed"
                  />
                  <div className="flex justify-end mt-1">
                    <span className={`text-label font-mono ${step.messageTemplate.length > 280 ? 'text-white' : 'text-neutral-400'}`}>
                      {step.messageTemplate.length} / 280 chars
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}

          <div className="flex items-center gap-2">
            {(activeSeq?.steps.length ?? 0) < 3 && (
              <button
                id="add-followup-step-btn"
                onClick={handleAddStep}
                className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-2xl border border-dashed border-white/10 text-sm text-neutral-400 hover:text-white hover:border-white/20 transition-colors duration-300 group"
              >
                <Plus className="w-4 h-4 group-hover:scale-110 transition-transform" />
                Add touch ({(activeSeq?.steps.length ?? 0)}/3 used)
              </button>
            )}
            <button
              id="reset-ladder-btn"
              onClick={handleResetCopy}
              className="px-4 py-3.5 rounded-2xl border border-dashed border-white/10 text-sm text-neutral-400 hover:text-white hover:border-white/20 transition-colors duration-300"
            >
              Restore suggested copy
            </button>
          </div>
        </div>
      </div>

      {/* Right column: Preview */}
      <div className="space-y-4">
        <div className="rounded-[1.5rem] p-[1px] sticky top-6" style={CARD_BEZEL.outer}>
          <div className="bg-surface-sunken rounded-[calc(1.5rem-1px)] p-5" style={CARD_BEZEL.inner}>
            <div className="flex items-center justify-between mb-4">
              <p className="text-label font-semibold tracking-[0.2em] text-neutral-400 uppercase">Preview</p>
              <span className="text-label text-neutral-400">{dueHere.length} due here</span>
            </div>

            <div className="space-y-3 mb-5">
              <div>
                <label htmlFor="followupse-test-handle" className="block text-label text-neutral-400 mb-1">Test handle</label>
                <input id="followupse-test-handle"
                  value={previewHandle}
                  onChange={(e) => setPreviewHandle(e.target.value)}
                  className="w-full bg-surface-overlay border border-white/8 rounded-lg py-1.5 px-2.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-white/40 transition-colors"
                />
              </div>
              <div>
                <label htmlFor="followupse-test-name" className="block text-label text-neutral-400 mb-1">Test name</label>
                <input id="followupse-test-name"
                  value={previewName}
                  onChange={(e) => setPreviewName(e.target.value)}
                  className="w-full bg-surface-overlay border border-white/8 rounded-lg py-1.5 px-2.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-white/40 transition-colors"
                />
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex gap-3">
                <div className="flex flex-col items-center">
                  <div className="w-5 h-5 rounded-full bg-white/15 border border-white/30 flex items-center justify-center flex-shrink-0">
                    <span className="text-label font-bold text-white">0</span>
                  </div>
                  <div className="w-px flex-1 bg-white/5 mt-1" />
                </div>
                <div className="flex-1 pb-3">
                  <p className="text-label font-semibold text-white mb-1">
                    {kind === 'rescue' ? 'Day 0 — They replied' : 'Day 0 — Initial DM'}
                  </p>
                  <div className="bg-white/3 rounded-lg p-2">
                    <p className="text-label text-neutral-400 italic">
                      {kind === 'rescue'
                        ? 'The conversation that went quiet'
                        : 'Your AI-generated personalised opener'}
                    </p>
                  </div>
                </div>
              </div>

              {activeSeq?.steps.map((step, i) => {
                const preview = renderPreview(step.messageTemplate);
                return (
                  <div key={step.id} className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <div className="w-5 h-5 rounded-full bg-neutral-500/15 border border-neutral-500/30 flex items-center justify-center flex-shrink-0">
                        <span className="text-label font-bold text-neutral-400">{step.delayDays}</span>
                      </div>
                      {i < (activeSeq.steps.length - 1) && <div className="w-px flex-1 bg-white/5 mt-1" />}
                    </div>
                    <div className="flex-1 pb-3">
                      <p className="text-label font-semibold text-neutral-400 mb-1">
                        Day {step.delayDays} — Touch {i + 1}
                        <span className="text-neutral-400 font-normal ml-1">({CONDITION_LABELS[step.condition]})</span>
                      </p>
                      <div className="bg-white/3 rounded-lg p-2">
                        <p className="text-label text-neutral-400 leading-relaxed whitespace-pre-wrap">
                          {preview || <em className="text-neutral-400">Nothing to send — fill in the Offer Ledger fields this touch needs.</em>}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}

              {(activeSeq?.steps.length ?? 0) === 0 && (
                <p className="text-label text-neutral-400 text-center py-4">Add touches to preview the sequence timeline</p>
              )}
            </div>
          </div>
        </div>
      </div>
      </div>
    </div>
  );
};
