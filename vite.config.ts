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
    // Supabase Edge Functions (generate-dm / start-scrape / poll-scrape), which
    // hold the secret keys server-side.
  },
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        // Split heavy vendors into separate cacheable chunks
        manualChunks: {
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-recharts': ['recharts'],
          'vendor-supabase': ['@supabase/supabase-js'],
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
