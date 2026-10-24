import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { AppConfig, DashboardStats, Lead } from './types';
import type { PlanLimits } from './plans';
import { SUPPORT_EMAIL, sendCapOf } from './plans';
import type { WorkspaceStore } from './store';
import type { DueFollowUp } from './followups';
import { db } from './db';
import { aiAPI, isEmptyCompletion } from './api';
import { isTrialLimit } from './trial';
import { filterUtils } from './filters';
import { canonicalHandle, dropKnownHandles, intake } from './intake';
import { stampFollowUp } from './followups';
import { applyOutcome, type Outcome } from './outcome';
import { detectTransitions, fireWebhook, type WebhookEvent } from './webhooks';
import { sendCampaign, type SendReceipt } from './extensionProtocol';
import { storage } from './storage';
import { posthogCapture, posthogLogs } from './posthog';

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

/** How many handles a failure message names before it stops listing them. */
const NAMED_IN_TOAST = 3;

/**
 * Name the Leads something went wrong for, rather than counting them.
 *
 * "3 leads failed" tells the Operator to go hunting through a queue of 250 for
 * rows that look no different from the rest; "@a, @b, @c" tells them what to
 * click.
 */
function nameHandles(handles: string[]): string {
  const shown = handles.slice(0, NAMED_IN_TOAST).map((h) => `@${h}`).join(', ');
  const rest = handles.length - NAMED_IN_TOAST;
  return rest > 0 ? `${shown} +${rest} more` : shown;
}

export interface OutreachEngine {
  leads: Lead[];
  /** `leads` with the Operator's filtering rules applied. */
  filteredLeads: Lead[];
  stats: DashboardStats;
  /** DM generations spent this month, as reported by the server. */
  dmUsed: number;
  isGenerating: boolean;
  /** How far a running generation has got, or `null` when none is running. */
  generation: GenerationProgress | null;

  /** Seed from storage once the cold load resolves. */
  hydrate(leads: Lead[], dmUsed: number): void;

  addLeads(leads: Lead[]): Promise<void>;
  approve(id: string): Promise<void>;
  approveMany(ids: string[]): Promise<void>;
  /** Undo for a bulk approve. Leaves any Lead already Sent alone. */
  unapproveMany(ids: string[]): Promise<void>;
  /** Stamps `handedOffAt` — only for Leads a DELIVERED Handoff carried. */
  markHandedOff(ids: string[]): Promise<void>;
  reject(id: string): Promise<void>;
  /** Bulk skip: out of the queue's stages into Skipped. Never touches a Lead already Sent. */
  rejectMany(ids: string[]): Promise<void>;
  /** Back from Skipped to the stage the Lead's DM puts it in. */
  restoreMany(ids: string[]): Promise<void>;
  updateDM(id: string, content: string): Promise<void>;
  update(lead: Lead): Promise<void>;
  remove(id: string): Promise<void>;
  removeMany(ids: string[]): Promise<void>;
  /**
   * Write DMs for the Leads without one: a batch of {@link GENERATION_BATCH}
   * per call, or with `all`, batch after batch until every one is written,
   * one fails for everyone, or `stopGenerating` is called. Each batch is saved
   * as it finishes, so a long run keeps what it wrote.
   */
  generateDMs(target?: Lead[], options?: { all?: boolean }): Promise<void>;
  /** Ends a running generation after the DM being written now. */
  stopGenerating(): void;
  sendFollowUps(due: DueFollowUp[]): Promise<number>;

