// Runs before every test file (wired via `test.setupFiles` in vite.config.ts).
// Registers jest-dom's DOM matchers (toBeInTheDocument, toHaveTextContent, ...)
// with Vitest's `expect`.
import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

// React Testing Library only auto-cleans up when `globals: true`. We use
// explicit imports, so unmount between tests ourselves to stop DOM leaking
// from one test into the next.
afterEach(() => {
  cleanup();
});
