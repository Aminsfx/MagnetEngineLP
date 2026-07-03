/// <reference types="vite/client" />

interface ImportMetaEnv {
    readonly VITE_APIFY_API_KEY?: string;
    readonly VITE_APIFY_FOLLOWERS_ACTOR_ID?: string;
    readonly VITE_SUPABASE_URL?: string;
    readonly VITE_SUPABASE_ANON_KEY?: string;
    readonly VITE_OPENAI_API_KEY?: string;
    readonly VITE_CLAUDE_API_KEY?: string;
    readonly VITE_GEMINI_API_KEY?: string;
    readonly VITE_PAYMENT_LINK_STARTER?: string;
    readonly VITE_PAYMENT_LINK_PRO?: string;
    readonly VITE_PAYMENT_LINK_AGENCY?: string;
}

interface ImportMeta {
    readonly env: ImportMetaEnv;
}
