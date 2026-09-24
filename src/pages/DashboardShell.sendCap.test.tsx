/**
 * The header's "sent today" pill must count against the Send Cap the Operator
 * set in Settings — the same number Settings shows.
 *
 * Owner report (2026-09-24): "the daily limit in settings doesn't match the
 * sent today metric" at the top of the dashboard.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { APP_TO_EXT, EXT_TO_APP } from '../lib/extensionProtocol';

const h = vi.hoisted(() => ({ dailySendCap: 80 as number | undefined }));

vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'u1', email: 'cap@test.dev', user_metadata: {} }, signOut: vi.fn() }),
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
      // The Operator's saved config, with the Send Cap they chose in Settings.
      getConfig: async () => ({ ...storage.getConfig(), onboardingComplete: true, dailySendCap: h.dailySendCap }),
      getConversations: async () => [],
      getMessages: async () => [],
      getDMUsage: async () => ({ used: 0, resetAt: new Date() }),
      upsertLead: async () => {},
      upsertLeads: async () => {},
      deleteLead: async () => {},
      deleteLeads: async () => {},
      setConfig: async () => {},
      upsertConversations: async () => {},
      upsertMessages: async () => {},
      getMonthlyCount: async () => 0,
      incrementMonthlyCount: async () => 0,
    },
  };
});

import DashboardShell from './DashboardShell';
import { ToastProvider } from '../components/common/Toast';

async function mount() {
  render(
    <MemoryRouter initialEntries={['/dashboard']}>
      <ToastProvider>
        <DashboardShell />
      </ToastProvider>
    </MemoryRouter>,
  );
  await waitFor(() => expect(screen.queryByText(/Loading your pipeline/i)).not.toBeInTheDocument());
}

/** The header pill's "sent/cap" text. */
const pill = () => screen.getByTitle(/confirmed sending today/i).textContent?.replace(/\s+sent today/, '').trim();

/** What the installed extension posts to the page (extension/content.js → window). */
function extensionReports(dailySentCount: number, dailyCap: number) {
  act(() => {
    window.dispatchEvent(
      new MessageEvent('message', { data: { type: EXT_TO_APP.STATS, dailySentCount, dailyCap }, source: window }),
    );
  });
}

describe('header Send Cap pill', () => {
  beforeEach(() => {
    localStorage.clear();
    h.dailySendCap = 80;
  });

  it('shows the Settings cap before the extension reports', async () => {
    await mount();
    expect(pill()).toBe('0/80');
  });

  it('keeps the Settings cap after the extension reports a different stored cap', async () => {
    await mount();
    // The extension stores the cap from the last campaign it was handed. The
    // Operator has since changed Settings to 80; the extension still has 40.
    extensionReports(3, 40);
    await waitFor(() => expect(pill()).toBe('3/80'));
  });

  it('reads a config that never set a cap as 40, the number Settings shows', async () => {
    // The header used to fall back to the plan's 200 while Settings and every
    // handoff fell back to 40.
    h.dailySendCap = undefined;
    await mount();
    expect(pill()).toBe('0/40');
  });
});

describe('Send Cap reaches the extension', () => {
  const posted = () =>
    (postSpy.mock.calls as unknown[][])
      .map((call) => call[0] as { type?: string; payload?: { dailyCap?: number } } | undefined)
      .filter((m) => m?.type === APP_TO_EXT.SETTINGS);
  let postSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    localStorage.clear();
    h.dailySendCap = 80;
    postSpy = vi.spyOn(window, 'postMessage');
  });

  function extensionAnnounces(protocolVersion: number, accepts: string[]) {
    act(() => {
      window.dispatchEvent(
        new MessageEvent('message', {
          data: { type: EXT_TO_APP.HELLO_BACK, protocolVersion, version: '1.6.0', accepts },
          source: window,
        }),
      );
    });
  }

  it('pushes the Settings cap to an extension that accepts it', async () => {
    await mount();
    extensionAnnounces(3, Object.values(APP_TO_EXT));
    await waitFor(() => expect(posted().at(-1)?.payload).toEqual({ dailyCap: 80 }));
  });

  it('pushes nothing to a build too old to act on it', async () => {
    await mount();
    extensionAnnounces(2, Object.values(APP_TO_EXT).filter((n) => n !== APP_TO_EXT.SETTINGS));
    await new Promise((r) => setTimeout(r, 50));
    expect(posted()).toEqual([]);
    // It still shows the Operator's cap, not the old build's.
    extensionReports(5, 40);
    await waitFor(() => expect(pill()).toBe('5/80'));
  });
});
