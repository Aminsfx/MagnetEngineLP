import { test as base, chromium, type BrowserContext, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { langFor, profilePage } from './fakeInstagram';

/**
 * The real extension (the `extension/` folder, unpacked) in a real Chromium,
 * with instagram.com answered by `fakeInstagram.ts` and the dashboard by a
 * blank page on localhost, which is one of the hosts the extension's content
 * script relays for.
 *
 * Nothing here reaches the network: every request to instagram.com is
 * fulfilled by the route below, so a test can never touch a real account.
 */

/**
 * The extension APIs the functions handed to `popup.evaluate` use. Those run
 * inside the extension's own page, not here, so this only tells TypeScript the
 * shape of what they call.
 */
declare const chrome: {
  tabs: { query(query: { url: string }): Promise<Array<{ id?: number }>> };
  storage: {
    local: {
      get(keys: null): Promise<Record<string, unknown>>;
      set(items: Record<string, unknown>): Promise<void>;
    };
  };
};

const EXTENSION = path.resolve(process.cwd(), 'extension');
const DASHBOARD = 'http://localhost:4173/';
/** An empty instagram.com page for the Sender Tab to sit on before its first send. */
const BLANK = '/__blank';

interface Protocol {
  APP_TO_EXT: Record<string, string>;
  EXT_TO_APP: Record<string, string>;
}

/**
 * The wire names, read from the one file that defines them. protocol.js is a
 * classic script that publishes a global, so it is evaluated the way the
 * browser loads it (as `extensionProtocol.test.ts` does).
 */
function loadProtocol(): Protocol {
  const source = readFileSync(path.join(EXTENSION, 'protocol.js'), 'utf8');
  const scope: Record<string, unknown> = {};
  new Function('globalThis', source)(scope);
  return scope.MAGNET_PROTOCOL as Protocol;
}

export const PROTOCOL = loadProtocol();

/** One message the stand-in Instagram accepted. */
export interface SentMessage {
  handle: string;
  text: string;
  lang: string;
}

export interface Lead {
  handle: string;
  message: string;
}

/** What the tests drive: the dashboard page, and what Instagram and the extension saw. */
export interface Harness {
  /** Hand a campaign to the extension, the way the dashboard does. */
  handOff(leads: Lead[]): Promise<void>;
  /** Messages the extension has posted back to the dashboard, of one type. */
  received(type: string): Promise<Array<Record<string, unknown>>>;
  /** Every message Instagram accepted, in order. */
  sent: SentMessage[];
  /** Every profile URL the Sender Tab was sent to, in order. */
  opened: string[];
  /** The extension's own stored state. */
  storage(): Promise<Record<string, unknown>>;
}

export const test = base.extend<{ context: BrowserContext; harness: Harness }>({
  // eslint-disable-next-line no-empty-pattern
  context: async ({}, use) => {
    const context = await chromium.launchPersistentContext('', {
      // Playwright's own Chromium is what loads an unpacked extension in
      // headless mode. Where that build will not start (some Windows setups
      // refuse it), E2E_CHANNEL=msedge runs the same tests in installed Edge.
      channel: process.env.E2E_CHANNEL || 'chromium',
      args: [
        `--disable-extensions-except=${EXTENSION}`,
        `--load-extension=${EXTENSION}`,
        // No name resolves, so nothing can reach a real server. The routes
        // below answer before the network is asked; a request that slips past
        // them (a tab the browser opened before Playwright attached to it did,
        // once, and loaded the real instagram.com) now simply fails.
        '--host-resolver-rules=MAP * ~NOTFOUND, EXCLUDE localhost',
      ],
    });
    await use(context);
    await context.close();
  },

  harness: async ({ context }, use) => {
    const sent: SentMessage[] = [];
    const opened: string[] = [];

    await context.route('https://www.instagram.com/**', async (route) => {
      const request = route.request();
      const url = new URL(request.url());

      if (url.pathname === '/__sent') {
        sent.push(JSON.parse(request.postData() ?? '{}') as SentMessage);
        await route.fulfill({ status: 204 });
        return;
      }
      if (request.resourceType() !== 'document') {
        await route.fulfill({ status: 204 });
        return;
      }
      const handle = decodeURIComponent(url.pathname.split('/').filter(Boolean)[0] ?? '');
      if (url.pathname === BLANK) {
        await route.fulfill({ contentType: 'text/html', body: '<!doctype html><title>Instagram</title><main></main>' });
        return;
      }
      opened.push(request.url());
      await route.fulfill({
        contentType: 'text/html; charset=utf-8',
        body: profilePage(handle, langFor(handle, url.searchParams.get('hl'))),
      });
    });

    await context.route(`${DASHBOARD}**`, (route) =>
      route.fulfill({ contentType: 'text/html', body: '<!doctype html><title>dashboard</title><body>dashboard</body>' }),
    );

    let [worker] = context.serviceWorkers();
    if (!worker) worker = await context.waitForEvent('serviceworker');
    const extensionId = worker.url().split('/')[2];

    // The extension's own popup page reads its storage. A handle on the service
    // worker would go stale when Chrome puts the worker to sleep between sends.
    const popup = await context.newPage();
    await popup.goto(`chrome-extension://${extensionId}/popup.html`);

    // The Sender Tab, opened here and handed to the extension as the one it
    // already has. Left to open its own, the worker's `chrome.tabs.create`
    // starts loading before Playwright is attached to the new tab, so that
    // first page is not intercepted. A tab the worker only navigates is.
    const senderTab = await context.newPage();
    await senderTab.goto(`https://www.instagram.com${BLANK}`);
    await popup.evaluate(async () => {
      const [tab] = await chrome.tabs.query({ url: 'https://www.instagram.com/*' });
      if (!tab?.id) throw new Error('the Sender Tab was not found');
      await chrome.storage.local.set({ senderTabId: tab.id });
    });

    const dashboard: Page = await context.newPage();
    // The content script answers a queued campaign with alert(); nobody is
    // there to press OK.
    dashboard.on('dialog', (dialog) => void dialog.dismiss());
    await dashboard.goto(DASHBOARD);
    await dashboard.evaluate(() => {
      const w = window as unknown as { __fromExtension: unknown[] };
      w.__fromExtension = [];
      window.addEventListener('message', (event) => {
        if (event.source === window && typeof event.data?.type === 'string') w.__fromExtension.push(event.data);
      });
    });

    // Who is signed in, as AuthProvider tells the extension on every load.
    await dashboard.evaluate(
      ({ type }) => window.postMessage({ type, payload: { userId: 'e2e-user', email: 'e2e@example.test' } }, '*'),
      { type: PROTOCOL.APP_TO_EXT.SESSION },
    );

    await use({
      sent,
      opened,
      async handOff(leads) {
        await dashboard.evaluate(
          ({ type, leads }) =>
            window.postMessage(
              // Minutes. Small enough that a test does not wait out a human's pacing.
              { type, payload: { leads, minDelay: 0.01, maxDelay: 0.02, dailyCap: 40 } },
              '*',
            ),
          { type: PROTOCOL.APP_TO_EXT.CAMPAIGN, leads },
        );
      },
      received(type) {
        return dashboard.evaluate(
          (wanted) =>
            (window as unknown as { __fromExtension: Array<Record<string, unknown>> }).__fromExtension.filter(
              (message) => message.type === wanted,
            ),
          type,
        );
      },
      storage() {
        return popup.evaluate(() => chrome.storage.local.get(null)) as Promise<Record<string, unknown>>;
      },
    });
  },
});

export const expect = test.expect;