  /**
   * Flip Leads to Sent from the sends the extension confirms, stamping
   * `sentAt` from the receipt when it carries a time.
   */
  markSent(receipts: SendReceipt[]): void;
  /**
   * Reflect what Conversations revealed on the Leads behind them — the Inbox's
   * one way into the Lead lifecycle. Fires the same webhooks an Operator's own
   * mark would, and is silent for Leads that already reflect their Outcome,
   * which is the common case: Ingestion re-reads every Conversation on every
   * poll. Takes a batch because that is how Ingestion produces them, and
   * because two threads can share one handle.
   */
  recordOutcomes(outcomes: Outcome[]): void;
  /**
   * Change the deal on the Lead behind an Inbox Conversation: its price, or
   * recording it won. Someone who isn't a Lead yet becomes one, carrying what
   * their Conversation already shows — a call booked before anyone typed a
   * price happened while there was no Lead to stamp it on.
   */
  recordDeal(person: DealPerson, change: (lead: Lead) => Lead, outcome?: Outcome): Promise<void>;
}

export interface GenerationProgress {
  /** DMs attempted so far in this run. */
  done: number;
  /** DMs this run set out to write. */
  total: number;
}

/** Who a deal is with, as the Inbox knows them. */
export interface DealPerson {
  handle: string;
  name?: string;
  avatarUrl?: string;
}

/** The campaign a Lead created from the Inbox belongs to. */
export const INBOX_CAMPAIGN = { id: 'inbox', name: 'From the Inbox' };

export interface OutreachDeps {
  store: WorkspaceStore;
  config: AppConfig;
  limits: PlanLimits;
  toast: {
    success(message: string): void;
    error(message: string): void;
    info(message: string): void;
  };
  /**
   * generate-dm refused because the free trial's DMs are spent. Called after
   * the batch's finished DMs are saved, so leaving the page loses none of them.
   */
  onTrialLimit?: () => void;
}

