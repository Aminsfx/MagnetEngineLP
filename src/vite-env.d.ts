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
    //
    // Secret keys (Apify, Claude/OpenAI/Gemini, Whop webhook secret, admin list)
    // are NOT here — they live only in Supabase Edge Function secrets and are
    // never exposed to the browser. See README → "Frontend vs backend env".
}

interface ImportMeta {
    readonly env: ImportMetaEnv;
}
