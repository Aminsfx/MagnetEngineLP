import React, { useState, useEffect, useCallback } from 'react';
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
import ProfilePage from './ProfilePage';
import { HealthScore } from '../components/dashboard/HealthScore';
import { storage } from '../lib/storage';
import { db } from '../lib/db';
import { filterUtils } from '../lib/filters';
import { aiAPI } from '../lib/api';
import { stampFollowUp, type DueFollowUp } from '../lib/followups';
import { fireWebhook, detectTransitions } from '../lib/webhooks';
import { Lead, AppConfig, DashboardStats } from '../lib/types';
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
const DEFAULT_CONFIG: AppConfig = {
  systemPrompt: `You are writing cold Instagram DMs on behalf of MagnetEngine — an AI-powered outreach platform for agencies, coaches, and consultants.

YOUR AUDIENCE: Agency owners, SMMA founders, coaches, consultants, and freelancers who currently do Instagram outreach manually and waste hours on prospecting every week.

VALUE PROPOSITION: MagnetEngine automates their entire outreach system — finding qualified leads, writing a unique personalized DM for each one, and sending them with human-like timing — so their calendar fills automatically without manual work.

TONE: Casual and direct — entrepreneur to entrepreneur. Like a peer who spotted something interesting about their work.

RULES:
- 2–3 sentences max. Short is better.
- Reference something specific from their profile (their niche, offer, audience, or how they talk about their work).
- End with a soft curiosity question about their current outreach or client acquisition process.
- NEVER mention "AI", "automation", or "software" in the opener — just spark curiosity.
- Sound like a real person, not a salesperson.
- Output ONLY the raw DM text. No quotes, no labels, no markdown.`,
  includeKeywords: ['agency', 'founder', 'coach', 'consultant', 'SMMA', 'freelancer', 'marketing', 'growth', 'entrepreneur', 'CEO'],
  excludeKeywords: ['bot', 'giveaway', 'follow for follow', 'f4f', 'crypto', 'NFT', 'MLM', 'dropship'],
  minFollowers: 1000,
  maxFollowers: 500000,
  accountType: 'all',
  selectedAIProvider: 'claude',
  dailySendCap: 40,
  businessName: 'MagnetEngine',
  businessNiche: 'AI-powered Instagram lead generation and outreach automation',
  targetAudience: 'Agency owners, SMMA founders, coaches, consultants, and freelancers who do cold Instagram outreach',
  valueProposition: 'We automate your entire Instagram outreach — finding leads, writing personalized DMs, and sending them automatically — so your calendar fills without manual prospecting.',
  dmTone: 'casual',
};

