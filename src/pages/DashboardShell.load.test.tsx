/**
 * A workspace that fails to load is not an empty workspace.
 *
 * Every read in the Supabase adapter used to answer an error with "nothing
 * there", and the dashboard had no catch on either of its loads. So a dropped
 * connection or an expired session while the page opened showed the Operator
 * an empty pipeline on the default settings, where the first setting they
 * touched saved those defaults over their own.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';

const h = vi.hoisted(() => {
  vi.stubEnv('VITE_SUPABASE_URL', 'https://abc.supabase.co');
  vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'test-anon-key');
  return {
    configFails: false,
    inboxFails: false,
    inboxLoads: 0,
    savedConfigs: [] as unknown[],
    savedConversations: [] as unknown[],
  };
});

vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'u1', email: 'load@test.dev', user_metadata: {} }, signOut: vi.fn() }),
}));

vi.mock('../contexts/PlanContext', async () => {
  const { PLAN_LIMITS } = await import('../lib/plans');
  return {
    usePlan: () => ({ limits: PLAN_LIMITS, status: 'active' as const, loading: false, refresh: async () => 'active' as const }),
  };
});

vi.mock('../lib/db', async () => {
  const { storage } = await import('../lib/storage');
  return {
    db: {
      getLeads: async () => [],
      getConfig: async () => {
        if (h.configFails) throw new Error('[db] getConfig: JWT expired');
        return {
          ...storage.getConfig(),
          onboardingComplete: true,
          instagramAccount: { id: '111', username: 'me.coaching', connectedAt: '2026-11-01T00:00:00.000Z' },
        };
      },
      getConversations: async () => {
        h.inboxLoads += 1;
        if (h.inboxFails) throw new Error('[db] getConversations: Failed to fetch');
        return [];
      },
      getMessages: async () => [],
      getDMUsage: async () => ({ used: 0, resetAt: new Date() }),
      upsertLeads: async () => {},
      deleteLeads: async () => {},
      setConfig: async (config: unknown) => { h.savedConfigs.push(config); },
      upsertConversations: async (rows: unknown[]) => { h.savedConversations.push(...rows); },
      upsertMessages: async () => {},
      getMonthlyCount: async () => 0,
      incrementMonthlyCount: async () => 0,
    },
  };
});

import DashboardShell from './DashboardShell';
import { ToastProvider } from '../components/common/Toast';

function mount(path: string) {
  render(
    <MemoryRouter initialEntries={[path]}>
      <ToastProvider>
        <DashboardShell />
      </ToastProvider>
    </MemoryRouter>,
  );
}

describe('a workspace that fails to load', () => {
  beforeEach(() => {
    localStorage.clear();
    h.configFails = false;
    h.inboxFails = false;
    h.inboxLoads = 0;
    h.savedConfigs.length = 0;
    h.savedConversations.length = 0;
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  it('says so instead of opening the dashboard on the default settings', async () => {
    h.configFails = true;
    mount('/dashboard');

    expect(await screen.findByRole('heading', { name: /couldn.t load your workspace/i })).toBeInTheDocument();
    // Neither a spinner that never ends nor a dashboard built on the defaults.
    expect(screen.queryByText(/Loading your pipeline/i)).not.toBeInTheDocument();
    expect(screen.queryByTitle(/confirmed sending today/i)).not.toBeInTheDocument();
    expect(h.savedConfigs).toEqual([]);
  });

  it('opens once Try again reaches the workspace', async () => {
    h.configFails = true;
    mount('/dashboard');
    const retry = await screen.findByRole('button', { name: /try again/i });

    h.configFails = false;
    await userEvent.click(retry);

    await waitFor(() => expect(screen.getByTitle(/confirmed sending today/i)).toBeInTheDocument());
    expect(screen.queryByRole('heading', { name: /couldn.t load your workspace/i })).not.toBeInTheDocument();
  });

  it('says in the Inbox that the saved conversations could not be loaded, and takes nothing in meanwhile', async () => {
    h.inboxFails = true;
    mount('/inbox');

    expect(await screen.findByText(/saved conversations couldn.t be loaded/i)).toBeInTheDocument();
    expect(h.inboxLoads).toBe(1);
    // Nothing was hydrated from "empty", so nothing can be saved over a stored Conversation.
    expect(h.savedConversations).toEqual([]);
  });
});
