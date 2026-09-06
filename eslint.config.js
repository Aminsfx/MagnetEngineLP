// @ts-check
import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    // Replaces .eslintignore. `supabase/functions` is Deno (npm:/jsr: specifiers
    // + Deno globals) and is not part of this TS project.
    ignores: ['dist/**', 'node_modules/**', 'supabase/**', '*.zip'],
  },

  // ---- App source: React + TypeScript ----
  {
    files: ['src/**/*.{ts,tsx}', 'index.tsx'],
    extends: [js.configs.recommended, tseslint.configs.recommended],
    languageOptions: {
      ecmaVersion: 2022,
      globals: globals.browser,
      parserOptions: {
        ecmaFeatures: { jsx: true },
      },
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...reactHooks.configs['recommended-latest'].rules,

      // Unused vars are already caught by `tsc --noEmit` (noUnusedLocals), so
      // this rule only exists to allow the `_`-prefix escape hatch.
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrors: 'none' },
      ],

      // Vibe-coded `any` is real debt, but failing the build on it today would
      // block every other check. Surfaced as a warning to be paid down.
      '@typescript-eslint/no-explicit-any': 'warn',

      // 6 violations at baseline, and the prime suspects for the two known perf
      // symptoms (slow dashboard load; re-render on returning to the tab). Held
      // at 'warn' so `npm run verify` has a GREEN baseline that can detect new
      // breakage; promote back to 'error' as each is fixed:
      //   src/pages/DashboardShell.tsx:218        src/contexts/PlanContext.tsx:65
      //   src/pages/ProfilePage.tsx:24            src/pages/AdminPage.tsx:48
      //   src/components/dashboard/AIAnalyst.tsx:158
      //   src/components/LiveWorkflowDemo.tsx:188
      'react-hooks/set-state-in-effect': 'warn',

      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
    },
  },

  // ---- Tests ----
  {
    files: ['src/**/*.{test,spec}.{ts,tsx}', 'src/test/**/*.ts'],
    languageOptions: {
      globals: { ...globals.browser, ...globals.node },
    },
  },

  // ---- Chrome MV3 extension: plain browser JS with extension APIs ----
  {
    files: ['extension/**/*.js'],
    extends: [js.configs.recommended],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'script',
      globals: { ...globals.browser, ...globals.webextensions },
    },
    rules: {
      'no-unused-vars': ['error', { argsIgnorePattern: '^_', caughtErrors: 'none' }],
    },
  },

  // ---- Node-side build scripts and configs ----
  {
    files: ['scripts/**/*.mjs', '*.config.js', 'vite.config.ts', 'eslint.config.js'],
    extends: [js.configs.recommended],
    languageOptions: {
      ecmaVersion: 2022,
      globals: globals.node,
    },
  },
);
