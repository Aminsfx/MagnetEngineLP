import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Plus, Trash2, Save, Play, Pause, CalendarClock, ChevronDown, Info, CheckCircle2, AlertCircle, Send } from 'lucide-react';
import { FollowUpStep, FollowUpSequence, Lead } from '../../lib/types';
import { db } from '../../lib/db';
import { useAuth } from '../../contexts/AuthContext';
import { computeDueFollowUps, type DueFollowUp } from '../../lib/followups';

const DELAY_OPTIONS = [1, 2, 3, 4, 5, 7, 10, 14];
const CONDITION_LABELS: Record<FollowUpStep['condition'], string> = {
  no_reply: 'Only if no reply',
  always: 'Always send',
};

const DEFAULT_TEMPLATES = [
  'Hey {{handle}} 👋 Just wanted to follow up on my last message — did you get a chance to see it?',
  'Hi {{name}}, circling back on this! Would love to show you what we\'ve been doing for similar businesses. Worth a quick chat?',
  '{{handle}}, last follow-up from me — I\'ll leave the door open. Just reply "interested" if you\'d like to connect.',
];

function generateId() {
  return Math.random().toString(36).slice(2, 10);
}

function createDefaultStep(index: number): FollowUpStep {
  return {
    id: generateId(),
    delayDays: [3, 7, 14][index] ?? 3,
    messageTemplate: DEFAULT_TEMPLATES[index] ?? '',
    condition: index === 0 ? 'no_reply' : 'no_reply',
  };
}

interface SaveState { type: 'idle' | 'saving' | 'saved' | 'error'; message?: string }

interface FollowUpSequencerProps {
  leads: Lead[];
  onSendFollowUps: (due: DueFollowUp[]) => Promise<number>;
}

