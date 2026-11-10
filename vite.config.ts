/// <reference types="vitest/config" />
import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: false,
    setupFiles: ['./src/test/setup.ts'],
    // Only our own tests — never node_modules or the unbundled extension/.
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
  },
  server: {
    port: 3000,
    host: '0.0.0.0',
    // No AI-provider proxies needed: all external API calls now go through the
    // Supabase Edge Functions (generate-dm / generate-reply / scrape), which
    // hold the secret keys server-side.
  },
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        // Split heavy vendors into separate cacheable chunks
        manualChunks: {
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-supabase': ['@supabase/supabase-js'],
          // A third of the entry bundle, and it changes far less often than
          // the app does: its own file is fetched in parallel and stays cached
          // across deploys.
          'vendor-analytics': ['posthog-js'],
        },
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
});
