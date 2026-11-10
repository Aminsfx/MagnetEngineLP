import { defineConfig } from '@playwright/test';

/**
 * End-to-end tests of the extension, in a real Chromium, against a stand-in
 * Instagram (e2e/extension). `npm run test:e2e`.
 *
 * The unit suites (vitest) run the extension's modules in jsdom, which has no
 * layout, no `execCommand`, no service worker and no tabs. Everything the
 * Sender does with those is only ever exercised here.
 *
 * Named `*.e2e.ts` so vitest, which collects `*.test.ts`, never picks them up.
 */
export default defineConfig({
  testDir: 'e2e',
  testMatch: '**/*.e2e.ts',
  // One extension, one Sender Tab, one queue: the tests cannot share a browser.
  workers: 1,
  fullyParallel: false,
  // A send is paced like a person (seconds of waiting between steps), and a
  // profile with no Message button is waited on for 20 s before it is given up.
  timeout: 240_000,
  expect: { timeout: 90_000 },
  reporter: [['list']],
  forbidOnly: !!process.env.CI,
});
