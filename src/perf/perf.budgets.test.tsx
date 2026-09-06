/**
 * Perf measurement harness.
 *
 * Measures four suspected perf symptoms with *counters* rather than wall-clock
 * timings, so the signal is deterministic and CI-safe:
 *
 *   M1  React commits + filterLeads/calculateStats calls per single lead action
 *   M2  Supabase round-trips + rows pulled on dashboard cold load
 *   M3  DOM nodes mounted by the Approval Queue for N leads
 *   M4  localStorage.setItem calls + bytes written per single lead mutation
 *
 * Run just this file:  npx vitest run src/perf/perf.budgets.test.tsx
 */
import { Profiler, type ProfilerOnRenderCallback } from 'react';
import { appendFileSync, writeFileSync } from 'node:fs';
import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import type { Lead, Conversation, Message } from '../lib/types';

// ── Shared mutable fixture state (hoisted so vi.mock factories can see it) ───
const h = vi.hoisted(() => ({
  leads: [] as unknown[],
  convos: [] as unknown[],
  messages: [] as unknown[],
  dbCalls: [] as { name: string; args: unknown[] }[],
  /** Calls that have actually RESOLVED, in order — distinguishes a query that
   *  blocks first paint from one merely started before it. */
  dbResolved: [] as string[],
  /**
   * Held inbox queries. While this is set, getConversations/getMessages do not
   * resolve until the test releases it, so "did first paint wait for the
   * inbox?" is answered by control flow rather than by a stopwatch.
   *
   * This replaced a `setTimeout(200ms)` + `elapsed < 200` assertion, which was
   * really measuring the machine: on a host ~4x slower the mount alone took
   * longer than the injected latency and all three M2 budgets went red
   * together, on code that was structurally fine.
   */
  inboxGate: null as null | { promise: Promise<void>; release: () => void },
}));

vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'u1', email: 'perf@test.dev', user_metadata: {} },
    signOut: vi.fn(),
  }),
}));

vi.mock('../contexts/PlanContext', async () => {
  const { PLAN_LIMITS } = await import('../lib/plans');
  return {
    usePlan: () => ({
      limits: PLAN_LIMITS,
      status: 'active' as const,
      loading: false,
      refresh: async () => 'active' as const,
    }),
  };
});

// Counting fake for the persistence layer. Every call is logged with its args
// so we can see both the number of round-trips and whether any of them are
// bounded (a `limit`/`range` argument).
vi.mock('../lib/db', () => {
  const log = (name: string, args: unknown[]) => h.dbCalls.push({ name, args });
  const done = <T,>(name: string, value: T): T => {
    h.dbResolved.push(name);
    return value;
  };
  const slow = () => h.inboxGate?.promise ?? Promise.resolve();
  return {
    db: {
      getLeads: async (...a: unknown[]) => { log('getLeads', a); return done('getLeads', h.leads as Lead[]); },
      getConfig: async (...a: unknown[]) => { log('getConfig', a); return done('getConfig', null); },
      getConversations: async (...a: unknown[]) => { log('getConversations', a); await slow(); return done('getConversations', h.convos as Conversation[]); },
      getMessages: async (...a: unknown[]) => { log('getMessages', a); await slow(); return done('getMessages', h.messages as Message[]); },
      getDMUsage: async (...a: unknown[]) => { log('getDMUsage', a); return done('getDMUsage', { used: 0, resetAt: new Date() }); },
      upsertLead: async (...a: unknown[]) => { log('upsertLead', a); },
      upsertLeads: async (...a: unknown[]) => { log('upsertLeads', a); },
      deleteLead: async (...a: unknown[]) => { log('deleteLead', a); },
      deleteLeads: async (...a: unknown[]) => { log('deleteLeads', a); },
      setConfig: async (...a: unknown[]) => { log('setConfig', a); },
      upsertConversations: async (...a: unknown[]) => { log('upsertConversations', a); },
      upsertMessages: async (...a: unknown[]) => { log('upsertMessages', a); },
      getMonthlyCount: async () => 0,
      incrementMonthlyCount: async () => 0,
    },
  };
});

