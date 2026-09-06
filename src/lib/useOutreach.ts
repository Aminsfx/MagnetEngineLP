import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { AppConfig, DashboardStats, Lead } from './types';
import type { PlanLimits } from './plans';
import type { WorkspaceStore } from './store';
import type { DueFollowUp } from './followups';
import { db } from './db';
import { aiAPI } from './api';
import { filterUtils } from './filters';
import { canonicalHandle, dropKnownHandles } from './intake';
import { stampFollowUp } from './followups';
import { applyOutcome, type Outcome } from './outcome';
import { detectTransitions, fireWebhook, type WebhookEvent } from './webhooks';
import { sendCampaign } from './extensionProtocol';
import { storage } from './storage';

/**
 * The outreach engine: everything that happens to a Lead between arriving and
 * being sent.
 *
 * These rules used to live in DashboardShell — a 909-line component with no
 * props, no exports and therefore no interface, so the only way to exercise
 * "what happens when an Operator approves a Lead" was to mount the entire
 * dashboard against a hand-maintained 15-method fake of the database. It was
 * also the repo's highest-churn file, and three of the last four fixes landed
 * inside it.
 *
 * Now it is a module with a named interface and two ports: a WorkspaceStore for
 * persistence and the extension protocol for sending. Both are injected, so the
 * engine can be driven directly in a test.
 */

/** DM generation runs sequentially against the provider, so one call does a
 *  batch rather than the whole queue. The caller is told what's left. */
export const GENERATION_BATCH = 10;

export interface OutreachEngine {
  leads: Lead[];
  /** `leads` with the Operator's filtering rules applied. */
  filteredLeads: Lead[];
  stats: DashboardStats;
  /** DM generations spent this month, as reported by the server. */
  dmUsed: number;
  isGenerating: boolean;

  /** Seed from storage once the cold load resolves. */
  hydrate(leads: Lead[], dmUsed: number): void;

  addLeads(leads: Lead[]): Promise<void>;
  approve(id: string): Promise<void>;
  approveMany(ids: string[]): Promise<void>;
  reject(id: string): Promise<void>;
  updateDM(id: string, content: string): Promise<void>;
  update(lead: Lead): Promise<void>;
  remove(id: string): Promise<void>;
  removeMany(ids: string[]): Promise<void>;
  generateDMs(target?: Lead[]): Promise<void>;
  sendFollowUps(due: DueFollowUp[]): Promise<number>;

  /** Flip Leads to Sent from the handles the extension confirms it sent. */
  markSentByHandles(handles: string[]): void;
  /**
   * Reflect what Conversations revealed on the Leads behind them — the Inbox's
   * one way into the Lead lifecycle. Fires the same webhooks an Operator's own
   * mark would, and is silent for Leads that already reflect their Outcome,
   * which is the common case: Ingestion re-reads every Conversation on every
   * poll. Takes a batch because that is how Ingestion produces them, and
   * because two threads can share one handle.
   */
  recordOutcomes(outcomes: Outcome[]): void;
}

export interface OutreachDeps {
  store: WorkspaceStore;
  config: AppConfig;
  limits: PlanLimits;
  toast: {
    success(message: string): void;
    error(message: string): void;
    info(message: string): void;
  };
}

