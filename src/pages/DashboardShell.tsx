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
import { ExtensionNotice } from '../components/common/ExtensionNotice';
import { storage } from '../lib/storage';
import { db } from '../lib/db';
import { useOutreach } from '../lib/useOutreach';
import { createStore } from '../lib/store';
import { aiAPI, type ReplyResult } from '../lib/api';
import { createInboxLog, type RawThread } from '../lib/inbox';
import { readOutcome } from '../lib/outcome';
import { DASHBOARD_ROUTES, type DashboardPath } from '../lib/routes';
import {
  EXT_TO_APP,
  onExtensionMessage,
  requestExtensionSync,
  sendCampaign,
  watchExtension,
  getExtensionStatus,
  type ExtensionStatus,
} from '../lib/extensionProtocol';
import { DEFAULT_SYSTEM_PROMPT, DEFAULT_REPLY_SYSTEM_PROMPT } from '../lib/prompt';
import { AppConfig, Conversation, Message } from '../lib/types';
import { useAuth } from '../contexts/AuthContext';
import { usePlan } from '../contexts/PlanContext';
import { useToast } from '../components/common/Toast';
import { Loader2, Sparkles, Menu } from 'lucide-react';
import { CHANNEL, alpha } from '../lib/theme';

/**
 * The eyebrow above every page title. Five pages here spelled it out verbatim,
 * so a token swap had to land five times and stayed right only by luck.
 *
 * Two more copies live outside this file — InboxView and ProfilePage — and are
 * not this unit's to touch, so they still say `zinc-500` where these say
 * `neutral-500`. Same pixels, split vocabulary: when someone owns all seven,
 * this wants to be a shared `<PageEyebrow>` rather than a local constant.
 */
const PAGE_EYEBROW =
  'inline-flex items-center gap-2 px-3 py-1 rounded-full border border-white/8 bg-white/4 ' +
  'text-[10px] font-semibold tracking-[0.2em] text-neutral-500 uppercase mb-3';

/**
 * How a usage pill reads at `used / cap`. The two thresholds already existed as
 * hand-picked hues; naming them says what they mean — `caution` is "you are
 * running out", `danger` is "you are out, the next one will be refused".
 */
function usagePillTone(fraction: number): string {
  if (fraction >= 1) return 'text-danger-400 border-danger-500/30 bg-danger-500/8';
  if (fraction >= 0.8) return 'text-caution-400 border-caution-500/30 bg-caution-500/8';
  return 'text-neutral-500 border-white/8 bg-white/3';
}

/** Time-aware greeting for the dashboard header */
function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 5) return 'Working late';
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