import DashboardShell from '../pages/DashboardShell';
import { ToastProvider } from '../components/common/Toast';
import { filterUtils } from '../lib/filters';

/** Mirrors ROW_CHUNK in ApprovalQueue — reported, not asserted. */
const ROW_CHUNK_EXPECTED = 12;

/**
 * The queue's default rows-per-page (`storage.getQueuePageSize`). These tests
 * clear localStorage, so they always measure the default page — not one of the
 * larger sizes the Operator can pick from the pager.
 */
const QUEUE_PAGE_DEFAULT = 25;

// ── Fixtures ─────────────────────────────────────────────────────────────────
function makeLeads(n: number): Lead[] {
  return Array.from({ length: n }, (_, i) => ({
    id: `lead-${i}`,
    campaignId: `camp-${i % 3}`,
    campaignName: `Campaign ${i % 3}`,
    handle: `founder_${i}`,
    name: `Founder ${i}`,
    followers: 1_000 + i * 37,
    bio: 'agency owner helping coaches scale their outreach',
    isPrivate: false,
    status: 'cold' as const,
    dmSent: false,
    replied: false,
    dmContent: `hey founder ${i}, saw you work with coaches — how are you finding clients right now?`,
  }));
}

function makeMessages(n: number): Message[] {
  return Array.from({ length: n }, (_, i) => ({
    id: `msg-${i}`,
    conversationId: `conv-${i % 50}`,
    direction: (i % 2 === 0 ? 'in' : 'out') as Message['direction'],
    text: 'thanks for reaching out, tell me more about how this works',
    createdAt: new Date(Date.now() - i * 60_000).toISOString(),
  }));
}

// ── Mount helper ─────────────────────────────────────────────────────────────
type Commit = { phase: string; actualDuration: number };

/** Set by a test to sample DOM mutations synchronously inside each commit. */
const mutationProbe: { current: (() => void) | null } = { current: null };

async function mountAt(route: string) {
  const commits: Commit[] = [];
  const onRender: ProfilerOnRenderCallback = (_id, phase, actualDuration) => {
    commits.push({ phase, actualDuration });
    mutationProbe.current?.();
  };

  const view = render(
    <MemoryRouter initialEntries={[route]}>
      <ToastProvider>
        <Profiler id="shell" onRender={onRender}>
          <DashboardShell />
        </Profiler>
      </ToastProvider>
    </MemoryRouter>,
  );

  await waitFor(() => {
    expect(screen.queryByText(/Loading your pipeline/i)).not.toBeInTheDocument();
  });

  return { commits, view };
}

// Measurements go to a file — vitest's reporter swallows console output, and a
// file is greppable/diffable between runs.
const REPORT_PATH = process.env.PERF_REPORT ?? 'perf-report.txt';

function report(label: string, rows: Record<string, string | number>) {
  const body = Object.entries(rows)
    .map(([k, v]) => `    ${k.padEnd(38)} ${v}`)
    .join('\n');
  const block = `\n── ${label} ${'─'.repeat(Math.max(0, 58 - label.length))}\n${body}\n`;
  appendFileSync(REPORT_PATH, block);
}