export const FollowUpSequencer: React.FC<FollowUpSequencerProps> = ({ leads, onSendFollowUps }) => {
  const { user } = useAuth();
  const [sequences, setSequences] = useState<FollowUpSequence[]>([]);
  const [activeSeq, setActiveSeq] = useState<FollowUpSequence | null>(null);
  const [saveState, setSaveState] = useState<SaveState>({ type: 'idle' });
  const [previewHandle, setPreviewHandle] = useState('johndoe');
  const [previewName, setPreviewName] = useState('John');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  // Compute due follow-ups from the CURRENT (possibly unsaved) sequence so
  // what the user sees is exactly what sends.
  const due = useMemo(() => computeDueFollowUps(leads, activeSeq), [leads, activeSeq]);

  const handleSendDue = async () => {
    if (due.length === 0 || sending) return;
    setSending(true);
    try {
      await onSendFollowUps(due);
    } finally {
      setSending(false);
    }
  };

  // Load existing sequences
  useEffect(() => {
    if (!user) return;
    db.getSequences(user.id).then((seqs) => {
      setSequences(seqs);
      if (seqs.length > 0) setActiveSeq(seqs[0]);
      else {
        // Create a default blank sequence to edit
        const blank: FollowUpSequence = {
          id: 'new',
          steps: [createDefaultStep(0)],
          active: true,
        };
        setActiveSeq(blank);
      }
      setLoading(false);
    });
  }, [user]);

  const handleAddStep = () => {
    if (!activeSeq || activeSeq.steps.length >= 3) return;
    setActiveSeq({
      ...activeSeq,
      steps: [...activeSeq.steps, createDefaultStep(activeSeq.steps.length)],
    });
  };

  const handleRemoveStep = (stepId: string) => {
    if (!activeSeq) return;
    setActiveSeq({ ...activeSeq, steps: activeSeq.steps.filter((s) => s.id !== stepId) });
  };

  const handleUpdateStep = (stepId: string, field: keyof FollowUpStep, value: unknown) => {
    if (!activeSeq) return;
    setActiveSeq({
      ...activeSeq,
      steps: activeSeq.steps.map((s) =>
        s.id === stepId ? { ...s, [field]: value } : s
      ),
    });
  };

  const handleToggleActive = () => {
    if (!activeSeq) return;
    setActiveSeq({ ...activeSeq, active: !activeSeq.active });
  };

  const handleSave = useCallback(async () => {
    if (!activeSeq || !user) return;
    setSaveState({ type: 'saving' });

    try {
      const saved = await db.upsertSequence(activeSeq, user.id);
      if (saved) {
        setActiveSeq(saved);
        setSequences((prev) => {
          const exists = prev.find((s) => s.id === saved.id);
          if (exists) return prev.map((s) => (s.id === saved.id ? saved : s));
          return [saved, ...prev];
        });
        setSaveState({ type: 'saved', message: 'Sequence saved' });
      } else {
        setSaveState({ type: 'error', message: 'Save failed — check console' });
      }
    } catch (e) {
      setSaveState({ type: 'error', message: 'Unexpected error' });
    }

    setTimeout(() => setSaveState({ type: 'idle' }), 3000);
  }, [activeSeq, user]);

  function renderPreview(template: string): string {
    return template
      .replace(/\{\{handle\}\}/g, `@${previewHandle}`)
      .replace(/\{\{name\}\}/g, previewName);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48 text-zinc-600 text-sm">
        <div className="animate-spin w-4 h-4 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full mr-3" />
        Loading sequences…
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ── Due follow-ups panel ─────────────────────────────────────── */}
      <div
        className="rounded-[1.5rem] p-[1px]"
        style={{ background: 'linear-gradient(135deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.02) 100%)' }}
      >
        <div className="bg-[#030A06] rounded-[calc(1.5rem-1px)] p-6" style={{ boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.04)' }}>
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center">
                <CalendarClock className="w-4 h-4 text-violet-400" />
              </div>
              <div>
                <p className="text-[10px] font-semibold tracking-[0.2em] text-zinc-600 uppercase">Due follow-ups</p>
                <p className="text-sm text-white font-semibold leading-none mt-1">
                  {activeSeq?.active
                    ? `${due.length} lead${due.length !== 1 ? 's' : ''} ${due.length === 1 ? 'is' : 'are'} due a follow-up step`
                    : 'Sequence is paused — resume it to send.'}
                </p>
              </div>
            </div>
            <button
              id="send-due-followups-btn"
              onClick={handleSendDue}
              disabled={due.length === 0 || sending || !activeSeq?.active}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold bg-emerald-500 hover:bg-emerald-400 text-emerald-950 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {sending
                ? <div className="w-3.5 h-3.5 border-2 border-emerald-900/40 border-t-emerald-900 rounded-full animate-spin" />
                : <Send className="w-3.5 h-3.5" />}
              Send due follow-ups ({due.length})
            </button>
          </div>

          {activeSeq?.active && due.length > 0 && (
            <div className="mt-4 space-y-1.5">
              {due.slice(0, 3).map(d => (
                <p key={d.lead.id} className="text-[11px] text-zinc-500 font-mono truncate">
                  @{d.lead.handle} → Day {activeSeq.steps[d.stepIndex]?.delayDays}: {d.message.slice(0, 60)}{d.message.length > 60 ? '…' : ''}
                </p>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Left column: Sequence editor */}
      <div className="lg:col-span-2 space-y-4">
        {/* Header */}
        <div
          className="rounded-[1.5rem] p-[1px]"
          style={{ background: 'linear-gradient(135deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.02) 100%)' }}
        >
          <div className="bg-[#030A06] rounded-[calc(1.5rem-1px)] p-6" style={{ boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.04)' }}>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center">
                  <CalendarClock className="w-4 h-4 text-violet-400" />
                </div>
                <div>
                  <p className="text-[10px] font-semibold tracking-[0.2em] text-zinc-600 uppercase">Follow-Up Engine</p>
                  <h3 className="text-sm font-semibold text-white leading-none">Default Sequence</h3>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {/* Active toggle */}
                <button
                  id="sequence-toggle-btn"
                  onClick={handleToggleActive}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-semibold border transition-all duration-300 ${
                    activeSeq?.active
                      ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                      : 'bg-white/4 border-white/10 text-zinc-500'
                  }`}
                >
                  {activeSeq?.active ? (
                    <><Play className="w-3 h-3" />Active</>
                  ) : (
                    <><Pause className="w-3 h-3" />Paused</>
                  )}
                </button>

                {/* Save button */}
                <button
                  id="sequence-save-btn"
                  onClick={handleSave}
                  disabled={saveState.type === 'saving'}
                  className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-[11px] font-semibold bg-emerald-500 hover:bg-emerald-400 text-emerald-950 transition-all disabled:opacity-60"
                >
                  {saveState.type === 'saving' ? (
                    <div className="w-3 h-3 border-2 border-emerald-900/40 border-t-emerald-900 rounded-full animate-spin" />
                  ) : (
                    <Save className="w-3 h-3" />
                  )}
                  {saveState.type === 'saving' ? 'Saving…' : 'Save Sequence'}
                </button>
              </div>
            </div>

            {/* Save status */}
            {saveState.type === 'saved' && (
              <div className="flex items-center gap-2 mt-3 text-emerald-400 text-xs">
                <CheckCircle2 className="w-3.5 h-3.5" />{saveState.message}
              </div>
            )}
            {saveState.type === 'error' && (
              <div className="flex items-center gap-2 mt-3 text-red-400 text-xs">
                <AlertCircle className="w-3.5 h-3.5" />{saveState.message}
              </div>
            )}

            {/* Info note */}
            <div className="flex items-start gap-2 mt-4 p-3 rounded-xl bg-violet-500/6 border border-violet-500/12">
              <Info className="w-3.5 h-3.5 text-violet-400 flex-shrink-0 mt-0.5" />
              <p className="text-[11px] text-zinc-500 leading-relaxed">
                The Chrome extension will send these follow-ups automatically. Use{' '}
                <code className="text-violet-400 bg-violet-500/10 px-1 rounded">{'{{handle}}'}</code> and{' '}
                <code className="text-violet-400 bg-violet-500/10 px-1 rounded">{'{{name}}'}</code> for personalisation tokens.
              </p>
            </div>
          </div>
        </div>

        {/* Steps */}
        <div className="space-y-3">
          {activeSeq?.steps.map((step, index) => (
            <div
              key={step.id}
              className="rounded-[1.5rem] p-[1px]"
              style={{ background: 'linear-gradient(135deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.02) 100%)' }}
            >
              <div className="bg-[#030A06] rounded-[calc(1.5rem-1px)] p-5" style={{ boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.04)' }}>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-6 h-6 rounded-full bg-violet-500/15 border border-violet-500/25 flex items-center justify-center">
                      <span className="text-[10px] font-bold text-violet-400">{index + 1}</span>
                    </div>
                    <span className="text-sm font-semibold text-white">Follow-up {index + 1}</span>
                  </div>
                  <button
                    id={`remove-step-${index}-btn`}
                    onClick={() => handleRemoveStep(step.id)}
                    className="w-6 h-6 rounded-lg flex items-center justify-center text-zinc-700 hover:text-red-400 hover:bg-red-400/8 transition-all"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-3 mb-4">
                  {/* Delay */}
                  <div>
                    <label className="block text-[10px] font-semibold text-zinc-600 uppercase tracking-wider mb-1.5">
                      Send after
                    </label>
                    <div className="relative">
                      <select
                        id={`step-delay-${index}`}
                        value={step.delayDays}
                        onChange={(e) => handleUpdateStep(step.id, 'delayDays', Number(e.target.value))}
                        className="w-full bg-[#0D1F14] border border-white/8 rounded-xl py-2.5 pl-3 pr-8 text-sm text-white focus:outline-none focus:ring-1 focus:ring-violet-500/50 focus:border-violet-500/30 transition-all appearance-none"
                      >
                        {DELAY_OPTIONS.map((d) => (
                          <option key={d} value={d} className="bg-zinc-900">
                            Day {d}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-600 pointer-events-none" />
                    </div>
                  </div>

                  {/* Condition */}
                  <div>
                    <label className="block text-[10px] font-semibold text-zinc-600 uppercase tracking-wider mb-1.5">
                      Condition
                    </label>
                    <div className="relative">
                      <select
                        id={`step-condition-${index}`}
                        value={step.condition}
                        onChange={(e) => handleUpdateStep(step.id, 'condition', e.target.value as FollowUpStep['condition'])}
                        className="w-full bg-[#0D1F14] border border-white/8 rounded-xl py-2.5 pl-3 pr-8 text-sm text-white focus:outline-none focus:ring-1 focus:ring-violet-500/50 focus:border-violet-500/30 transition-all appearance-none"
                      >
                        {Object.entries(CONDITION_LABELS).map(([val, label]) => (
                          <option key={val} value={val} className="bg-zinc-900">{label}</option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-600 pointer-events-none" />
                    </div>
                  </div>
                </div>

                {/* Message template */}
                <div>
                  <label className="block text-[10px] font-semibold text-zinc-600 uppercase tracking-wider mb-1.5">
                    Message Template
                  </label>
                  <textarea
                    id={`step-template-${index}`}
                    value={step.messageTemplate}
                    onChange={(e) => handleUpdateStep(step.id, 'messageTemplate', e.target.value)}
                    placeholder="Write your follow-up message… use {{handle}} and {{name}} for personalisation"
                    rows={3}
                    className="w-full bg-[#0D1F14] border border-white/8 rounded-xl py-2.5 px-3 text-sm text-white placeholder:text-zinc-700 focus:outline-none focus:ring-1 focus:ring-violet-500/50 focus:border-violet-500/30 transition-all resize-none leading-relaxed"
                  />
                  <div className="flex justify-end mt-1">
                    <span className={`text-[10px] font-mono ${step.messageTemplate.length > 280 ? 'text-amber-400' : 'text-zinc-700'}`}>
                      {step.messageTemplate.length} / 280 chars
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}

          {/* Add step button */}
          {(activeSeq?.steps.length ?? 0) < 3 && (
            <button
              id="add-followup-step-btn"
              onClick={handleAddStep}
              className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl border border-dashed border-white/10 text-sm text-zinc-600 hover:text-white hover:border-white/20 transition-all duration-300 group"
            >
              <Plus className="w-4 h-4 group-hover:scale-110 transition-transform" />
              Add follow-up step ({(activeSeq?.steps.length ?? 0)}/3 used)
            </button>
          )}
        </div>
      </div>

      {/* Right column: Preview */}
      <div className="space-y-4">
        <div
          className="rounded-[1.5rem] p-[1px] sticky top-6"
          style={{ background: 'linear-gradient(135deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.02) 100%)' }}
        >
          <div className="bg-[#030A06] rounded-[calc(1.5rem-1px)] p-5" style={{ boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.04)' }}>
            <p className="text-[10px] font-semibold tracking-[0.2em] text-zinc-600 uppercase mb-4">Preview</p>

            {/* Preview inputs */}
            <div className="space-y-3 mb-5">
              <div>
                <label className="block text-[10px] text-zinc-600 mb-1">Test handle</label>
                <input
                  value={previewHandle}
                  onChange={(e) => setPreviewHandle(e.target.value)}
                  className="w-full bg-[#0D1F14] border border-white/8 rounded-lg py-1.5 px-2.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-violet-500/40 transition-all"
                />
              </div>
              <div>
                <label className="block text-[10px] text-zinc-600 mb-1">Test name</label>
                <input
                  value={previewName}
                  onChange={(e) => setPreviewName(e.target.value)}
                  className="w-full bg-[#0D1F14] border border-white/8 rounded-lg py-1.5 px-2.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-violet-500/40 transition-all"
                />
              </div>
            </div>

            {/* Timeline preview */}
            <div className="space-y-3">
              {/* Day 0 — Initial DM */}
              <div className="flex gap-3">
                <div className="flex flex-col items-center">
                  <div className="w-5 h-5 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center flex-shrink-0">
                    <span className="text-[8px] font-bold text-emerald-400">0</span>
                  </div>
                  <div className="w-px flex-1 bg-white/5 mt-1" />
                </div>
                <div className="flex-1 pb-3">
                  <p className="text-[10px] font-semibold text-emerald-400 mb-1">Day 0 — Initial DM</p>
                  <div className="bg-white/3 rounded-lg p-2">
                    <p className="text-[10px] text-zinc-500 italic">Your AI-generated personalised opener</p>
                  </div>
                </div>
              </div>

              {/* Follow-up steps */}
              {activeSeq?.steps.map((step, i) => (
                <div key={step.id} className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <div className="w-5 h-5 rounded-full bg-violet-500/15 border border-violet-500/30 flex items-center justify-center flex-shrink-0">
                      <span className="text-[8px] font-bold text-violet-400">{step.delayDays}</span>
                    </div>
                    {i < (activeSeq.steps.length - 1) && <div className="w-px flex-1 bg-white/5 mt-1" />}
                  </div>
                  <div className="flex-1 pb-3">
                    <p className="text-[10px] font-semibold text-violet-400 mb-1">
                      Day {step.delayDays} — Follow-up {i + 1}
                      <span className="text-zinc-700 font-normal ml-1">({CONDITION_LABELS[step.condition]})</span>
                    </p>
                    <div className="bg-white/3 rounded-lg p-2">
                      <p className="text-[10px] text-zinc-400 leading-relaxed whitespace-pre-wrap">
                        {step.messageTemplate ? renderPreview(step.messageTemplate) : <em className="text-zinc-700">Enter a message template…</em>}
                      </p>
                    </div>
                  </div>
                </div>
              ))}

              {(activeSeq?.steps.length ?? 0) === 0 && (
                <p className="text-[11px] text-zinc-700 text-center py-4">Add steps to preview the sequence timeline</p>
              )}
            </div>
          </div>
        </div>
      </div>
      </div>
    </div>
  );
};
