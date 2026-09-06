import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { Sidebar } from '../components/Sidebar';
import { MetricsGrid } from '../components/dashboard/MetricsGrid';
import { ConversionChart } from '../components/dashboard/ConversionChart';
import { AIAnalyst } from '../components/dashboard/AIAnalyst';
import { OnboardingChecklist } from '../components/dashboard/OnboardingChecklist';
import { CampaignBuilder } from '../components/campaign/CampaignBuilder';
import { ApprovalQueue } from '../components/campaign/ApprovalQueue';
import { FollowUpSequencer } from '../components/campaign/FollowUpSequencer';
import { RevenueCalculator } from '../components/calculator/RevenueCalculator';
import { SettingsPanel } from '../components/settings/SettingsPanel';
import { InboxView } from '../components/inbox/InboxView';
import ProfilePage from './ProfilePage';
import { HealthScore } from '../components/dashboard/HealthScore';
import { storage } from '../lib/storage';
import { db } from '../lib/db';
import { filterUtils } from '../lib/filters';
import { aiAPI, type ReplyResult } from '../lib/api';
import { ingestThreads, type RawThread } from '../lib/inbox';
import { stampFollowUp, type DueFollowUp } from '../lib/followups';
import { fireWebhook, detectTransitions } from '../lib/webhooks';
import { DASHBOARD_ROUTES, type DashboardPath } from '../lib/routes';
import { dropKnownHandles } from '../lib/intake';
import { Lead, AppConfig, Conversation, Message } from '../lib/types';
import { useAuth } from '../contexts/AuthContext';
import { usePlan } from '../contexts/PlanContext';
import { useToast } from '../components/common/Toast';
import { Loader2, Sparkles, Menu } from 'lucide-react';

/** Time-aware greeting for the dashboard header */
function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 5) return 'Working late';
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

// ─── Default config ───────────────────────────────────────────────────────────
// Seed system prompt uses the "universal" high-reply structure (identity + voice
// + recipe). Users regenerate their own via Settings → AI Prompt Wizard.
const DEFAULT_CONFIG: AppConfig = {
  systemPrompt: `You are the founder of MagnetEngine.

You help agency owners, coaches, and consultants achieve a calendar that fills with booked calls without manual prospecting.

You send Instagram DMs to people whose profiles you actually looked at. You write like a real person texting a peer — not a marketer, not a bot, not a LinkedIn influencer.

## YOUR VOICE

Write like you're texting a friend at 11pm after three coffees.
- Start sentences with "So," "Wait," "Actually"
- Use "idk," "tbh," "ngl," "lol" naturally
- Sentence fragments are fine
- Imperfect grammar is okay if it sounds natural

## WHAT MAKES YOUR DMs WORK

1. FIRST SENTENCE: Specific observation about THEIR world
   - Reference their bio, niche, follower count, location, or recent content
   - Show you did homework — not "love your content," but "saw you just hit 10k, what's working?"
   - Connect their world to yours without mentioning your product

2. SECOND SENTENCE: Question about THEIR process or pain
   - Ask how they find clients, fill their calendar, or handle outreach
   - Assume they have a manual or broken process
   - Make it easy to answer in 5 words or less

3. NEVER IN THE FIRST DM:
   - Your product name
   - "I help," "I specialize," "We offer," "Our company"
   - "Quick question," "Just wanted to," "Would love to"
   - Links, calls to action, demo requests
   - "Leverage," "synergies," "optimize," "strategize," "solutions"
   - Perfect parallel structure or corporate speak

4. SOUND LIKE:
   - A peer who does the same work
   - Someone who scrolled their profile at 11pm
   - A human who occasionally says "wait," "so," "actually," "idk," "tbh," "ngl"

## THE RECIPE

For every lead:
1. READ their bio. What's the ONE thing that stands out?
2. ASK: What do they sell? Who do they sell to? How do they find clients?
3. CONNECT: How does their world touch yours without mentioning your product?
4. QUESTION: What's a short question about their process they'd actually answer?
5. CHECK: Does this sound like a peer, or a pitch?

## OUTPUT

Just the DM text. No quotes. No labels. No preamble. Raw text only.`,
  replySystemPrompt: `You are the founder of MagnetEngine, replying to Instagram DMs from people who answered your cold outreach.

Your ONE goal: move interested people toward booking a quick call. You are warm, human, and low-pressure — never a pushy salesperson.

## YOUR VOICE
- Text like a real person, not a brand. Short messages. Lowercase is fine.
- Match their energy. If they're casual, be casual.
- One idea per message. Ask one question at a time.
- Never send walls of text.

## HOW TO HANDLE THE CONVERSATION
1. If they show interest ("tell me more", "how does it work", "what do you do") → give a one-sentence answer, then offer the call and share your booking link.
2. If they raise an objection (price, time, "not sure", "already have X") → acknowledge it honestly, answer briefly, and gently re-offer the call.
3. If they're clearly not interested or say stop → thank them, wish them well, do not push.
4. If they ask a direct question → answer it plainly first, then steer back toward the call.

## BOOKING
When they're interested or agree to talk, share the booking link naturally (e.g. "cool — grab a time that works here: {LINK}"). Only send the link once they've shown interest.

## NEVER
- Never be robotic, formal, or use corporate speak.
- Never send more than ~2 short sentences.
- Never invent facts about their business or make promises about results.

## OUTPUT
Just the reply text. No quotes, no labels, no preamble. Raw text only.`,
  includeKeywords: ['agency', 'founder', 'coach', 'consultant', 'SMMA', 'freelancer', 'marketing', 'growth', 'entrepreneur', 'CEO'],
  excludeKeywords: ['bot', 'giveaway', 'follow for follow', 'f4f', 'crypto', 'NFT', 'MLM', 'dropship'],
  minFollowers: 1000,
  maxFollowers: 500000,
  accountType: 'all',
  selectedAIProvider: 'claude',
  dailySendCap: 40,
  founderName: '',
  founderRole: 'founder',
  businessName: 'MagnetEngine',
  businessNiche: 'AI-powered Instagram lead generation and outreach automation',
  targetAudience: 'agency owners, coaches, and consultants who do cold Instagram outreach',
  valueProposition: 'a calendar that fills with booked calls without manual prospecting',
  dmTone: 'casual',
};