// ── Measurements ─────────────────────────────────────────────────────────────
describe('perf harness', () => {
  beforeAll(() => {
    writeFileSync(REPORT_PATH, `perf report — ${new Date().toISOString()}\n`);
  });

  beforeEach(() => {
    h.leads = [];
    h.convos = [];
    h.messages = [];
    h.dbCalls = [];
    h.dbResolved = [];
    h.inboxGate = null;
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('M1: work done per single lead approve (250 leads in the queue)', async () => {
    h.leads = makeLeads(250);
    const filterSpy = vi.spyOn(filterUtils, 'filterLeads');
    const statsSpy = vi.spyOn(filterUtils, 'calculateStats');

    const { commits } = await mountAt('/queue');
    await screen.findByRole('heading', { name: /Approval Queue/i });
    // The page mounts a chunk of rows per frame; measure a settled table, or
    // the approve below is credited with the rest of the mount.
    await waitFor(() => {
      expect(document.querySelectorAll('tbody tr').length).toBe(QUEUE_PAGE_DEFAULT);
    });

    const mountCommits = commits.length;
    const mountFilterCalls = filterSpy.mock.calls.length;
    const mountLeadsScanned = filterSpy.mock.calls.reduce(
      (sum, [leads]) => sum + (leads as Lead[]).length,
      0,
    );

    // Reset counters, then perform ONE user action: approve the first lead.
    commits.length = 0;
    filterSpy.mockClear();
    statsSpy.mockClear();

    const approveButtons = document.querySelectorAll<HTMLButtonElement>('button[title="Approve"]');
    expect(approveButtons.length).toBeGreaterThan(0);

    // Attribute DOM mutations to each commit: onRender fires synchronously after
    // that commit's DOM writes, so takeRecords() drains exactly this commit's
    // mutations. A commit with 0 mutations rendered 250 rows for nothing.
    const perCommitMutations: number[] = [];
    const kinds = new Map<string, number>();
    const observer = new MutationObserver(() => {});
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      characterData: true,
    });
    mutationProbe.current = () => {
      const records = observer.takeRecords();
      perCommitMutations.push(records.length);
      for (const r of records) {
        const el = r.target as Element;
        const tag = el.nodeType === 1 ? el.tagName.toLowerCase() : `#${el.nodeName}`;
        const key =
          r.type === 'attributes'
            ? `attr:${r.attributeName} on <${tag}>`
            : r.type === 'characterData'
              ? `text on <${(el.parentElement?.tagName ?? '?').toLowerCase()}>`
              : `childList on <${tag}> (+${r.addedNodes.length}/-${r.removedNodes.length})`;
        kinds.set(key, (kinds.get(key) ?? 0) + 1);
      }
    };

    const { act } = await import('@testing-library/react');
    await act(async () => {
      approveButtons[0].click();
    });
    mutationProbe.current = null;
    observer.disconnect();

    const leadsScanned = filterSpy.mock.calls.reduce(
      (sum, [leads]) => sum + (leads as Lead[]).length,
      0,
    );
    const statsScanned = statsSpy.mock.calls.reduce(
      (sum, [leads]) => sum + (leads as Lead[]).length,
      0,
    );

    report('M1 — one lead approved, 250 leads in queue', {
      'commits during mount': mountCommits,
      'filterLeads calls during mount': mountFilterCalls,
      'leads scanned during mount': mountLeadsScanned,
      '--- per single approve ---': '',
      'React commits': commits.length,
      'commit durations (ms)': commits.map((c) => c.actualDuration.toFixed(1)).join(', '),
      'commit phases': commits.map((c) => c.phase).join(', '),
      'DOM mutations per commit': perCommitMutations.join(', '),
      'commits that changed nothing': perCommitMutations.filter((m) => m === 0).length,
      'mutation breakdown': [...kinds.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 8)
        .map(([k, n]) => `${n}× ${k}`)
        .join('\n' + ' '.repeat(43)),
      'total render time (ms)': commits.reduce((s, c) => s + c.actualDuration, 0).toFixed(1),
      'filterLeads calls': filterSpy.mock.calls.length,
      'leads scanned by filterLeads': leadsScanned,
      'calculateStats calls': statsSpy.mock.calls.length,
      'leads scanned by calculateStats': statsScanned,
    });

    // ── Budgets ──────────────────────────────────────────────────────────────
    // Approving one lead changes one row. It should cost one commit and a
    // handful of DOM writes, not a full-table rewrite.
    // Budget is 2, not 1: the state change itself commits once, plus one cheap
    // (~3 ms, 0 DOM writes) settle after the awaited db round-trip. The third
    // commit here is the derived-state effect re-rendering the whole table.
    const totalMutations = perCommitMutations.reduce((a, b) => a + b, 0);
    expect.soft(commits.length, 'React commits per single approve').toBeLessThanOrEqual(2);
    expect.soft(totalMutations, 'DOM writes per single approve').toBeLessThan(50);
  });

  it('M2: cold-load round-trips and rows pulled before first paint', async () => {
    h.leads = makeLeads(250);
    h.convos = Array.from({ length: 50 }, (_, i) => ({
      id: `conv-${i}`,
      handle: `founder_${i}`,
      unread: false,
      status: 'open',
      needsReply: false,
    }));
    h.messages = makeMessages(5_000);

    // Hold the inbox queries open. If first paint needs them, mountAt can never
    // resolve — no timing involved, so the verdict is the same on any machine.
    let release!: () => void;
    h.inboxGate = {
      promise: new Promise<void>((r) => { release = r; }),
      release: () => release(),
    };

    const t0 = performance.now();
    const { commits } = await Promise.race([
      mountAt('/dashboard'),
      new Promise<never>((_, reject) =>
        setTimeout(
          () => reject(new Error('first paint never happened while the inbox queries were held open')),
          5_000,
        ),
      ),
    ]);
    const elapsed = performance.now() - t0;
    const resolvedAtPaint = [...h.dbResolved];

    // Let the held queries finish so the component isn't torn down mid-flight.
    h.inboxGate.release();
    await waitFor(() => expect(h.dbResolved).toContain('getMessages'));

    const rowsAtPaint =
      (resolvedAtPaint.includes('getLeads') ? h.leads.length : 0) +
      (resolvedAtPaint.includes('getConversations') ? h.convos.length : 0) +
      (resolvedAtPaint.includes('getMessages') ? h.messages.length : 0);

    report('M2 — dashboard cold load (inbox queries held open)', {
      'db round-trips started': h.dbCalls.length,
      'calls started': h.dbCalls.map((c) => c.name).join(', '),
      'resolved before first paint': resolvedAtPaint.join(', ') || '(none)',
      'rows pulled before first paint': rowsAtPaint,
      'rows pulled in total': h.leads.length + h.convos.length + h.messages.length,
      'commits to first paint': commits.length,
      'time to first paint (ms)': elapsed.toFixed(0), // reported, never asserted
    });

    // ── Budgets ──────────────────────────────────────────────────────────────
    // The dashboard must not block first paint on the Operator's entire inbox
    // history. Starting the query early is fine; awaiting it is not.
    expect.soft(resolvedAtPaint, 'awaited before first paint').not.toContain('getMessages');
    expect.soft(resolvedAtPaint, 'awaited before first paint').not.toContain('getConversations');
    expect.soft(rowsAtPaint, 'rows awaited before first paint').toBeLessThanOrEqual(500);
  });

  it('M3: DOM nodes mounted by the Approval Queue', async () => {
    for (const n of [25, 250]) {
      h.leads = makeLeads(n);
      h.dbCalls = [];
      const { view } = await mountAt('/queue');
      await screen.findByRole('heading', { name: /Approval Queue/i });
      const settled = Math.min(n, QUEUE_PAGE_DEFAULT);
      await waitFor(() => {
        expect(document.querySelectorAll('tbody tr').length).toBe(settled);
      });

      const rows = document.querySelectorAll('tbody tr').length;
      const nodes = document.querySelectorAll('*').length;
      const buttons = document.querySelectorAll('button').length;
      const svgs = document.querySelectorAll('svg').length;

      report(`M3 — Approval Queue with ${n} leads`, {
        'rendered <tr> rows': rows,
        'total DOM elements': nodes,
        'buttons mounted': buttons,
        'svg icons mounted': svgs,
        'DOM elements per lead': (nodes / n).toFixed(1),
      });

      // ── Budget ────────────────────────────────────────────────────────────
      // The queue must not mount an unbounded table. Whatever the lead count,
      // only a page/window of rows should be in the DOM. The ceiling tracks the
      // default page (was 60 against a 50-row page); the queue's own tests cover
      // the larger sizes the pager offers.
      expect.soft(rows, `rendered rows for ${n} leads`).toBeLessThanOrEqual(QUEUE_PAGE_DEFAULT + 5);

      view.unmount();
    }
  });

  it('M5: navigating Dashboard -> Approval Queue with 250 leads', async () => {
    h.leads = makeLeads(250);
    const { commits } = await mountAt('/dashboard');

    const nodesBefore = document.querySelectorAll('*').length;
    commits.length = 0;

    // onRender fires synchronously after each commit's DOM writes, so sampling
    // the element count here attributes nodes to the commit that added them.
    const nodesPerCommit: number[] = [];
    mutationProbe.current = () => {
      nodesPerCommit.push(document.querySelectorAll('*').length);
    };

    const { act } = await import('@testing-library/react');
    const link = document.querySelector<HTMLAnchorElement>('a[href="/queue"]')!;
    const t0 = performance.now();
    await act(async () => {
      link.click();
    });
    await screen.findByRole('heading', { name: /Approval Queue/i });
    await waitFor(() => {
      expect(document.querySelectorAll('tbody tr').length).toBe(QUEUE_PAGE_DEFAULT);
    });
    const elapsed = performance.now() - t0;
    mutationProbe.current = null;

    const nodesAfter = document.querySelectorAll('*').length;
    const added = nodesPerCommit.map((n, i) => n - (i === 0 ? nodesBefore : nodesPerCommit[i - 1]));
    const worstCommit = Math.max(...commits.map((c) => c.actualDuration));

    report('M5 - navigate /dashboard -> /queue, 250 leads', {
      'React commits': commits.length,
      'commit durations (ms)': commits.map((c) => c.actualDuration.toFixed(1)).join(', '),
      'slowest single commit (ms)': worstCommit.toFixed(1),
      'total render time (ms)': commits.reduce((s, c) => s + c.actualDuration, 0).toFixed(1),
      'wall clock until settled (ms)': elapsed.toFixed(0),
      'DOM elements before': nodesBefore,
      'DOM elements after': nodesAfter,
      'DOM elements added': nodesAfter - nodesBefore,
      'elements added per commit': added.join(', '),
      'largest single commit (elements)': Math.max(...added),
      'rows in first commit': ROW_CHUNK_EXPECTED,
      'svg icons in table': document.querySelectorAll('tbody svg').length,
    });

    // -- Budget --------------------------------------------------------------
    // Clicking the nav link must paint something. The whole page (~2,000 nodes,
    // 300 icons) in one commit is what made the click feel frozen, so no single
    // commit may build the entire table.
    expect.soft(Math.max(...added), 'DOM elements added by any single commit')
      .toBeLessThan(1200);
  });

  it('M4: localStorage writes per single lead mutation', async () => {
    h.leads = makeLeads(250);
    await mountAt('/queue');
    await screen.findByRole('heading', { name: /Approval Queue/i });
    await waitFor(() => {
      expect(document.querySelectorAll('tbody tr').length).toBe(QUEUE_PAGE_DEFAULT);
    });

    let calls = 0;
    let bytes = 0;
    const spy = vi
      .spyOn(Storage.prototype, 'setItem')
      .mockImplementation(function (this: Storage, k: string, v: string) {
        calls += 1;
        bytes += k.length + v.length;
      });

    const approveButtons = document.querySelectorAll<HTMLButtonElement>('button[title="Approve"]');
    const { act } = await import('@testing-library/react');
    await act(async () => {
      approveButtons[0].click();
    });

    spy.mockRestore();

    report('M4 — one approve, 250 leads (signed-in / Supabase path)', {
      'localStorage.setItem calls': calls,
      'bytes serialised': bytes,
    });

    // ── Budget ───────────────────────────────────────────────────────────────
    // Guard, not a bug: the signed-in path writes through db, so no whole-array
    // JSON serialisation should happen on a single lead mutation. This locks
    // that in against someone "adding a localStorage cache" later.
    expect.soft(calls, 'localStorage writes per single approve').toBe(0);
  });
});
