/// <reference types="vite/client" />

interface ImportMetaEnv {
    // ── Frontend (public) env only. These ship in the client bundle by design. ──
    // Supabase publishable/anon key is safe in the browser (RLS protects data).
    readonly VITE_SUPABASE_URL?: string;
    readonly VITE_SUPABASE_ANON_KEY?: string;
    // Whop plan IDs are public identifiers shown in the checkout embed.
    readonly VITE_WHOP_PLAN_ID_MONTHLY?: string;
    readonly VITE_WHOP_PLAN_ID_ANNUAL?: string;
    // Owner emails — cosmetic /admin UI gate; real enforcement is server-side.
    readonly VITE_ADMIN_EMAILS?: string;
    // 'true' only under `npm run demo` (.env.demo): the Campaign Builder scrapes
    // generated sample profiles instead of calling the `scrape` function.
    readonly VITE_SCRAPE_DEMO?: string;
    // PostHog's browser key and ingestion host are public client configuration.
    readonly VITE_POSTHOG_KEY?: string;
    readonly VITE_POSTHOG_HOST?: string;
    // The extension's Chrome Web Store listing — onboarding and the Inbox link to it.
    readonly VITE_EXTENSION_URL?: string;
    //
    // Secret keys (HikerAPI, Claude/OpenAI/Gemini, Whop webhook secret, admin list)
    // are NOT here — they live only in Supabase Edge Function secrets and are
    // never exposed to the browser. See README → "Frontend vs backend env".
}

interface ImportMeta {
    readonly env: ImportMetaEnv;
}