// DM generation runs sequentially against the AI provider, so one click
// processes a batch rather than the whole queue. The user is told what's left
// and clicks again — silently doing 10 of 250 reads as a broken button.
const GENERATION_BATCH = 10;

// ─── Main dashboard shell ─────────────────────────────────────────────────────
const DashboardShell: React.FC = () => {
  const { user, signOut } = useAuth();
  const { limits } = usePlan();
  const navigate = useNavigate();
  const toast = useToast();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [leads, setLeads] = useState<Lead[]>([]);
  const [config, setConfig] = useState<AppConfig>(DEFAULT_CONFIG);

  // Derived, not stored. Keeping these in state meant every lead mutation
  // committed twice: once for setLeads, then again when the effect wrote the
  // recomputed values back — and the second commit re-rendered the whole
  // Approval Queue table for no visible change.
  const filteredLeads = useMemo(
    () => filterUtils.filterLeads(leads, config),
    [leads, config],
  );
  const stats = useMemo(() => filterUtils.calculateStats(leads), [leads]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [dataLoading, setDataLoading] = useState(true);
  // Real per-day sent count reported by the extension (source of truth for what
  // actually went out), vs the app's optimistic handoff count.
  const [extStats, setExtStats] = useState<{ count: number; cap: number } | null>(null);
  const [dmUsed, setDmUsed] = useState(0);

  // ─── Inbox (AI SDR) ─────────────────────────────────────────────────────────
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);

  // Live mirror of leads so the extension bridge can reconcile without
  // re-subscribing on every leads change.
  const leadsRef = useRef<Lead[]>([]);
  useEffect(() => { leadsRef.current = leads; }, [leads]);
  // Live mirrors for the inbox so the bridge/autopilot read current state
  // without re-subscribing on every message.
  const convosRef = useRef<Conversation[]>([]);
  const messagesRef = useRef<Message[]>([]);
  const configRef = useRef<AppConfig>(DEFAULT_CONFIG);
  useEffect(() => { convosRef.current = conversations; }, [conversations]);
  useEffect(() => { messagesRef.current = messages; }, [messages]);
  useEffect(() => { configRef.current = config; }, [config]);
  const [headerAvatar, setHeaderAvatar] = useState<string | null>(() =>
    user ? localStorage.getItem(`avatar_${user.id}`) : null
  );

  useEffect(() => {
    const handler = (e: Event) => setHeaderAvatar((e as CustomEvent<string>).detail);
    window.addEventListener('avatar-updated', handler);
    return () => window.removeEventListener('avatar-updated', handler);
  }, []);

  // Load data from Supabase (or localStorage fallback) on mount.
  // Keyed on the user ID (not the user object) so token refreshes on tab
  // refocus don't re-trigger a full reload of the pipeline.
  const userId = user?.id;
  useEffect(() => {
    if (!userId) return;

    // Only what the dashboard needs to paint. The inbox (conversations +
    // every message ever synced) used to be awaited here too, so first paint
    // was blocked on the user's entire chat history.
    Promise.all([
      db.getLeads(userId),
      db.getConfig(userId),
      db.getDMUsage(userId),
    ]).then(([savedLeads, savedConfig, dmUsage]) => {
      setLeads(savedLeads ?? []);
      setConfig(savedConfig ?? DEFAULT_CONFIG);
      setDmUsed(dmUsage.used);
      setDataLoading(false);
    });
  }, [userId]);

  // Inbox history loads behind first paint. Until it lands, extension snapshots
  // are parked rather than ingested: `ingestThreads` dedupes echoed outbound
  // messages against the messages already in memory, so ingesting against a
  // half-loaded inbox would duplicate our optimistic sends.
  const inboxReady = useRef(false);
  const pendingThreads = useRef<RawThread[] | null>(null);
  const ingestInboxRef = useRef<(threads: RawThread[]) => Conversation[]>(() => []);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;

    Promise.all([db.getConversations(userId), db.getMessages(userId)]).then(
      ([savedConvos, savedMessages]) => {
        if (cancelled) return;
        setConversations(savedConvos ?? []);
        setMessages(savedMessages ?? []);
        convosRef.current = savedConvos ?? [];
        messagesRef.current = savedMessages ?? [];
        inboxReady.current = true;

        const parked = pendingThreads.current;
        pendingThreads.current = null;
        if (parked) ingestInboxRef.current(parked);
      },
    );

    return () => {
      cancelled = true;
      inboxReady.current = false;
    };
  }, [userId]);

  // Mark leads as sent for real, based on the handles the extension confirms
  // it actually sent (idempotent — only flips leads not already sent).
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
    setLeads((prev) => {
      const next = prev.map((l) => byId.get(l.id) ?? l);
      if (!user) storage.setLeads(next);
      return next;
    });
    if (user) db.upsertLeads(updated, user.id).catch(console.error);
  }, [user]);

  // Merge a fresh inbox snapshot from the extension into state + persist the
  // changed rows. Reads live refs so it can stay a stable callback. Returns the
  // conversations that gained a NEW inbound message (for autopilot).
  const ingestInbox = useCallback((threads: RawThread[]): Conversation[] => {
    if (!Array.isArray(threads) || threads.length === 0) return [];
    if (!inboxReady.current) {
      // Keep the newest snapshot; the loader replays it once history is in.
      pendingThreads.current = threads;
      return [];
    }
    const { conversations, messages, changedConversations, newMessages } = ingestThreads(
      threads, convosRef.current, messagesRef.current,
    );
    if (changedConversations.length === 0 && newMessages.length === 0) return [];

    setConversations(conversations);
    setMessages(messages);
    if (user) {
      if (changedConversations.length) db.upsertConversations(changedConversations, user.id).catch(console.error);
      if (newMessages.length) db.upsertMessages(newMessages, user.id).catch(console.error);
    }
    // Conversations whose newest message is a freshly-arrived inbound.
    const newInboundConvIds = new Set(
      newMessages.filter((m) => m.direction === 'in').map((m) => m.conversationId),
    );
    return changedConversations.filter((c) => c.needsReply && newInboundConvIds.has(c.id));
  }, [user]);

  // Let the loader replay a parked snapshot through the current ingest closure.
  useEffect(() => { ingestInboxRef.current = ingestInbox; }, [ingestInbox]);

  // Ref so the bridge effect can call the latest autopilot handler without
  // re-subscribing (defined further down).
  const autopilotRef = useRef<(convos: Conversation[]) => void>(() => {});

  // ─── Extension bridge ───────────────────────────────────────────────────────
  // The extension reports what it ACTUALLY sent (real daily count + sent log)
  // and pushes inbox snapshots, so the header, per-lead "sent", and the Inbox
  // all reflect reality, not handoffs.
  useEffect(() => {
    const onMessage = (e: MessageEvent) => {
      if (e.source !== window) return;
      const d = e.data;
      if (!d || typeof d.type !== 'string') return;

      if (d.type === 'MAGNET_ENGINE_STATS') {
        setExtStats({ count: d.dailySentCount ?? 0, cap: d.dailyCap ?? 0 });
        // Reconcile against both: `sentLog` resets at midnight, `sentHandles`
        // never does, so a dashboard opened the next morning still learns what
        // went out yesterday instead of offering to send it again.
        markSentByHandles([
          ...(d.sentLog ?? []).map((x: { handle?: string }) => x.handle ?? ''),
          ...(d.sentHandles ?? []),
        ]);
      } else if (d.type === 'MAGNET_ENGINE_SENT') {
        setExtStats({ count: d.dailySentCount ?? 0, cap: d.dailyCap ?? 0 });
        if (d.handle) markSentByHandles([d.handle]);
      } else if (d.type === 'MAGNET_ENGINE_INBOX') {
        const newInbound = ingestInbox(d.threads ?? []);
        if (newInbound.length) autopilotRef.current(newInbound);
      }
    };
    window.addEventListener('message', onMessage);

    const requestSync = () => {
      window.postMessage({ type: 'MAGNET_ENGINE_GET_STATS' }, '*');
      window.postMessage({ type: 'MAGNET_ENGINE_GET_INBOX' }, '*');
    };
    requestSync();                                   // on mount
    window.addEventListener('focus', requestSync);   // and when the tab refocuses

    return () => {
      window.removeEventListener('message', onMessage);
      window.removeEventListener('focus', requestSync);
    };
  }, [markSentByHandles, ingestInbox]);

  // ─── Lead mutation helpers ──────────────────────────────────────────────────
  const handleUpdateConfig = useCallback(async (newConfig: AppConfig) => {
    setConfig(newConfig);
    storage.setConfig(newConfig); // keep localStorage in sync as fallback
    if (user) await db.setConfig(newConfig, user.id);
  }, [user]);

  const handleAddLeads = useCallback(async (newLeads: Lead[]) => {
    // Within-batch dedupe already happened in intake; this is the cross-batch
    // half — the same profile turns up across overlapping searches, repeat
    // scrapes, and CSV re-imports.
    const { fresh: deduped, duplicates: duplicateCount } = dropKnownHandles(
      newLeads,
      leadsRef.current.map((l) => l.handle),
    );

    if (deduped.length === 0) {
      if (duplicateCount > 0) {
        toast.info(`All ${duplicateCount} lead${duplicateCount !== 1 ? 's' : ''} were already in your queue — nothing new to add.`);
      }
      return;
    }

    let toAdd = deduped;
    let quotaCapped = 0;

    // Monthly quotas (skipped in dev mode without a user)
    if (user) {
      if (db.getMonthlyCampaignCount(user.id) >= limits.maxCampaignsPerMonth) {
        toast.error(`You've used all ${limits.maxCampaignsPerMonth} campaigns this month. Resets on the 1st.`);
        return;
      }
      const remaining = limits.maxLeadsPerMonth - db.getMonthlyLeadCount(user.id);
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
    setLeads((prev) => {
      const merged = [...prev, ...added];
      if (user) db.upsertLeads(added, user.id).catch(console.error);
      return merged;
    });

    if (user) {
      db.incrementMonthlyLeadCount(user.id, added.length);
      db.incrementMonthlyCampaignCount(user.id);
    }

    // Only worth a toast when something was left out — a clean add is
    // already confirmed by the calling component (CampaignBuilder / CsvImport).
    if (duplicateCount > 0 || quotaCapped > 0) {
      const parts = [`Added ${added.length} lead${added.length !== 1 ? 's' : ''}`];
      if (duplicateCount > 0) parts.push(`${duplicateCount} already in your queue`);
      if (quotaCapped > 0) parts.push(`${quotaCapped} over your ${limits.maxLeadsPerMonth}/month limit`);
      toast.info(`${parts[0]} · skipped ${parts.slice(1).join(' + ')}.`);
    }
  }, [user, limits.maxCampaignsPerMonth, limits.maxLeadsPerMonth, toast]);

  const handleDeleteLead = useCallback(async (id: string) => {
    setLeads((prev) => {
      const next = prev.filter((l) => l.id !== id);
      if (!user) storage.setLeads(next); // dev/localStorage: db.deleteLead no-ops
      return next;
    });
    if (user) await db.deleteLead(id);
  }, [user]);

  /** Bulk delete — one state update + one batched DB write */
  const handleDeleteLeads = useCallback(async (ids: string[]) => {
    if (ids.length === 0) return;
    const idSet = new Set(ids);
    setLeads((prev) => {
      const next = prev.filter((l) => !idSet.has(l.id));
      if (!user) storage.setLeads(next); // dev/localStorage: db.deleteLeads no-ops
      return next;
    });
    if (user) await db.deleteLeads(ids);
    toast.success(`${ids.length} lead${ids.length !== 1 ? 's' : ''} deleted from the queue`);
  }, [user, toast]);

  const handleUpdateLead = useCallback(async (updated: Lead) => {
    let oldLead: Lead | undefined;
    setLeads((prev) => prev.map((l) => {
      if (l.id === updated.id) { oldLead = l; return updated; }
      return l;
    }));
    if (oldLead) {
      for (const event of detectTransitions(oldLead, updated)) {
        fireWebhook(config, event, updated);
      }
    }
    if (user) await db.upsertLead(updated, user.id);
  }, [user, config]);

  // Handoff to the extension is done by ApprovalQueue; a lead is marked "sent"
  // for real only when the extension confirms it (see the extension bridge), so
  // capped/skipped DMs no longer count as sent. Nothing to do optimistically.
  const handleLeadsSent = useCallback(async (_ids: string[]) => {}, []);

  /** Dispatch due follow-ups to the extension via the same channel as initial DMs.
   *  The extension enforces the daily cap on actual sends; here we just hand off
   *  and stamp the step so the sequencer can schedule the next touch. */
  const handleFollowUpsSent = useCallback(async (due: DueFollowUp[]): Promise<number> => {
    if (due.length === 0) return 0;

    const delay = storage.getDmDelay();
    window.postMessage({
      type: 'MAGNET_ENGINE_CAMPAIGN',
      payload: {
        leads: due.map((d) => ({ handle: d.lead.handle, message: d.message })),
        minDelay: delay.min,
        maxDelay: delay.max,
        dailyCap: config.dailySendCap ?? 40,
      },
    }, '*');

    const sentAt = new Date().toISOString();
    const batch = due.map((d) => stampFollowUp(d.lead, d.stepIndex, sentAt));
    const batchById = new Map(batch.map((l) => [l.id, l]));
    setLeads((prev) => prev.map((l) => batchById.get(l.id) ?? l));
    if (user) await db.upsertLeads(batch, user.id);

    toast.success(`${due.length} follow-up${due.length !== 1 ? 's' : ''} sent to extension.`);
    return due.length;
  }, [user, config.dailySendCap, toast]);

  // ─── Inbox (AI SDR) handlers ────────────────────────────────────────────────

  /** Mark the lead behind a conversation as booked (fires the booked webhook). */
  const markLeadBooked = useCallback((handle: string) => {
    const h = handle.toLowerCase().replace(/^@/, '');
    const lead = leadsRef.current.find((l) => l.handle.toLowerCase() === h);
    if (lead && !lead.booked) {
      handleUpdateLead({ ...lead, booked: true, positiveReply: true, replied: true, status: 'won' });
    }
  }, [handleUpdateLead]);

  /** Persist a single conversation to state + DB; if it just became booked,
   *  reflect that on the underlying lead. */
  const handleUpdateConversation = useCallback((conv: Conversation) => {
    const prev = convosRef.current.find((c) => c.id === conv.id);
    setConversations((list) => list.map((c) => (c.id === conv.id ? conv : c)));
    if (user) db.upsertConversations([conv], user.id).catch(console.error);
    if (conv.status === 'booked' && prev?.status !== 'booked') markLeadBooked(conv.handle);
  }, [user, markLeadBooked]);

  /** Ask the backend for an AI reply draft + intent for a conversation. */
  const handleGenerateReply = useCallback(async (conv: Conversation): Promise<ReplyResult> => {
    const history = messagesRef.current
      .filter((m) => m.conversationId === conv.id)
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
      .map((m) => ({ direction: m.direction, text: m.text }));
    const cfg = configRef.current;
    const result = await aiAPI.generateReply(cfg.selectedAIProvider, {
      messages: history,
      contact: { handle: conv.handle, name: conv.name },
      systemPrompt: cfg.replySystemPrompt ?? '',
      calendarLink: cfg.calendarLink,
    });
    // Reflect detected intent (drives filters + booking surfacing).
    const nextStatus = result.intent === 'booked' ? 'booked' : conv.status;
    handleUpdateConversation({ ...conv, intent: result.intent, status: nextStatus });
    return result;
  }, [handleUpdateConversation]);

  /** Send a reply: optimistic append + hand off to the extension via the same
   *  send path as opening DMs (DMing the handle appends to the IG thread). */
  const handleSendReply = useCallback(async (conv: Conversation, text: string) => {
    const body = text.trim();
    if (!body) return;
    const now = new Date().toISOString();
    const msg: Message = {
      id: `local_${conv.id}_${Date.now()}`,
      conversationId: conv.id,
      direction: 'out',
      text: body,
      createdAt: now,
    };
    setMessages((prev) => [...prev, msg]);
    const updatedConv: Conversation = {
      ...conv, lastMessageAt: now, lastMessageText: body, needsReply: false, unread: false,
    };
    setConversations((list) => list.map((c) => (c.id === conv.id ? updatedConv : c)));
    if (user) {
      db.upsertMessages([msg], user.id).catch(console.error);
      db.upsertConversations([updatedConv], user.id).catch(console.error);
    }

    const delay = storage.getDmDelay();
    window.postMessage({
      type: 'MAGNET_ENGINE_CAMPAIGN',
      payload: {
        leads: [{ handle: conv.handle, message: body }],
        minDelay: delay.min,
        maxDelay: delay.max,
        dailyCap: configRef.current.dailySendCap ?? 40,
      },
    }, '*');
    toast.success(`Reply queued to @${conv.handle}`);
  }, [user, toast]);

  /** Autopilot: when new inbound arrives and autopilot is on, draft + auto-send
   *  a reply (paced/capped by the extension). Skips clearly-uninterested leads.*/
  const handleAutopilot = useCallback(async (newInbound: Conversation[]) => {
    if (!configRef.current.autopilot) return;
    for (const conv of newInbound) {
      const latest = convosRef.current.find((c) => c.id === conv.id) ?? conv;
      if (!latest.needsReply || latest.status === 'closed') continue;
      try {
        const result = await handleGenerateReply(latest);
        if (result.intent === 'not_interested') continue; // don't chase
        await handleSendReply(latest, result.reply);
      } catch (e) {
        console.error('[autopilot] failed for', conv.handle, e);
      }
    }
  }, [handleGenerateReply, handleSendReply]);

  useEffect(() => { autopilotRef.current = handleAutopilot; }, [handleAutopilot]);

  /** Bulk-approve: one state update + one batched DB write */
  const handleApproveLeads = useCallback(async (ids: string[]) => {
    if (ids.length === 0) return;
    const idSet = new Set(ids);
    const updatedBatch: Lead[] = [];
    setLeads((prev) => prev.map((l) => {
      if (idSet.has(l.id)) {
        const updated = { ...l, approved: true, rejected: false };
        updatedBatch.push(updated);
        return updated;
      }
      return l;
    }));
    if (user && updatedBatch.length > 0) await db.upsertLeads(updatedBatch, user.id);
    toast.success(`${ids.length} DM${ids.length !== 1 ? 's' : ''} approved`);
  }, [user, toast]);

  const handleApproveLead = useCallback(async (id: string) => {
    let updated: Lead | undefined;
    setLeads((prev) => prev.map((l) => {
      if (l.id === id) { updated = { ...l, approved: true, rejected: false }; return updated; }
      return l;
    }));
    if (user && updated) await db.upsertLead(updated, user.id);
  }, [user]);

  const handleRejectLead = useCallback(async (id: string) => {
    let updated: Lead | undefined;
    setLeads((prev) => prev.map((l) => {
      if (l.id === id) { updated = { ...l, rejected: true, approved: false }; return updated; }
      return l;
    }));
    if (user && updated) await db.upsertLead(updated, user.id);
  }, [user]);

  const handleUpdateDM = useCallback(async (id: string, content: string) => {
    let updated: Lead | undefined;
    setLeads((prev) => prev.map((l) => {
      if (l.id === id) { updated = { ...l, dmContent: content }; return updated; }
      return l;
    }));
    if (user && updated) await db.upsertLead(updated, user.id);
  }, [user]);

  const handleGenerateDMs = useCallback(async (targetLeads?: Lead[]) => {
    const remaining = limits.maxDMGenerations - dmUsed;
    if (remaining <= 0) {
      toast.error(`You've used all ${limits.maxDMGenerations} DM generations for this month. Upgrade your plan to generate more.`);
      return;
    }

    const leadsToProcess = (targetLeads ?? filteredLeads).filter((l) => !l.dmContent).slice(0, remaining);
    if (leadsToProcess.length === 0) {
      toast.info('All selected leads already have DMs generated.');
      return;
    }

    setIsGenerating(true);
    const dmDate = new Date().toISOString();
    const updatedBatch: Lead[] = [];
    let failure: string | null = null;

    for (const lead of leadsToProcess.slice(0, GENERATION_BATCH)) {
      try {
        const dm = await aiAPI.generateDM(config.selectedAIProvider, lead, config.systemPrompt);
        updatedBatch.push({ ...lead, dmContent: dm, dmDate });
      } catch (error: any) {
        console.error(`Error generating DM for ${lead.name}:`, error);
        // Stop the batch, but keep what already succeeded. Returning here used
        // to discard up to nine finished DMs that had already been paid for.
        failure = error?.message ?? 'Unknown error';
        break;
      }
    }

    const successCount = updatedBatch.length;
    if (successCount > 0) {
      setLeads((prev) => prev.map((l) => {
        const updated = updatedBatch.find((u) => u.id === l.id);
        return updated ?? l;
      }));
      if (user) {
        await db.upsertLeads(updatedBatch, user.id);
        const newUsed = await db.incrementDMUsage(user.id, successCount);
        setDmUsed(newUsed);
      }
    }

    setIsGenerating(false);

    if (failure) {
      toast.error(successCount > 0
        ? `Generated ${successCount} DM${successCount !== 1 ? 's' : ''}, then stopped: ${failure}`
        : `DM generation failed: ${failure}`);
      return;
    }

    const stillPending = leadsToProcess.length - successCount;
    toast.success(stillPending > 0
      ? `Generated ${successCount} DMs — ${stillPending} still pending, click again for the next batch.`
      : `Generated ${successCount} DM${successCount !== 1 ? 's' : ''} — review them in the Approval Queue.`);
  }, [config, filteredLeads, user, limits, dmUsed, toast]);

  const handleLogout = useCallback(async () => {
    await signOut();
    navigate('/login');
  }, [signOut, navigate]);

  if (dataLoading) {
    return (
      <div className="min-h-screen bg-[#030604] flex items-center justify-center">
        <div className="flex items-center gap-3 text-zinc-600">
          <Loader2 className="w-5 h-5 animate-spin text-emerald-500" />
          <span className="text-sm font-mono">Loading your pipeline…</span>
        </div>
      </div>
    );
  }

  // Keyed by DashboardPath, so a page declared in the routes manifest without
  // an element here (or an element with no route) fails to compile instead of
  // 404ing at runtime.
  const pages: Record<DashboardPath, React.ReactNode> = {
    '/dashboard': (
      <div className="p-8 space-y-6 max-w-7xl">
        <div className="flex items-start justify-between">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-white/8 bg-white/4 text-[10px] font-semibold tracking-[0.2em] text-zinc-500 uppercase mb-3">
              Overview
            </div>
            <h1 className="text-2xl font-semibold text-white tracking-tight leading-none">
              {getGreeting()}{(() => {
                const first = user?.user_metadata?.first_name;
                const last = user?.user_metadata?.last_name;
                const full = [first, last].filter(Boolean).join(' ');
                return full ? `, ${full}` : user?.email ? `, ${user.email.split('@')[0]}` : '';
              })()}
            </h1>
            <p className="text-zinc-600 text-sm mt-1.5">Your pipeline is live and running.</p>
          </div>
        </div>
        <OnboardingChecklist leads={leads} config={config} />
        <HealthScore leads={leads} />
        <MetricsGrid stats={stats} />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2">
            <ConversionChart leads={leads} />
          </div>
          <AIAnalyst stats={stats} />
        </div>
      </div>
    ),

    '/campaign': (
      <div className="p-8 space-y-6 max-w-7xl">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-white/8 bg-white/4 text-[10px] font-semibold tracking-[0.2em] text-zinc-500 uppercase mb-3">Outreach</div>
          <h1 className="text-2xl font-semibold text-white tracking-tight">Campaign Builder</h1>
          <p className="text-zinc-600 text-sm mt-1.5">Search Instagram for prospects and add them to your outreach queue</p>
        </div>
        <CampaignBuilder onLeadsScraped={handleAddLeads} />
      </div>
    ),

    '/queue': (
      <div className="p-8 space-y-6 max-w-7xl">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-white/8 bg-white/4 text-[10px] font-semibold tracking-[0.2em] text-zinc-500 uppercase mb-3">Review</div>
          <h1 className="text-2xl font-semibold text-white tracking-tight">Approval Queue</h1>
          <p className="text-zinc-600 text-sm mt-1.5">Review and approve AI-generated DMs before sending to the extension</p>
        </div>
        <ApprovalQueue
          leads={leads}
          config={config}
          onGenerateDMs={handleGenerateDMs}
          isGenerating={isGenerating}
          onDeleteLead={handleDeleteLead}
          onDeleteLeads={handleDeleteLeads}
          onLeadsSent={handleLeadsSent}
          onApproveLead={handleApproveLead}
          onApproveLeads={handleApproveLeads}
          onRejectLead={handleRejectLead}
          onUpdateDM={handleUpdateDM}
          onUpdateLead={handleUpdateLead}
        />
      </div>
    ),

    '/inbox': (
      <div className="p-4 sm:p-8 max-w-7xl h-[calc(100vh-3.5rem)]">
        <InboxView
          conversations={conversations}
          messages={messages}
          config={config}
          onGenerateReply={handleGenerateReply}
          onSendReply={handleSendReply}
          onUpdateConversation={handleUpdateConversation}
          onUpdateConfig={handleUpdateConfig}
        />
      </div>
    ),

    '/follow-ups': (
      <div className="p-8 max-w-7xl">
        <div className="mb-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-white/8 bg-white/4 text-[10px] font-semibold tracking-[0.2em] text-zinc-500 uppercase mb-3">Automation</div>
          <h1 className="text-2xl font-semibold text-white tracking-tight">Follow-Up Sequencer</h1>
          <p className="text-zinc-600 text-sm mt-1.5">
            Build automated follow-up sequences — most deals close on the 2nd or 3rd touch
          </p>
        </div>
        <FollowUpSequencer leads={leads} onSendFollowUps={handleFollowUpsSent} />
      </div>
    ),

    '/calculator': <div className="p-8 max-w-7xl"><RevenueCalculator /></div>,

    '/settings': (
      <div className="p-8 max-w-4xl">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-white/8 bg-white/4 text-[10px] font-semibold tracking-[0.2em] text-zinc-500 uppercase mb-3">Configuration</div>
        <h1 className="text-2xl font-semibold text-white tracking-tight mb-6">Settings</h1>
        <SettingsPanel config={config} onUpdateConfig={handleUpdateConfig} />
      </div>
    ),

    '/profile': <ProfilePage user={user!} onLogout={handleLogout} />,
  };

  return (
    <div className="flex min-h-screen bg-[#030604] relative overflow-hidden">
      {/* Global ambient glow */}
      <div className="fixed bottom-0 left-0 lg:left-64 right-0 h-[400px] pointer-events-none z-0"
        style={{ background: 'radial-gradient(ellipse at 50% 100%, rgba(16,185,129,0.07) 0%, transparent 70%)' }}
      />
      {/* Noise overlay */}
      <div className="fixed inset-0 pointer-events-none z-0 opacity-[0.025]"
        style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 256 256\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'noise\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.9\' numOctaves=\'4\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23noise)\' opacity=\'1\'/%3E%3C/svg%3E")', backgroundRepeat: 'repeat', backgroundSize: '256px 256px' }}
      />

      {/* Mobile backdrop when sidebar is open */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <Sidebar onLogout={handleLogout} isOpen={sidebarOpen} onNavigate={() => setSidebarOpen(false)} />

      <div className="flex-1 ml-0 lg:ml-64 flex flex-col relative z-10">
        {/* Top header */}
        <header className="h-14 border-b border-white/5 bg-[#030604]/80 backdrop-blur-xl flex items-center justify-between lg:justify-end px-4 sm:px-8 sticky top-0 z-20">
          {/* Mobile menu button */}
          <button
            onClick={() => setSidebarOpen(true)}
            aria-label="Open menu"
            className="lg:hidden p-2 -ml-2 rounded-xl text-zinc-400 hover:text-white hover:bg-white/5 transition-colors"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-4">
            {/* Daily send counter — real count from the extension (what actually
                sent today). Falls back to the app's cap when the extension
                hasn't reported yet. */}
            {(() => {
              const cap = extStats?.cap ?? Math.min(limits.maxDailyCap, config.dailySendCap ?? limits.maxDailyCap);
              const sent = extStats?.count ?? 0;
              const pct = cap > 0 ? sent / cap : 0;
              const color = pct >= 1 ? 'text-red-400 border-red-500/30 bg-red-500/8' : pct >= 0.8 ? 'text-amber-400 border-amber-500/30 bg-amber-500/8' : 'text-zinc-500 border-white/8 bg-white/3';
              return (
                <div
                  className={`hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-[11px] font-mono ${color}`}
                  title="DMs actually sent by the extension today"
                >
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                  {sent} / {cap} DMs today
                </div>
              );
            })()}
            {/* DM generation credits */}
            {(() => {
              const limit = limits.maxDMGenerations;
              const pct = dmUsed / limit;
              const color = pct >= 1 ? 'text-red-400 border-red-500/30 bg-red-500/8' : pct >= 0.8 ? 'text-amber-400 border-amber-500/30 bg-amber-500/8' : 'text-zinc-500 border-white/8 bg-white/3';
              return (
                <div className={`hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-[11px] font-mono ${color}`}>
                  <Sparkles className="w-3 h-3" />
                  {dmUsed} / {limit} DM credits
                </div>
              );
            })()}
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full border border-white/8 bg-white/3 text-[11px] text-zinc-600">
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500" />
              </span>
              All systems operational
            </div>
            {/* User avatar with email tooltip */}
            <div
              className="w-8 h-8 rounded-full bg-gradient-to-tr from-emerald-500 to-cyan-500 border border-white/15 shadow-[0_0_12px_rgba(16,185,129,0.3)] flex items-center justify-center cursor-default overflow-hidden"
              title={user?.email ?? ''}
            >
              {headerAvatar
                ? <img src={headerAvatar} alt="avatar" className="w-full h-full object-cover" />
                : <span className="text-[10px] font-bold text-emerald-950 uppercase">{user?.email?.[0] ?? 'U'}</span>
              }
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-auto">
          <Routes>
            {DASHBOARD_ROUTES.map((r) => (
              <Route key={r.path} path={r.path} element={pages[r.path]} />
            ))}
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </main>
      </div>
    </div>
  );
};

export default DashboardShell;