// ─── Default config ───────────────────────────────────────────────────────────
// The seed prompts are BUILT from the same module the wizard uses, not written
// out by hand. The hand-written copy that used to live here had already drifted
// from what the wizard produced — it was missing the BAD EXAMPLES section and
// said "Your product name" where the generated one names the business.
const DEFAULT_CONFIG: AppConfig = {
  systemPrompt: DEFAULT_SYSTEM_PROMPT,
  replySystemPrompt: DEFAULT_REPLY_SYSTEM_PROMPT,
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

// ─── Main dashboard shell ─────────────────────────────────────────────────────
const DashboardShell: React.FC = () => {
  const { user, signOut } = useAuth();
  const { limits } = usePlan();
  const navigate = useNavigate();
  const toast = useToast();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // One decision, made once. Every persistence call below goes through this
  // store and never asks again whether Supabase is configured or who is signed
  // in — that question used to be re-answered at eight call sites in this file,
  // inconsistently.
  const store = useMemo(() => createStore(user?.id ?? null), [user?.id]);

  const [config, setConfig] = useState<AppConfig>(DEFAULT_CONFIG);

  // The Lead lifecycle — add, approve, reject, edit, generate, send — behind one
  // interface with two ports (the store, and the extension protocol). This used
  // to be seventeen callbacks and six mirror refs inlined here.
  const outreach = useOutreach({ store, config, limits, toast });

  const [dataLoading, setDataLoading] = useState(true);
  // Real per-day sent count reported by the extension (source of truth for what
  // actually went out), vs the app's optimistic handoff count.
  const [extStats, setExtStats] = useState<{ count: number; cap: number } | null>(null);
  // Which extension build is installed, and what it can still be asked to do.
  const [extStatus, setExtStatus] = useState<ExtensionStatus>(getExtensionStatus);

  // ─── Inbox (AI SDR) ─────────────────────────────────────────────────────────
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);

  // The inbox log owns the merged Conversations/Messages and the ordering rule
  // that used to live here as three refs (inboxReady, pendingThreads, and
  // mirrors of both arrays). React state below is just a rendering copy of it.
  const inbox = useMemo(() => createInboxLog(), []);
  const configRef = useRef<AppConfig>(DEFAULT_CONFIG);
  useEffect(() => { configRef.current = config; }, [config]);
  // Same reason as configRef: the engine is a fresh object every render, and
  // ingestInbox has to stay a stable callback for the extension bridge.
  const outreachRef = useRef(outreach);
  useEffect(() => { outreachRef.current = outreach; }, [outreach]);
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
      store.loadLeads(),
      store.loadConfig(),
      db.getDMUsage(userId),
    ]).then(([savedLeads, savedConfig, dmUsage]) => {
      outreach.hydrate(savedLeads ?? [], dmUsage.used);
      setConfig(savedConfig ?? DEFAULT_CONFIG);
      setDataLoading(false);
    });
    // `outreach` is intentionally not a dependency: hydrate is stable and
    // re-running the cold load on every engine render would defeat the point.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, store]);

  // Inbox history loads behind first paint. Snapshots arriving before it lands
  // are parked by the log rather than merged — echo suppression compares against
  // the Messages already known, so merging into a half-loaded inbox would
  // duplicate every optimistic send.
  useEffect(() => {
    if (!userId) return;
    let cancelled = false;

    store.loadInbox().then((history) => {
      if (cancelled) return;
      const replayed = inbox.hydrate(history);
      setConversations(replayed?.conversations ?? history.conversations);
      setMessages(replayed?.messages ?? history.messages);
      if (replayed) {
        store.saveConversations(replayed.changedConversations).catch(console.error);
        store.saveMessages(replayed.newMessages).catch(console.error);
      }
    });

    return () => {
      cancelled = true;
      inbox.reset();
    };
  }, [userId, store, inbox]);

  // Merge a fresh inbox snapshot from the extension into state + persist the
  // changed rows. Reads live refs so it can stay a stable callback. Returns the
  // conversations that gained a NEW inbound message (for autopilot).
  const ingestInbox = useCallback((threads: RawThread[]): Conversation[] => {
    const result = inbox.sync(threads);
    if (!result) return [];   // parked, or nothing changed

    setConversations(result.conversations);
    setMessages(result.messages);
    store.saveConversations(result.changedConversations).catch(console.error);
    store.saveMessages(result.newMessages).catch(console.error);

    // Carry what each Conversation revealed back to the Lead behind it, so a
    // reply in the Inbox shows up in reply rate, the conversion chart and the
    // `replied` webhook without the Operator re-marking it by hand. Handed over
    // as one batch: the engine folds several threads for the same handle
    // together, and writes once. Silent for Leads that already reflect their
    // Outcome, which is most of them on most polls.
    outreachRef.current.recordOutcomes(
      result.changedConversations.map((c) => readOutcome(c, result.messages)),
    );
    return result.newInbound;
  }, [store, inbox]);

  // Ref so the bridge effect can call the latest autopilot handler without
  // re-subscribing (defined further down).
  const autopilotRef = useRef<(convos: Conversation[]) => void>(() => {});

  // ─── Extension bridge ───────────────────────────────────────────────────────
  // The extension reports what it ACTUALLY sent (real daily count + sent log)
  // and pushes inbox snapshots, so the header, per-lead "sent", and the Inbox
  // all reflect reality, not handoffs.
  useEffect(() => {
    const stopListening = onExtensionMessage((d) => {
      if (d.type === EXT_TO_APP.STATS) {
        setExtStats({ count: d.dailySentCount ?? 0, cap: d.dailyCap ?? 0 });
        // Reconcile against both: `sentLog` resets at midnight, `sentHandles`
        // never does, so a dashboard opened the next morning still learns what
        // went out yesterday instead of offering to send it again.
        outreach.markSentByHandles([
          ...(d.sentLog ?? []).map((x) => x.handle ?? ''),
          ...(d.sentHandles ?? []),
        ]);
      } else if (d.type === EXT_TO_APP.SENT) {
        setExtStats({ count: d.dailySentCount ?? 0, cap: d.dailyCap ?? 0 });
        if (d.handle) outreach.markSentByHandles([d.handle]);
      } else if (d.type === EXT_TO_APP.INBOX) {
        const newInbound = ingestInbox((d.threads ?? []) as RawThread[]);
        if (newInbound.length) autopilotRef.current(newInbound);
      }
    });

    requestExtensionSync();                                   // on mount
    window.addEventListener('focus', requestExtensionSync);   // and on refocus

    return () => {
      stopListening();
      window.removeEventListener('focus', requestExtensionSync);
    };
  }, [outreach, ingestInbox]);

  // ─── Extension handshake ────────────────────────────────────────────────────
  // Separate from the bridge above, and with its own empty dep list: the bridge
  // re-subscribes whenever the outreach engine identity changes, and re-probing
  // the extension on every one of those would be noise. Nothing here depends on
  // app state — only on which extension is installed.
  useEffect(() => watchExtension(setExtStatus), []);

  // ─── Lead mutation helpers ──────────────────────────────────────────────────
  const handleUpdateConfig = useCallback(async (newConfig: AppConfig) => {
    setConfig(newConfig);
    await store.saveConfig(newConfig);
  }, [store]);

  // ─── Inbox (AI SDR) handlers ────────────────────────────────────────────────

  /** Persist a single conversation to state + DB, and carry whatever it now
   *  reveals — a booking, an intent the AI just read — onto the Lead. */
  const handleUpdateConversation = useCallback((conv: Conversation) => {
    const next = inbox.recordConversation(conv);
    setConversations(next.conversations);
    store.saveConversations([conv]).catch(console.error);
    outreach.recordOutcomes([readOutcome(conv, next.messages)]);
  }, [outreach, store, inbox]);

  /** Ask the backend for an AI reply draft + intent for a conversation. */
  const handleGenerateReply = useCallback(async (conv: Conversation): Promise<ReplyResult> => {
    const history = inbox.snapshot().messages
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
  }, [handleUpdateConversation, inbox]);

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
    const updatedConv: Conversation = {
      ...conv, lastMessageAt: now, lastMessageText: body, needsReply: false, unread: false,
    };

    // Hand off BEFORE the optimistic write. A refused handoff means nothing is
    // going out, and a Conversation showing a reply that was never sent — with
    // needsReply cleared — is worse than no reply at all.
    const delay = storage.getDmDelay();
    const handoff = sendCampaign({
      leads: [{ handle: conv.handle, message: body }],
      minDelay: delay.min,
      maxDelay: delay.max,
      dailyCap: configRef.current.dailySendCap ?? 40,
    });
    if (!handoff.delivered) {
      toast.error(handoff.reason!);
      return;
    }

    // recordOutbound also arms echo suppression for exactly this one Message,
    // so Instagram sending it back under its own id doesn't duplicate it — and
    // a genuinely repeated "ok" later still comes through.
    setMessages(inbox.recordOutbound(msg).messages);
    setConversations(inbox.recordConversation(updatedConv).conversations);
    store.saveMessages([msg]).catch(console.error);
    store.saveConversations([updatedConv]).catch(console.error);

    toast.success(`Reply queued to @${conv.handle}`);
  }, [toast, store, inbox]);

  /** Autopilot: when new inbound arrives and autopilot is on, draft + auto-send
   *  a reply (paced/capped by the extension). Skips clearly-uninterested leads.*/
  const handleAutopilot = useCallback(async (newInbound: Conversation[]) => {
    if (!configRef.current.autopilot) return;
    for (const conv of newInbound) {
      const latest = inbox.snapshot().conversations.find((c) => c.id === conv.id) ?? conv;
      if (!latest.needsReply || latest.status === 'closed') continue;
      try {
        const result = await handleGenerateReply(latest);
        if (result.intent === 'not_interested') continue; // don't chase
        await handleSendReply(latest, result.reply);
      } catch (e) {
        console.error('[autopilot] failed for', conv.handle, e);
      }
    }
  }, [handleGenerateReply, handleSendReply, inbox]);

  useEffect(() => { autopilotRef.current = handleAutopilot; }, [handleAutopilot]);

  const handleLogout = useCallback(async () => {
    await signOut();
    navigate('/login');
  }, [signOut, navigate]);

  if (dataLoading) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center">
        <div className="flex items-center gap-3 text-neutral-600">
          <Loader2 className="w-5 h-5 animate-spin text-brand-500" />
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
            <div className={PAGE_EYEBROW}>
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
            <p className="text-neutral-600 text-sm mt-1.5">Your pipeline is live and running.</p>
          </div>
        </div>
        <OnboardingChecklist leads={outreach.leads} config={config} />
        <HealthScore leads={outreach.leads} />
        <MetricsGrid stats={outreach.stats} />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2">
            <ConversionChart leads={outreach.leads} />
          </div>
          <AIAnalyst stats={outreach.stats} />
        </div>
      </div>
    ),

    '/campaign': (
      <div className="p-8 space-y-6 max-w-7xl">
        <div>
          <div className={PAGE_EYEBROW}>Outreach</div>
          <h1 className="text-2xl font-semibold text-white tracking-tight">Campaign Builder</h1>
          <p className="text-neutral-600 text-sm mt-1.5">Search Instagram for prospects and add them to your outreach queue</p>
        </div>
        <CampaignBuilder onLeadsScraped={outreach.addLeads} />
      </div>
    ),

    '/queue': (
      <div className="p-8 space-y-6 max-w-7xl">
        <div>
          <div className={PAGE_EYEBROW}>Review</div>
          <h1 className="text-2xl font-semibold text-white tracking-tight">Approval Queue</h1>
          <p className="text-neutral-600 text-sm mt-1.5">Review and approve AI-generated DMs before sending to the extension</p>
        </div>
        <ApprovalQueue
          leads={outreach.leads}
          config={config}
          onGenerateDMs={outreach.generateDMs}
          isGenerating={outreach.isGenerating}
          onDeleteLead={outreach.remove}
          onDeleteLeads={outreach.removeMany}
          onApproveLead={outreach.approve}
          onApproveLeads={outreach.approveMany}
          onRejectLead={outreach.reject}
          onUpdateDM={outreach.updateDM}
          onUpdateLead={outreach.update}
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
          <div className={PAGE_EYEBROW}>Automation</div>
          <h1 className="text-2xl font-semibold text-white tracking-tight">Follow-Up Sequencer</h1>
          <p className="text-neutral-600 text-sm mt-1.5">
            Build automated follow-up sequences — most deals close on the 2nd or 3rd touch
          </p>
        </div>
        <FollowUpSequencer leads={outreach.leads} onSendFollowUps={outreach.sendFollowUps} />
      </div>
    ),

    '/calculator': <div className="p-8 max-w-7xl"><RevenueCalculator /></div>,

    '/settings': (
      <div className="p-8 max-w-4xl">
        <div className={PAGE_EYEBROW}>Configuration</div>
        <h1 className="text-2xl font-semibold text-white tracking-tight mb-6">Settings</h1>
        <SettingsPanel config={config} onUpdateConfig={handleUpdateConfig} />
      </div>
    ),

    '/profile': <ProfilePage user={user!} onLogout={handleLogout} />,
  };

  return (
    <div className="flex min-h-screen bg-surface relative overflow-hidden">
      {/* Global ambient glow — the brand wash the whole shell sits in. */}
      <div className="fixed bottom-0 left-0 lg:left-64 right-0 h-[400px] pointer-events-none z-0"
        style={{ background: `radial-gradient(ellipse at 50% 100%, ${alpha(CHANNEL.brand, 0.07)} 0%, transparent 70%)` }}
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
        <header className="h-14 border-b border-white/5 bg-surface/80 backdrop-blur-xl flex items-center justify-between lg:justify-end px-4 sm:px-8 sticky top-0 z-20">
          {/* Mobile menu button */}
          <button
            onClick={() => setSidebarOpen(true)}
            aria-label="Open menu"
            className="lg:hidden p-2 -ml-2 rounded-xl text-neutral-400 hover:text-white hover:bg-white/5 transition-colors"
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
              const color = usagePillTone(pct);
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
              const pct = outreach.dmUsed / limit;
              const color = usagePillTone(pct);
              return (
                <div className={`hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-[11px] font-mono ${color}`}>
                  <Sparkles className="w-3 h-3" />
                  {outreach.dmUsed} / {limit} DM credits
                </div>
              );
            })()}
            {/* User avatar with email tooltip. The gradient was emerald→cyan;
                a decorative avatar is not an AI affordance and cyan is reserved
                for those, so it stays inside the brand ramp. */}
            <div
              className="w-8 h-8 rounded-full bg-gradient-to-tr from-brand-500 to-brand-300 border border-white/15 shadow-[0_0_12px_theme(colors.brand.500/0.3)] flex items-center justify-center cursor-default overflow-hidden"
              title={user?.email ?? ''}
            >
              {headerAvatar
                ? <img src={headerAvatar} alt="avatar" className="w-full h-full object-cover" />
                : <span className="text-[10px] font-bold text-brand-950 uppercase">{user?.email?.[0] ?? 'U'}</span>
              }
            </div>
          </div>
        </header>

        {/* Extension missing / behind the dashboard — silent otherwise */}
        <ExtensionNotice status={extStatus} />

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
