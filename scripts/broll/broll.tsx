import React, { useCallback, useState } from 'react';
import ReactDOM from 'react-dom/client';
import { ToastProvider } from '../../src/components/common/Toast';
import { CampaignBuilder } from '../../src/components/campaign/CampaignBuilder';
import { ApprovalQueue } from '../../src/components/campaign/ApprovalQueue';
import Logo from '../../src/components/Logo';
import type { AppConfig, Lead } from '../../src/lib/types';

/**
 * The real Campaign Builder and Approval Queue, on sample data, for screen
 * recordings (record.mjs). `?scene=search` or `?scene=queue`.
 *
 * Every sample handle contains a hyphen, which Instagram usernames cannot, so
 * no real person appears in marketing footage — the rule scrapeDemo.ts follows.
 */

const config: AppConfig = {
    systemPrompt: '',
    includeKeywords: [],
    excludeKeywords: [],
    minFollowers: 0,
    maxFollowers: Number.MAX_SAFE_INTEGER,
    accountType: 'all',
    selectedAIProvider: 'claude',
    dailySendCap: 40,
};

const lead = (i: number, handle: string, name: string, followers: number, bio: string, dm: string): Lead => ({
    id: `broll-${i}`,
    handle,
    name,
    followers,
    bio,
    isPrivate: false,
    businessAccount: true,
    status: 'cold',
    dmSent: false,
    replied: false,
    dmContent: dm,
    dmDate: new Date().toISOString(),
    campaignId: 'broll',
    campaignName: 'business coach',
});

const SAMPLE: Lead[] = [
    lead(1, 'maya-builds.coaching', 'Maya Reyes', 8420, 'Business coach for moms building 6-figure practices · Austin',
        'Maya — your post about batching client calls on Tuesdays so the kids get Fridays stuck with me. Are you taking on new clients this quarter, or keeping it small on purpose?'),
    lead(2, 'jordan-fit-method', 'Jordan Kim', 21300, 'Online fitness coach · 12-week transformations',
        "Jordan, your 12-week transformation posts are some of the clearest I've seen — the weekly check-in photos make it real. Is online coaching most of your business now?"),
    lead(3, 'tom-roofing-pros', 'Tom Delgado', 2310, 'Family roofing company · Phoenix · Free inspections',
        'Tom, the before/after on the Henderson roof is a good one. Are most of your jobs coming from referrals right now, or is Instagram bringing any in?'),
    lead(4, 'glow-medspa-austin', 'Glow Med Spa', 14900, 'Lips · Skin · Wellness · Austin TX',
        'Love that you show the healed results a week later, not just day one. Are you booking new clients through DMs, or mostly the website?'),
    lead(5, 'studio-noor-design', 'Noor Studio', 5600, 'Interior design · Lisbon & remote',
        'Noor — the moodboard reel for the Lisbon apartment was great, especially the light. Do you take projects outside Portugal?'),
    lead(6, 'lena-weddings-photo', 'Lena Marsh', 11200, 'Wedding photographer · Tuscany & Amalfi',
        'Lena, the Tuscany wedding set is stunning — that golden-hour veil shot. Are you booked out for next season yet?'),
];

const Queue: React.FC = () => {
    const [leads, setLeads] = useState<Lead[]>(SAMPLE);
    const patch = useCallback((ids: string[], change: Partial<Lead>) => {
        setLeads(prev => prev.map(l => (ids.includes(l.id) ? { ...l, ...change } : l)));
    }, []);
    return (
        <ApprovalQueue
            leads={leads}
            config={config}
            onGenerateDMs={() => {}}
            isGenerating={false}
            onApproveLead={(id) => patch([id], { approved: true, rejected: false })}
            onApproveLeads={(ids) => patch(ids, { approved: true, rejected: false })}
            onUnapproveLeads={(ids) => patch(ids, { approved: false })}
            onRejectLead={(id) => patch([id], { rejected: true, approved: false })}
            onUpdateDM={(id, dmContent) => patch([id], { dmContent })}
            onUpdateLead={(l) => setLeads(prev => prev.map(x => (x.id === l.id ? l : x)))}
            onDeleteLead={(id) => setLeads(prev => prev.filter(l => l.id !== id))}
        />
    );
};

/** A visible pointer for the recording: headless screen captures draw none. */
const Cursor: React.FC = () => (
    <div
        id="broll-cursor"
        aria-hidden
        className="fixed z-[9999] pointer-events-none w-7 h-7 -ml-3.5 -mt-3.5 rounded-full border-2 border-white bg-white/25 ring-4 ring-white/10"
        style={{ left: -100, top: -100, transition: 'left 600ms cubic-bezier(0.22,1,0.36,1), top 600ms cubic-bezier(0.22,1,0.36,1), transform 150ms ease' }}
    />
);

const scene = new URLSearchParams(location.search).get('scene') ?? 'queue';

// Framing for a 9:16 clip, not product changes: the queue's checkbox and Bio
// columns are hidden and the DM column may narrow, so the DM and the Approve
// button fit the frame, and the Campaign
// Builder's dev-only "Demo mode" notice is hidden (the data is still sample data).
const style = document.createElement('style');
style.textContent = `
  [data-scene="queue"] table th:nth-child(1), [data-scene="queue"] table td:nth-child(1),
  [data-scene="queue"] table th:nth-child(3), [data-scene="queue"] table td:nth-child(3) { display: none; }
  [data-scene="queue"] table th:nth-child(4) { min-width: 15rem !important; }
  [data-scene="search"] [data-broll-hide] { display: none !important; }
`;
document.head.appendChild(style);
document.documentElement.dataset.scene = scene;

const App: React.FC = () => (
    <ToastProvider>
        <div className="min-h-screen bg-surface px-4 pt-5 pb-10">
            <header className="flex items-center justify-between pb-5 mb-5 border-b border-white/8">
                <Logo subtitle="AI Lead Automation" />
            </header>
            <h1 className="text-2xl font-semibold text-white tracking-tight">
                {scene === 'search' ? 'Campaign Builder' : 'Approval Queue'}
            </h1>
            <p className="text-neutral-400 text-sm mt-1.5 mb-6">
                {scene === 'search'
                    ? 'Search Instagram for the people you want as clients.'
                    : 'Read each DM, then approve it. Nothing sends until you do.'}
            </p>
            {scene === 'search' ? <CampaignBuilder onLeadsScraped={() => {}} /> : <Queue />}
        </div>
        <Cursor />
    </ToastProvider>
);

ReactDOM.createRoot(document.getElementById('root')!).render(<App />);
