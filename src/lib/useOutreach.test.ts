import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useOutreach } from './useOutreach';
import { PLAN_LIMITS } from './plans';
import type { WorkspaceStore } from './store';
import type { AppConfig, Lead } from './types';

/**
 * These tests are the point of the extraction. Before it, every rule below
 * lived in a component with no props and no exports, so exercising "what
 * happens when an Operator approves a Lead" meant mounting the whole dashboard
 * against a hand-maintained 15-method fake of the database.
 */

vi.mock('./api', () => ({
  aiAPI: {
    generateDM: vi.fn(),
    generateReply: vi.fn(),
  },
}));

vi.mock('./extensionProtocol', async (importOriginal) => ({
  ...(await importOriginal<typeof import('./extensionProtocol')>()),
  sendCampaign: vi.fn(),
}));

vi.mock('./db', () => ({
  db: {
    getMonthlyCount: vi.fn(async () => 0),
    incrementMonthlyCount: vi.fn(async () => 0),
  },
}));

import { aiAPI } from './api';
import { sendCampaign } from './extensionProtocol';
import { db } from './db';

const lead = (id: string, over: Partial<Lead> = {}): Lead => ({
  id, campaignId: 'c1', handle: id, name: id, followers: 1000,
  isPrivate: false, status: 'cold', dmSent: false, replied: false, ...over,
});

const config: AppConfig = {
  systemPrompt: 'prompt', includeKeywords: [], excludeKeywords: [],
  minFollowers: 0, maxFollowers: Number.MAX_SAFE_INTEGER, accountType: 'all',
  selectedAIProvider: 'claude', dailySendCap: 40,
};

/** An in-memory adapter — the seam that makes the engine testable at all. */
function fakeStore(kind: WorkspaceStore['kind'] = 'supabase') {
  const saved: Lead[][] = [];
  const removed: string[][] = [];
  const store: WorkspaceStore = {
    kind,
    loadLeads: async () => [],
    saveLeads: async (leads) => { saved.push(leads); },
    removeLeads: async (ids) => { removed.push(ids); },
    loadConfig: async () => null,
    saveConfig: async () => {},
    loadInbox: async () => ({ conversations: [], messages: [] }),
    saveConversations: async () => {},
    saveMessages: async () => {},
  };
  return { store, saved, removed };
}

const toast = { success: vi.fn(), error: vi.fn(), info: vi.fn() };

function setup(kind: WorkspaceStore['kind'] = 'supabase') {
  const { store, saved, removed } = fakeStore(kind);
  const view = renderHook(() =>
    useOutreach({ store, config, limits: PLAN_LIMITS, toast }),
  );
  return { ...view, saved, removed };
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(db.getMonthlyCount).mockResolvedValue(0);
});

describe('lead lifecycle', () => {
  it('approving persists exactly the changed Lead', async () => {
    const { result, saved } = setup();
    act(() => result.current.hydrate([lead('a'), lead('b')], 0));

    await act(() => result.current.approve('b'));

    expect(result.current.leads.find((l) => l.id === 'b')).toMatchObject({
      approved: true, rejected: false,
    });
    expect(result.current.leads.find((l) => l.id === 'a')?.approved).toBeUndefined();
    expect(saved).toEqual([[expect.objectContaining({ id: 'b', approved: true })]]);
  });

  it('rejecting clears a previous approval', async () => {
    const { result } = setup();
    act(() => result.current.hydrate([lead('a', { approved: true })], 0));

    await act(() => result.current.reject('a'));

    expect(result.current.leads[0]).toMatchObject({ rejected: true, approved: false });
  });

  it('bulk approve writes once, not once per Lead', async () => {
    const { result, saved } = setup();
    act(() => result.current.hydrate([lead('a'), lead('b'), lead('c')], 0));

    await act(() => result.current.approveMany(['a', 'c']));

    expect(saved).toHaveLength(1);
    expect(saved[0].map((l) => l.id)).toEqual(['a', 'c']);
  });

  it('removes Leads from state and storage together', async () => {
    const { result, removed } = setup();
    act(() => result.current.hydrate([lead('a'), lead('b')], 0));

    await act(() => result.current.removeMany(['a']));

    expect(result.current.leads.map((l) => l.id)).toEqual(['b']);
    expect(removed).toEqual([['a']]);
  });
});