export function useOutreach({ store, config, limits, toast, onTrialLimit }: OutreachDeps): OutreachEngine {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [dmUsed, setDmUsed] = useState(0);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generation, setGeneration] = useState<GenerationProgress | null>(null);
  // Read between DMs, so Stop lands after the one in flight, never mid-request.
  const stopRef = useRef(false);

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
    posthogLogs.info('campaign_leads_added', {
      event: 'campaign_leads_added',
      added_count: added.length,
      duplicate_count: duplicates,
      quota_capped_count: quotaCapped,
      workspace_persisted: metered,
    });

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

  const approve = useCallback(async (id: string) => {
    await patch(id, (l) => ({ ...l, approved: true, rejected: false }));
    posthogCapture('dm_approved');
  }, [patch]);

  const reject = useCallback(
    (id: string) => patch(id, (l) => ({ ...l, rejected: true, approved: false })),
    [patch],
  );

  const updateDM = useCallback(
    (id: string, content: string) => patch(id, (l) => ({ ...l, dmContent: content })),
    [patch],
  );

  /** One state update + one batched write, for any per-Lead change over many Leads. */
  const patchMany = useCallback(async (ids: string[], change: (lead: Lead) => Lead) => {
    if (ids.length === 0) return;
    const wanted = new Set(ids);
    const updated = leadsRef.current.filter((l) => wanted.has(l.id)).map(change);
    const byId = new Map(updated.map((l) => [l.id, l]));
    setLeads((prev) => prev.map((l) => byId.get(l.id) ?? l));
    if (updated.length > 0) await store.saveLeads(updated);
  }, [store]);

  /**
   * Bulk approve. Silent: the caller confirms and offers the undo, because
   * only the caller knows whether the Operator read these drafts first.
   */
  const approveMany = useCallback(
    (ids: string[]) => patchMany(ids, (l) => ({ ...l, approved: true, rejected: false })),
    [patchMany],
  );

  /** Undo for a bulk approve — back to Ready. Never touches a Lead already Sent. */
  const unapproveMany = useCallback(
    (ids: string[]) => patchMany(ids, (l) => (l.dmSent ? l : { ...l, approved: false })),
    [patchMany],
  );

  /** Bulk skip. A Sent Lead is out of the queue already; skipping it means nothing. */
  const rejectMany = useCallback(
    (ids: string[]) => patchMany(ids, (l) => (l.dmSent ? l : { ...l, rejected: true, approved: false })),
    [patchMany],
  );

  const restoreMany = useCallback(
    (ids: string[]) => patchMany(ids, (l) => ({ ...l, rejected: false })),
    [patchMany],
  );

  /**
   * Stamps the Leads a DELIVERED Handoff carried. Call it only when
   * `sendCampaign(...).delivered` is true — a refused Handoff stamps nothing.
   */
  const markHandedOff = useCallback(
    (ids: string[]) => {
      const at = new Date().toISOString();
      return patchMany(ids, (l) => ({ ...l, handedOffAt: at }));
    },
    [patchMany],
  );

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

  const generateDMs = useCallback(async (target?: Lead[], options: { all?: boolean } = {}) => {
    const remaining = limits.maxDMGenerations - dmUsed;
    if (remaining <= 0) {
      toast.error(`You've used all ${limits.maxDMGenerations} DMs in this month's allowance. It refills next month — email ${SUPPORT_EMAIL} if you need more before then.`);
      return;
    }

    const pending = (target ?? filteredLeads).filter((l) => !l.dmContent).slice(0, remaining);
    if (pending.length === 0) {
      toast.info('All selected leads already have DMs generated.');
      return;
    }

    // One batch per call; with `all`, the whole list, a batch at a time. A
    // scrape is 50–250 Leads, and clicking "next batch" twenty-five times was
    // the price of the one-batch rule.
    const run = options.all ? pending : pending.slice(0, GENERATION_BATCH);
    stopRef.current = false;
    setIsGenerating(true);
    setGeneration({ done: 0, total: run.length });
    const dmDate = new Date().toISOString();
    /** Handles the provider answered for, but with no message in the answer. */
    const blank: string[] = [];
    let failure: string | null = null;
    let trialLimited = false;
    let usedAfter: number | null = null;
    let attempted = 0;
    let landedCount = 0;
    let dropped = 0;

    for (let start = 0; start < run.length && !failure && !stopRef.current; start += GENERATION_BATCH) {
      const written = new Map<string, string>();

      for (const lead of run.slice(start, start + GENERATION_BATCH)) {
        if (stopRef.current) break;
        // A long run outlives the list it was given: a Lead skipped, written
        // or deleted since is not worth a paid generation.
        const now = leadsRef.current.find((l) => l.id === lead.id);
        if (now && (now.dmContent || now.rejected)) continue;
        attempted += 1;
        try {
          // The server meters the quota and returns the authoritative count, so
          // the engine keeps no tally of its own.
          const { dm, used } = await aiAPI.generateDM(config.selectedAIProvider, now ?? lead, config.systemPrompt);
          usedAfter = used;
          // A 200 carrying no message is a failed generation, not a generation.
          // Only a *thrown* error used to count as failure, so a blank was
          // stamped on as `dmContent: ''` — which the queue reads as "no DM yet"
          // (`!!l.dmContent`). The toast said ten and the queue showed none, with
          // nothing anywhere naming the reason. Whitespace is the same failure
          // wearing a truthy value: it renders as a Ready row with an empty body.
          const text = (dm || '').trim();
          if (!text) { blank.push(lead.handle); continue; }
          written.set(lead.id, text);
        } catch (error: unknown) {
          console.error(`Error generating DM for ${lead.handle}:`, error);
          // Two failures wearing one shape. A model that returned nothing is a
          // verdict on THIS Lead — generate-dm already retried, billed nothing,
          // and the next Lead will very likely be fine — so skip and carry on.
          // Anything else (no provider configured, spent quota, dead network) is
          // failing for every Lead alike, and grinding the remaining nine against
          // it just spends the Operator's wait for nine identical errors.
          if (isEmptyCompletion(error)) { blank.push(lead.handle); continue; }
          // Stop the batch but keep what succeeded. Returning here used to discard
          // up to nine finished DMs that had already been paid for.
          failure = error instanceof Error ? error.message : 'Unknown error';
          trialLimited = isTrialLimit(error);
          break;
        } finally {
          setGeneration({ done: attempted, total: run.length });
        }
      }

      // Only a Lead still in the queue can receive its DM. A re-scrape or a bulk
      // delete during the batch removes it, and the `prev.map` below drops the
      // result on the floor — which the count has to reflect, or the toast
      // reports DMs that exist nowhere. `leadsRef` refreshes in an effect, so it
      // is current by the time the awaited batch finishes. The DM lands on the
      // Lead as it is NOW, so a skip or an edit made mid-run survives it.
      const landed: Lead[] = [];
      for (const [id, text] of written) {
        const current = leadsRef.current.find((l) => l.id === id);
        if (current) landed.push({ ...current, dmContent: text, dmDate });
        else dropped += 1;
      }
      if (landed.length > 0) {
        const byId = new Map(landed.map((l) => [l.id, l]));
        setLeads((prev) => prev.map((l) => byId.get(l.id) ?? l));
        await store.saveLeads(landed);
        landedCount += landed.length;
      }
    }

    const stopped = stopRef.current;
    stopRef.current = false;
    if (usedAfter !== null) setDmUsed(usedAfter);
    setIsGenerating(false);
    setGeneration(null);
    posthogLogs.info('dm_generation_batch_completed', {
      event: 'dm_generation_batch_completed',
      attempted_count: attempted,
      generated_count: landedCount,
      empty_completion_count: blank.length,
      dropped_count: dropped,
      completed: !failure && !stopped,
    });
    if (landedCount > 0) {
      posthogCapture('dms_generated', {
        requested_count: attempted,
        generated_count: landedCount,
        remaining_count: pending.length - landedCount,
      });
    }

    const count = (n: number) => `${n} DM${n !== 1 ? 's' : ''}`;

    if (failure) {
      toast.error(landedCount > 0
        ? `Generated ${count(landedCount)}, then stopped: ${failure}`
        : `DM generation failed: ${failure}`);
      // The batch is saved above, so the Operator can go and pay in full.
      if (trialLimited) onTrialLimit?.();
      return;
    }

    // Every Lead the batch touched but did not finish is still pending, so the
    // hint belongs on the error path too. It used to `return` above this line,
    // which meant one fumbled Lead hid the fact that forty more were waiting.
    const stillPending = pending.length - landedCount;
    const nextBatch = stillPending > 0
      ? options.all
        ? ` ${stillPending} still to write.`
        : ` ${stillPending} still pending, click again for the next batch.`
      : '';

    // Name what went wrong — and who it went wrong for — instead of sending the
    // Operator to a queue that does not hold what the toast just promised.
    if (blank.length > 0 || dropped > 0) {
      const why = [
        blank.length > 0 ? `the AI returned an empty message for ${nameHandles(blank)}` : '',
        dropped > 0 ? `${dropped} left the queue mid-batch` : '',
      ].filter(Boolean).join(', and ');
      toast.error(`Generated ${count(landedCount)} — ${why}.${nextBatch}`);
      return;
    }

    if (stopped) {
      toast.info(`Stopped after ${count(landedCount)}.${nextBatch}`);
      return;
    }

    toast.success(stillPending > 0
      ? `Generated ${count(landedCount)} —${nextBatch}`
      : `Generated ${count(landedCount)} — review them in the Approval Queue.`);
  }, [config, filteredLeads, limits, dmUsed, toast, store, onTrialLimit]);

  const stopGenerating = useCallback(() => { stopRef.current = true; }, []);

  /** Hand due follow-ups to the extension and stamp the step. The extension
   *  enforces the daily cap on actual sends. */
  const sendFollowUps = useCallback(async (due: DueFollowUp[]): Promise<number> => {
    if (due.length === 0) return 0;

    const delay = storage.getDmDelay();
    const handoff = sendCampaign({
      leads: due.map((d) => ({ handle: d.lead.handle, message: d.message })),
      minDelay: delay.min,
      maxDelay: delay.max,
      dailyCap: sendCapOf({ dailySendCap: config.dailySendCap }),
    });
    // Stamping a step the extension never received would burn it: the Lead
    // reads as followed up, and the touch is never retried. Leave them due.
    if (!handoff.delivered) {
      toast.error(handoff.reason!);
      return 0;
    }

    const sentAt = new Date().toISOString();
    const stamped = due.map((d) => stampFollowUp(d.lead, d.stepIndex, sentAt, d.rescue));
    const byId = new Map(stamped.map((l) => [l.id, l]));
    setLeads((prev) => prev.map((l) => byId.get(l.id) ?? l));
    await store.saveLeads(stamped);
    posthogLogs.info('follow_up_handoff_completed', {
      event: 'follow_up_handoff_completed',
      follow_up_count: due.length,
      workspace_persisted: metered,
    });
    posthogCapture('follow_ups_handed_to_extension', {
      follow_up_count: due.length,
      min_delay: delay.min,
      max_delay: delay.max,
    });

    toast.success(`${due.length} follow-up${due.length !== 1 ? 's' : ''} sent to extension.`);
    return due.length;
  }, [config.dailySendCap, metered, toast, store]);

  const markSent = useCallback((receipts: SendReceipt[]) => {
    // One handle can arrive in several receipts — today's log and the all-time
    // list both name it, and only the log says when. Keep the earliest time:
    // the first confirmed send to a Lead not yet Sent is its opener.
    const wanted = new Map<string, string | undefined>();
    for (const r of receipts) {
      const handle = String(r.handle).toLowerCase().replace(/^@/, '');
      if (!handle) continue;
      const times = [wanted.get(handle), r.sentAt].filter((t): t is string => !!t).sort();
      wanted.set(handle, times[0]);
    }
    if (wanted.size === 0) return;

    // Only a Lead becoming Sent is stamped. A later receipt for a Lead already
    // Sent is a follow-up or an Inbox reply going out the same way, and dating
    // the opener from it would move the opener to the wrong day.
    const changed = leadsRef.current.filter(
      (l) => !l.dmSent && wanted.has(l.handle.toLowerCase()),
    );
    if (changed.length === 0) return;

    const now = new Date().toISOString();
    const updated = changed.map((l) => {
      const sentAt = wanted.get(l.handle.toLowerCase());
      return { ...l, dmSent: true, dmDate: l.dmDate ?? now, ...(sentAt ? { sentAt } : {}) };
    });
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

  const recordDeal = useCallback(async (person: DealPerson, change: (lead: Lead) => Lead, outcome?: Outcome) => {
    const handle = canonicalHandle(person.handle);
    if (!handle) return;

    const existing = leadsRef.current.find((l) => l.handle.toLowerCase() === handle);
    let before = existing;
    let base = existing;
    if (!before) {
      // Not metered against the monthly Lead allowance: it bounds scraping,
      // and this is someone already talking to the Operator.
      const [created] = intake({
        source: 'inbox',
        rows: [{ handle, name: person.name, profilePicUrl: person.avatarUrl }],
        campaignId: INBOX_CAMPAIGN.id,
      }).leads;
      if (!created) return;
      before = { ...created, campaignName: INBOX_CAMPAIGN.name };
      base = (outcome && applyOutcome(before, outcome)) ?? before;
    }

    const updated = change(base!);
    setLeads((prev) => (existing
      ? prev.map((l) => (l.id === updated.id ? updated : l))
      : [...prev, updated]));
    // Diffed against the Lead as it stood before this call — for a new Lead,
    // before its Conversation was applied — so a carried-over booking fires
    // `booked` once, like any other.
    for (const event of detectTransitions(before, updated)) fireWebhook(config, event, updated);
    await store.saveLeads([updated]);
  }, [config, store]);

  return {
    leads,
    filteredLeads,
    stats,
    dmUsed,
    isGenerating,
    generation,
    hydrate,
    addLeads,
    approve,
    approveMany,
    unapproveMany,
    markHandedOff,
    reject,
    rejectMany,
    restoreMany,
    updateDM,
    update,
    remove,
    removeMany,
    generateDMs,
    stopGenerating,
    sendFollowUps,
    markSent,
    recordOutcomes,
    recordDeal,
  };
}
