// Apify actor input schemas, in one place.
//
// The exact field names are the whole point of this module. ab58b53 was a
// production bug caused by them living in two files with a translation step
// between: the client sent `following` / `profileEnriched`, the followers actor
// wanted `followings` / `enrichProfile`, and the mismatch was silent — the
// actor ignored the fields and returned empty runs, so Operators saw
// "No profiles returned."

export const APIFY_BASE = "https://api.apify.com/v2";

const KEYWORD_ACTOR = "apify~instagram-search-scraper";
const DEFAULT_FOLLOWERS_ACTOR = "asIjo32NQuUHP4Fnc";

/** The actor's own hard cap — clamped here, not at each call site. */
export const MAX_SEARCH_LIMIT = 250;

export interface ActorRun {
  actorId: string;
  input: Record<string, unknown>;
}

// deno-lint-ignore no-explicit-any
export function buildActorRun(body: any): ActorRun | null {
  if (body?.mode === "keyword") {
    // apify~instagram-search-scraper:
    //   search (comma-separated terms), searchType ('user'|'hashtag'|'place'),
    //   searchLimit (1..250), enhanceUserSearchWithFacebookPage (bool)
    return {
      actorId: KEYWORD_ACTOR,
      input: {
        search: body.search,
        searchType: body.searchType,
        searchLimit: Math.max(1, Math.min(MAX_SEARCH_LIMIT, Number(body.searchLimit) || 50)),
        enhanceUserSearchWithFacebookPage: body.enhanceUserSearchWithFacebookPage ?? false,
      },
    };
  }

  if (body?.mode === "followers") {
    // thenetaji/instagram-followers-followings-scraper:
    //   username (string[]), type ('followers'|'followings'), enrichProfile
    //   (bool), maxItem (int). Note the plural 'followings' and 'enrichProfile'.
    return {
      actorId: Deno.env.get("APIFY_FOLLOWERS_ACTOR_ID") ?? DEFAULT_FOLLOWERS_ACTOR,
      input: {
        username: Array.isArray(body.usernames) ? body.usernames : [body.usernames].filter(Boolean),
        type: body.type === "following" || body.type === "followings" ? "followings" : "followers",
        maxItem: Math.max(1, Number(body.maxItem) || 100),
        enrichProfile: body.profileEnriched ?? false,
      },
    };
  }

  return null;
}