describe('addLeads', () => {
  it('drops handles already in the queue', async () => {
    const { result } = setup();
    act(() => result.current.hydrate([lead('x', { handle: 'founder' })], 0));

    await act(() => result.current.addLeads([lead('y', { handle: 'Founder' })]));

    expect(result.current.leads).toHaveLength(1);
    expect(toast.info).toHaveBeenCalledWith(expect.stringContaining('already in your queue'));
  });

  it('caps the batch at the remaining monthly allowance', async () => {
    vi.mocked(db.getMonthlyCount).mockImplementation(async (kind) =>
      kind === 'leads' ? PLAN_LIMITS.maxLeadsPerMonth - 2 : 0,
    );
    const { result } = setup();
    act(() => result.current.hydrate([], 0));

    await act(() => result.current.addLeads([lead('a'), lead('b'), lead('c')]));

    expect(result.current.leads).toHaveLength(2);
    expect(toast.info).toHaveBeenCalledWith(expect.stringContaining('over your'));
  });

  it('does not meter a local workspace', async () => {
    const { result } = setup('local');
    act(() => result.current.hydrate([], 0));

    await act(() => result.current.addLeads([lead('a')]));

    expect(db.getMonthlyCount).not.toHaveBeenCalled();
    expect(result.current.leads).toHaveLength(1);
  });
});

describe('generateDMs', () => {
  it('keeps the DMs that succeeded when one call fails', async () => {
    // The regression this exists for: an early return past the persistence
    // block used to throw away up to nine already-billed generations.
    vi.mocked(aiAPI.generateDM)
      .mockResolvedValueOnce({ dm: 'one', used: 1, limit: 500 })
      .mockResolvedValueOnce({ dm: 'two', used: 2, limit: 500 })
      .mockRejectedValueOnce(new Error('provider exploded'));

    const { result, saved } = setup();
    act(() => result.current.hydrate([lead('a'), lead('b'), lead('c')], 0));

    await act(() => result.current.generateDMs());

    expect(saved[0].map((l) => l.dmContent)).toEqual(['one', 'two']);
    expect(result.current.dmUsed).toBe(2);
    expect(toast.error).toHaveBeenCalledWith(expect.stringContaining('provider exploded'));
  });

  it('caps a click at one batch and says how many are left', async () => {
    vi.mocked(aiAPI.generateDM).mockResolvedValue({ dm: 'hi', used: 1, limit: 500 });
    const { result } = setup();
    act(() => result.current.hydrate(Array.from({ length: 25 }, (_, i) => lead(`l${i}`)), 0));

    await act(() => result.current.generateDMs());

    expect(aiAPI.generateDM).toHaveBeenCalledTimes(10);
    expect(toast.success).toHaveBeenCalledWith(expect.stringContaining('15 still pending'));
  });

  it('refuses once the monthly allowance is spent', async () => {
    const { result } = setup();
    act(() => result.current.hydrate([lead('a')], PLAN_LIMITS.maxDMGenerations));

    await act(() => result.current.generateDMs());

    expect(aiAPI.generateDM).not.toHaveBeenCalled();
    expect(toast.error).toHaveBeenCalledWith(expect.stringContaining('used all'));
  });

  it('skips Leads that already have a DM', async () => {
    const { result } = setup();
    act(() => result.current.hydrate([lead('a', { dmContent: 'already' })], 0));

    await act(() => result.current.generateDMs());

    expect(aiAPI.generateDM).not.toHaveBeenCalled();
    expect(toast.info).toHaveBeenCalledWith(expect.stringContaining('already have DMs'));
  });
});

describe('markSentByHandles', () => {
  it('flips matching Leads to sent, once', async () => {
    const { result, saved } = setup();
    act(() => result.current.hydrate([
      lead('a', { handle: 'founder_one' }),
      lead('b', { handle: 'founder_two', dmSent: true }),
    ], 0));

    act(() => result.current.markSentByHandles(['@Founder_One', 'founder_two']));

    await waitFor(() => expect(result.current.leads[0].dmSent).toBe(true));
    // Only the one that changed is written.
    expect(saved[0].map((l) => l.id)).toEqual(['a']);
  });

  it('does nothing when no handle matches', () => {
    const { result, saved } = setup();
    act(() => result.current.hydrate([lead('a', { handle: 'founder_one' })], 0));

    act(() => result.current.markSentByHandles(['someone_else']));

    expect(saved).toEqual([]);
  });
});

describe('sendFollowUps', () => {
  it('hands the batch to the extension and stamps the step', async () => {
    const { result, saved } = setup();
    const target = lead('a', { handle: 'founder_one', dmSent: true });
    act(() => result.current.hydrate([target], 0));

    let count = 0;
    await act(async () => {
      count = await result.current.sendFollowUps([
        { lead: target, stepIndex: 0, message: 'still keen?' },
      ]);
    });

    expect(count).toBe(1);
    expect(sendCampaign).toHaveBeenCalledWith(expect.objectContaining({
      leads: [{ handle: 'founder_one', message: 'still keen?' }],
      dailyCap: 40,
    }));
    expect(saved[0][0].followedUp).toBe(true);
  });

  it('is a no-op with nothing due', async () => {
    const { result } = setup();
    act(() => result.current.hydrate([], 0));

    await act(() => result.current.sendFollowUps([]));

    expect(sendCampaign).not.toHaveBeenCalled();
  });
});