// ─── Main dashboard shell ─────────────────────────────────────────────────────
const DashboardShell: React.FC = () => {
  const { user, signOut } = useAuth();
  const { limits } = usePlan();
  const navigate = useNavigate();
  const toast = useToast();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [leads, setLeads] = useState<Lead[]>([]);
  const [filteredLeads, setFilteredLeads] = useState<Lead[]>([]);
  const [config, setConfig] = useState<AppConfig>(DEFAULT_CONFIG);
  const [stats, setStats] = useState<DashboardStats>({
    totalLeads: 0,
    approvedLeads: 0,
    dmsSent: 0,
    replyRate: 0,
    positiveReplyRate: 0,
    bookingRate: 0,
    followUpRate: 0,
    leadsContacted: 0,
    activeCampaigns: 0,
  });
  const [isGenerating, setIsGenerating] = useState(false);
  const [dataLoading, setDataLoading] = useState(true);
  const [dailySendCount, setDailySendCount] = useState(0);
  const [dmUsed, setDmUsed] = useState(0);
  const [headerAvatar, setHeaderAvatar] = useState<string | null>(() =>
    user ? localStorage.getItem(`avatar_${user.id}`) : null
  );

  useEffect(() => {
    const handler = (e: Event) => setHeaderAvatar((e as CustomEvent<string>).detail);
    window.addEventListener('avatar-updated', handler);
    return () => window.removeEventListener('avatar-updated', handler);
  }, []);

  // Load data from Supabase (or localStorage fallback) on mount
  useEffect(() => {
    if (!user) return;

    Promise.all([
      db.getLeads(user.id),
      db.getConfig(user.id),
      db.getDMUsage(user.id),
    ]).then(([savedLeads, savedConfig, dmUsage]) => {
      setLeads(savedLeads ?? []);
      setConfig(savedConfig ?? DEFAULT_CONFIG);
      setDailySendCount(storage.getDailySends().count);
      setDmUsed(dmUsage.used);
      setDataLoading(false);
    });
  }, [user]);

  // Recalculate filtered leads + stats on any leads/config change
  useEffect(() => {
    const filtered = filterUtils.filterLeads(leads, config);
    setFilteredLeads(filtered);
    setStats(filterUtils.calculateStats(leads));
  }, [leads, config]);

  // ─── Lead mutation helpers ──────────────────────────────────────────────────
  const handleUpdateConfig = useCallback(async (newConfig: AppConfig) => {
    setConfig(newConfig);
    storage.setConfig(newConfig); // keep localStorage in sync as fallback
    if (user) await db.setConfig(newConfig, user.id);
  }, [user]);

  const handleAddLeads = useCallback(async (newLeads: Lead[]) => {
    let toAdd = newLeads;

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
        toAdd = toAdd.slice(0, remaining);
        toast.info(`Monthly lead limit: added ${toAdd.length} of ${newLeads.length} (${limits.maxLeadsPerMonth}/month on your plan).`);
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
  }, [user, limits.maxCampaignsPerMonth, limits.maxLeadsPerMonth, toast]);

  const handleDeleteLead = useCallback(async (id: string) => {
    setLeads((prev) => prev.filter((l) => l.id !== id));
    if (user) await db.deleteLead(id);
  }, [user]);

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

  const handleLeadsSent = useCallback(async (ids: string[]) => {
    const cap = config.dailySendCap ?? 40;
    const current = storage.getDailySends().count;
    const remaining = cap - current;

    if (remaining <= 0) {
      toast.error(`Daily send limit reached (${cap} DMs/day). Resets at midnight.`);
      return;
    }

    const allowed = ids.slice(0, remaining);
    if (allowed.length < ids.length) {
      toast.info(`Daily cap almost reached — sending ${allowed.length} of ${ids.length} DMs. Resets at midnight.`);
    }

    const updatedLeads: Lead[] = [];
    setLeads((prev) => {
      const next = prev.map((l) => {
        if (allowed.includes(l.id)) {
          const updated = { ...l, dmSent: true };
          updatedLeads.push(updated);
          return updated;
        }
        return l;
      });
      return next;
    });

    const newCount = storage.incrementDailySends(allowed.length);
    setDailySendCount(newCount);

    if (user && updatedLeads.length > 0) {
      await db.upsertLeads(updatedLeads, user.id);
    }
  }, [user, config.dailySendCap, toast]);

  /** Dispatch due follow-ups to the extension via the same channel as initial DMs */
  const handleFollowUpsSent = useCallback(async (due: DueFollowUp[]): Promise<number> => {
    const cap = config.dailySendCap ?? 40;
    const current = storage.getDailySends().count;
    const remaining = cap - current;

    if (remaining <= 0) {
      toast.error(`Daily send limit reached (${cap} DMs/day). Resets at midnight.`);
      return 0;
    }

    const allowed = due.slice(0, remaining);
    if (allowed.length < due.length) {
      toast.info(`Daily cap almost reached — sending ${allowed.length} of ${due.length} follow-ups.`);
    }
    if (allowed.length === 0) return 0;

    window.postMessage({
      type: 'MAGNET_ENGINE_CAMPAIGN',
      payload: {
        leads: allowed.map((d) => ({ handle: d.lead.handle, message: d.message })),
        mode: limits.isTestModeOnly ? 'test' : 'production',
      },
    }, '*');

    const sentAt = new Date().toISOString();
    const batch = allowed.map((d) => stampFollowUp(d.lead, d.stepIndex, sentAt));
    const batchById = new Map(batch.map((l) => [l.id, l]));
    setLeads((prev) => prev.map((l) => batchById.get(l.id) ?? l));
    if (user) await db.upsertLeads(batch, user.id);

    const newCount = storage.incrementDailySends(allowed.length);
    setDailySendCount(newCount);
    toast.success(`${allowed.length} follow-up${allowed.length !== 1 ? 's' : ''} sent to extension.`);
    return allowed.length;
  }, [user, config.dailySendCap, limits.isTestModeOnly, toast]);

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
    let successCount = 0;

    const updatedBatch: Lead[] = [];

    for (const lead of leadsToProcess.slice(0, 10)) {
      try {
        const dm = await aiAPI.generateDM(config.selectedAIProvider, lead, config.systemPrompt);
        const updatedLead: Lead = { ...lead, dmContent: dm, dmDate };
        updatedBatch.push(updatedLead);
        successCount++;
      } catch (error: any) {
        console.error(`Error generating DM for ${lead.name}:`, error);
        setIsGenerating(false);
        toast.error(`DM generation failed: ${error?.message ?? 'Unknown error'}`);
        return;
      }
    }

    if (updatedBatch.length > 0) {
      setLeads((prev) => prev.map((l) => {
        const updated = updatedBatch.find((u) => u.id === l.id);
        return updated ?? l;
      }));
      if (user) await db.upsertLeads(updatedBatch, user.id);
      if (user && successCount > 0) {
        const newUsed = await db.incrementDMUsage(user.id, successCount);
        setDmUsed(newUsed);
      }
    }

    setIsGenerating(false);
    if (successCount > 0) {
      toast.success(`Generated ${successCount} DM${successCount !== 1 ? 's' : ''} — review them in the Approval Queue.`);
    }
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
            {/* Daily send counter — cap is the lower of the plan's max and the user-configured value */}
            {(() => {
              const cap = Math.min(limits.maxDailyCap, config.dailySendCap ?? limits.maxDailyCap);
              const pct = dailySendCount / cap;
              const color = pct >= 1 ? 'text-red-400 border-red-500/30 bg-red-500/8' : pct >= 0.8 ? 'text-amber-400 border-amber-500/30 bg-amber-500/8' : 'text-zinc-500 border-white/8 bg-white/3';
              return (
                <div className={`hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-[11px] font-mono ${color}`}>
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                  {dailySendCount} / {cap} DMs today
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
            {/* Dashboard */}
            <Route
              path="/dashboard"
              element={
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
              }
            />

            {/* Campaign Builder */}
            <Route
              path="/campaign"
              element={
                <div className="p-8 space-y-6 max-w-7xl">
                  <div>
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-white/8 bg-white/4 text-[10px] font-semibold tracking-[0.2em] text-zinc-500 uppercase mb-3">Outreach</div>
                    <h1 className="text-2xl font-semibold text-white tracking-tight">Campaign Builder</h1>
                    <p className="text-zinc-600 text-sm mt-1.5">Search Instagram for prospects and add them to your outreach queue</p>
                  </div>
                  <CampaignBuilder onLeadsScraped={handleAddLeads} />
                </div>
              }
            />

            {/* Approval Queue */}
            <Route
              path="/queue"
              element={
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
                    onLeadsSent={handleLeadsSent}
                    onApproveLead={handleApproveLead}
                    onApproveLeads={handleApproveLeads}
                    onRejectLead={handleRejectLead}
                    onUpdateDM={handleUpdateDM}
                    onUpdateLead={handleUpdateLead}
                  />
                </div>
              }
            />

            {/* Follow-ups */}
            <Route
              path="/follow-ups"
              element={
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
              }
            />

            {/* Calculator */}
            <Route path="/calculator" element={<div className="p-8 max-w-7xl"><RevenueCalculator /></div>} />

            {/* Settings */}
            <Route
              path="/settings"
              element={
                <div className="p-8 max-w-4xl">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-white/8 bg-white/4 text-[10px] font-semibold tracking-[0.2em] text-zinc-500 uppercase mb-3">Configuration</div>
                  <h1 className="text-2xl font-semibold text-white tracking-tight mb-6">Settings</h1>
                  <SettingsPanel config={config} onUpdateConfig={handleUpdateConfig} />
                </div>
              }
            />

            {/* Profile */}
            <Route path="/profile" element={<ProfilePage user={user!} onLogout={handleLogout} />} />

            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </main>
      </div>
    </div>
  );
};

export default DashboardShell;