export function useOutreach({ store, config, limits, toast }: OutreachDeps): OutreachEngine {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [dmUsed, setDmUsed] = useState(0);
  const [isGenerating, setIsGenerating] = useState(false);

  // Live mirror so callbacks stay stable while still reading current Leads.
  // Written in an effect, not during render — a ref assignment during render is
  // not guaranteed to survive a discarded render pass.
  const leadsRef = useRef<Lead[]>([]);
  useEffect(() => { leadsRef.current = leads; }, [leads]);

  // Derived, never stored. Holding these in state made every Lead mutation
  // commit twice and re-render the whole Approval Queue for no visible change.
  const filteredLeads = useMemo(() => filterUtils.filterLeads(leads, config), [leads, config]);
  const stats = useMemo(() => filterUtils.calculateStats(leads), [leads]);

  /** Monthly Lead/campaign counters only apply to a real, signed-in workspace. */
  const metered = store.kind === 'supabase';

  /**
   * Apply a change to one Lead and persist it.
   *
   * The change is computed from the current Leads BEFORE calling setLeads, not
   * captured as a side effect inside the updater. The old code did the latter:
   *
   *   let updated; setLeads(prev => prev.map(l => { updated = …; }));
   *   if (updated) await store.saveLeads([updated]);
   *
   * React only runs an updater during render, so `updated` was still undefined
   * on the next line — except when React's eager-state optimisation happened to
   * run it inline, which it skips when the fiber already has a pending update.
   * Approve, reject and edit-DM therefore persisted most of the time and
   * silently didn't the rest.
   */
  const patch = useCallback(async (id: string, change: (lead: Lead) => Lead) => {
    const current = leadsRef.current.find((l) => l.id === id);
    if (!current) return;
    const updated = change(current);
    setLeads((prev) => prev.map((l) => (l.id === id ? updated : l)));
    await store.saveLeads([updated]);
  }, [store]);

  const hydrate = useCallback((saved: Lead[], used: number) => {
    setLeads(saved);
    setDmUsed(used);
  }, []);

  const addLeads = useCallback(async (newLeads: Lead[]) => {
    // Within-batch dedupe already happened in intake; this is the cross-batch
    // half — the same profile turns up across overlapping searches, repeat
    // scrapes, and CSV re-imports.
    const { fresh, duplicates } = dropKnownHandles(
      newLeads,
      leadsRef.current.map((l) => l.handle),
    );

    if (fresh.length === 0) {
      if (duplicates > 0) {
        toast.info(`All ${duplicates} lead${duplicates !== 1 ? 's' : ''} were already in your queue — nothing new to add.`);
      }
      return;
    }

    let toAdd = fresh;
    let quotaCapped = 0;

    // Advisory quotas: they bound the Operator's own workspace, not the Owner's
    // spend, and Leads are written to Postgres by the client, so there is no
    // server chokepoint to meter them at.
    if (metered) {
      const [campaignsUsed, leadsUsed] = await Promise.all([
        db.getMonthlyCount('campaigns'),
        db.getMonthlyCount('leads'),
      ]);
      if (campaignsUsed >= limits.maxCampaignsPerMonth) {
        toast.error(`You've used all ${limits.maxCampaignsPerMonth} campaigns this month. Resets on the 1st.`);
        return;
      }
      const remaining = limits.maxLeadsPerMonth - leadsUsed;
      if (remaining <= 0) {
        toast.error(`You've reached your ${limits.maxLeadsPerMonth} leads/month limit. Resets on the 1st.`);
        return;
      }
      if (toAdd.length > remaining) {
        quotaCapped = toAdd.length - remaining;
        toAdd = toAdd.slice(0, remaining);
      }
    }

    const added = toAdd;
    setLeads((prev) => [...prev, ...added]);
    await store.saveLeads(added);

    if (metered) {
      db.incrementMonthlyCount('leads', added.length).catch(console.error);
      db.incrementMonthlyCount('campaigns', 1).catch(console.error);
    }

    // Only worth a toast when something was left out — a clean add is already
    // confirmed by the calling component (CampaignBuilder / CsvImport).
    if (duplicates > 0 || quotaCapped > 0) {
      const parts = [`Added ${added.length} lead${added.length !== 1 ? 's' : ''}`];
      if (duplicates > 0) parts.push(`${duplicates} already in your queue`);
      if (quotaCapped > 0) parts.push(`${quotaCapped} over your ${limits.maxLeadsPerMonth}/month limit`);
      toast.info(`${parts[0]} · skipped ${parts.slice(1).join(' + ')}.`);
    }
  }, [metered, limits.maxCampaignsPerMonth, limits.maxLeadsPerMonth, toast, store]);

  const approve = useCallback(
    (id: string) => patch(id, (l) => ({ ...l, approved: true, rejected: false })),
    [patch],
  );

  const reject = useCallback(
    (id: string) => patch(id, (l) => ({ ...l, rejected: true, approved: false })),
    [patch],
  );

  const updateDM = useCallback(
    (id: string, content: string) => patch(id, (l) => ({ ...l, dmContent: content })),
    [patch],
  );

  /** Bulk approve — one state update, one batched write. */
  const approveMany = useCallback(async (ids: string[]) => {
    if (ids.length === 0) return;
    const wanted = new Set(ids);
    const updated = leadsRef.current
      .filter((l) => wanted.has(l.id))
      .map((l) => ({ ...l, approved: true, rejected: false }));
    const byId = new Map(updated.map((l) => [l.id, l]));
    setLeads((prev) => prev.map((l) => byId.get(l.id) ?? l));
    if (updated.length > 0) await store.saveLeads(updated);
    toast.success(`${ids.length} DM${ids.length !== 1 ? 's' : ''} approved`);
  }, [toast, store]);

  const update = useCallback(async (updated: Lead) => {
    const previous = leadsRef.current.find((l) => l.id === updated.id);
    setLeads((prev) => prev.map((l) => (l.id === updated.id ? updated : l)));
    if (previous) {
      for (const event of detectTransitions(previous, updated)) {
        fireWebhook(config, event, updated);
      }
    }
    await store.saveLeads([updated]);
  }, [config, store]);

  const remove = useCallback(async (id: string) => {
    setLeads((prev) => prev.filter((l) => l.id !== id));
    await store.removeLeads([id]);
  }, [store]);

  const removeMany = useCallback(async (ids: string[]) => {
    if (ids.length === 0) return;
    const wanted = new Set(ids);
    setLeads((prev) => prev.filter((l) => !wanted.has(l.id)));
    await store.removeLeads(ids);
    toast.success(`${ids.length} lead${ids.length !== 1 ? 's' : ''} deleted from the queue`);
  }, [toast, store]);

  const generateDMs = useCallback(async (target?: Lead[]) => {
    const remaining = limits.maxDMGenerations - dmUsed;
    if (remaining <= 0) {
      toast.error(`You've used all ${limits.maxDMGenerations} DM generations for this month. Upgrade your plan to generate more.`);
      return;
    }

    const pending = (target ?? filteredLeads).filter((l) => !l.dmContent).slice(0, remaining);
    if (pending.length === 0) {
      toast.info('All selected leads already have DMs generated.');
      return;
    }

    setIsGenerating(true);
    const dmDate = new Date().toISOString();
    const generated: Lead[] = [];
    let failure: string | null = null;
    let usedAfter: number | null = null;

    for (const lead of pending.slice(0, GENERATION_BATCH)) {
      try {
        // The server meters the quota and returns the authoritative count, so
        // the engine keeps no tally of its own.
        const { dm, used } = await aiAPI.generateDM(config.selectedAIProvider, lead, config.systemPrompt);
        usedAfter = used;
        generated.push({ ...lead, dmContent: dm, dmDate });
      } catch (error: unknown) {
        console.error(`Error generating DM for ${lead.handle}:`, error);
        // Stop the batch but keep what succeeded. Returning here used to discard
        // up to nine finished DMs that had already been paid for.
        failure = error instanceof Error ? error.message : 'Unknown error';
        break;
      }
    }

    if (generated.length > 0) {
      const byId = new Map(generated.map((l) => [l.id, l]));
      setLeads((prev) => prev.map((l) => byId.get(l.id) ?? l));
      await store.saveLeads(generated);
    }
    if (usedAfter !== null) setDmUsed(usedAfter);
    setIsGenerating(false);

    if (failure) {
      toast.error(generated.length > 0
        ? `Generated ${generated.length} DM${generated.length !== 1 ? 's' : ''}, then stopped: ${failure}`
        : `DM generation failed: ${failure}`);
      return;
    }

    const stillPending = pending.length - generated.length;
    toast.success(stillPending > 0
      ? `Generated ${generated.length} DMs — ${stillPending} still pending, click again for the next batch.`
      : `Generated ${generated.length} DM${generated.length !== 1 ? 's' : ''} — review them in the Approval Queue.`);
  }, [config, filteredLeads, limits, dmUsed, toast, store]);

  /** Hand due follow-ups to the extension and stamp the step. The extension
   *  enforces the daily cap on actual sends. */
  const sendFollowUps = useCallback(async (due: DueFollowUp[]): Promise<number> => {
    if (due.length === 0) return 0;

    const delay = storage.getDmDelay();
    sendCampaign({
      leads: due.map((d) => ({ handle: d.lead.handle, message: d.message })),
      minDelay: delay.min,
      maxDelay: delay.max,
      dailyCap: config.dailySendCap ?? 40,
    });

    const sentAt = new Date().toISOString();
    const stamped = due.map((d) => stampFollowUp(d.lead, d.stepIndex, sentAt));
    const byId = new Map(stamped.map((l) => [l.id, l]));
    setLeads((prev) => prev.map((l) => byId.get(l.id) ?? l));
    await store.saveLeads(stamped);

    toast.success(`${due.length} follow-up${due.length !== 1 ? 's' : ''} sent to extension.`);
    return due.length;
  }, [config.dailySendCap, toast, store]);

  const markSentByHandles = useCallback((handles: string[]) => {
    const wanted = new Set(
      handles.map((h) => String(h).toLowerCase().replace(/^@/, '')).filter(Boolean),
    );
    if (wanted.size === 0) return;

    const changed = leadsRef.current.filter(
      (l) => !l.dmSent && wanted.has(l.handle.toLowerCase()),
    );
    if (changed.length === 0) return;

    const now = new Date().toISOString();
    const updated = changed.map((l) => ({ ...l, dmSent: true, dmDate: l.dmDate ?? now }));
    const byId = new Map(updated.map((l) => [l.id, l]));
    setLeads((prev) => prev.map((l) => byId.get(l.id) ?? l));
    store.saveLeads(updated).catch(console.error);
  }, [store]);

  const recordOutcomes = useCallback((outcomes: Outcome[]) => {
    if (outcomes.length === 0) return;

    // Folded over a working copy rather than one `update` call per Outcome.
    // `leadsRef` only refreshes in an effect, so it does not move between
    // iterations of a synchronous loop: reading it per Outcome would diff every
    // Outcome for the same Lead against the same pre-batch row — firing that
    // Lead's `replied` webhook once per thread, and letting the last write drop
    // fields an earlier one had set. Instagram really does hand back two
    // threads for one person (a message request beside the primary thread).
    const changed = new Map<string, Lead>();
    const events: Array<[WebhookEvent, Lead]> = [];

    for (const outcome of outcomes) {
      const target = canonicalHandle(outcome.handle);
      if (!target) continue;

      const matches = (l: Lead) => l.handle.toLowerCase() === target;
      const base =
        [...changed.values()].find(matches) ?? leadsRef.current.find(matches);
      if (!base) continue;

      const updated = applyOutcome(base, outcome);
      if (!updated) continue;

      for (const event of detectTransitions(base, updated)) events.push([event, updated]);
      changed.set(updated.id, updated);
    }

    if (changed.size === 0) return;

    setLeads((prev) => prev.map((l) => changed.get(l.id) ?? l));
    store.saveLeads([...changed.values()]).catch(console.error);
    for (const [event, lead] of events) fireWebhook(config, event, lead);
  }, [config, store]);

  return {
    leads,
    filteredLeads,
    stats,
    dmUsed,
    isGenerating,
    hydrate,
    addLeads,
    approve,
    approveMany,
    reject,
    updateDM,
    update,
    remove,
    removeMany,
    generateDMs,
    sendFollowUps,
    markSentByHandles,
    recordOutcomes,
  };
}
