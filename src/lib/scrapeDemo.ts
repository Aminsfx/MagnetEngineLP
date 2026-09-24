import { FunctionError } from './functions';
import {
    ENRICH_BATCH,
    parseSource,
    type ProfileRow,
    type Source,
    type SourceKind,
} from '../../supabase/functions/_shared/hiker.ts';

/**
 * A stand-in for the `scrape` Edge Function, for trying the Campaign Builder
 * without a HikerAPI key. On only when `VITE_SCRAPE_DEMO=true` (`npm run demo`).
 *
 * It answers the same two ops with the same shapes, paging, error codes and
 * short-then-enriched rows as the real function, so everything downstream of
 * the network — the client loop, Stop, dedupe, notes, intake, the queue — is
 * the real code running on fake profiles.
 *
 * **Every handle contains a hyphen.** Instagram usernames cannot, so no demo
 * Lead can ever be the handle of a real person: if one reaches the extension,
 * Instagram answers "page not available" and nothing is sent to anyone.
 *
 * Try these to see the error paths:
 *   followers/following of an account containing "private" → private_target
 *   an account or place containing "nobody", a post link containing "deleted" → not_found
 */

const FIRST = ['Jade', 'Marcus', 'Priya', 'Leo', 'Sofia', 'Daniel', 'Amara', 'Noah', 'Chloe', 'Ethan', 'Maya', 'Omar', 'Isla', 'Lucas', 'Zara', 'Theo', 'Nina', 'Kai', 'Elena', 'Sam'];
const LAST = ['Reyes', 'Okafor', 'Hart', 'Lindqvist', 'Moreau', 'Chen', 'Costa', 'Brooks', 'Nakamura', 'Silva', 'Patel', 'Walsh', 'Haddad', 'Novak', 'Ortiz'];
const CITIES = ['Miami', 'Austin', 'London', 'Dubai', 'Toronto', 'Sydney', 'New York', 'Lisbon', 'Manchester', 'Los Angeles'];

interface Niche {
    match: RegExp;
    category: string;
    words: string[];
    bios: string[];
}

const NICHES: Niche[] = [
    {
        match: /coach|mindset|mentor/i,
        category: 'Coach',
        words: ['coaching', 'coach', 'mindset'],
        bios: [
            'Helping busy founders build a business that runs without them | 1:1 coaching | DM "START"',
            'Business coach for service providers 🚀 From $5k to $20k months | Free training ↓',
            'Mindset + accountability coach | Ex-corporate | Taking 3 new clients this month',
        ],
    },
    {
        match: /agency|smma|marketing|ads|growth|media/i,
        category: 'Marketing Agency',
        words: ['agency', 'media', 'growth'],
        bios: [
            'We help local businesses get 30+ booked calls a month with paid ads 📈 | Book a call ↓',
            'SMMA owner | Content + ads for coaches | Scaling to $50k/mo in public',
            'Performance marketing for DTC brands | Meta + TikTok ads | Case studies in highlights',
        ],
    },
    {
        match: /real ?estate|realtor|property|homes/i,
        category: 'Real Estate Agent',
        words: ['homes', 'realty', 'properties'],
        bios: [
            'Luxury real estate 🏡 | Buying, selling & investing | DM for off-market listings',
            'Realtor helping first-time buyers win in a tough market | Top 1% agent',
            'Real estate investor + agent | Short-term rentals | Free buyer guide ↓',
        ],
    },
    {
        match: /fit|gym|train|strength|yoga/i,
        category: 'Personal Trainer',
        words: ['fit', 'training', 'strength'],
        bios: [
            'Online fitness coach for busy dads 💪 | Lost 20lbs? DM me "FIT"',
            'Strength coach | Studio owner | Online programs for women 30+',
            'Personal trainer | Nutrition without the BS | 12-week transformations',
        ],
    },
    {
        match: /shop|store|ecom|brand|dtc|product/i,
        category: 'Shopping & Retail',
        words: ['shop', 'store', 'studio'],
        bios: [
            'Handmade ceramics 🌿 Small-batch, shipped worldwide | Shop ↓',
            'Sustainable activewear brand | Founder-led | New drop Friday',
            'Skincare brand built by a dermatologist | Clean formulas | Free shipping over $50',
        ],
    },
    {
        match: /beauty|salon|lash|skin|nail|hair/i,
        category: 'Beauty Salon',
        words: ['beauty', 'lashes', 'skin'],
        bios: [
            'Lash + brow studio ✨ | Booking link below | Now hiring techs',
            'Award-winning hair salon | Colour specialists | Book online',
            'Aesthetician | Skin clinic owner | Glow facials & peels',
        ],
    },
];

/** Page size and how many profiles a query has in total, per source. */
const SHAPE: Record<Exclude<SourceKind, 'profiles'>, { size: number; total: number }> = {
    keyword: { size: 30, total: 90 },
    hashtag: { size: 24, total: 220 },
    followers: { size: 50, total: 400 },
    following: { size: 50, total: 180 },
    likers: { size: 120, total: 120 },
    commenters: { size: 15, total: 60 },
    location: { size: 24, total: 150 },
    similar: { size: 45, total: 45 },
};

const LIMIT = 5000;
let used = 0;
const profiles = new Map<string, ProfileRow>();

function hash(s: string): number {
    let h = 2166136261;
    for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
    return h >>> 0;
}

/** mulberry32 — seeded, so a query returns the same people every time. */
function rng(seed: number): () => number {
    let a = seed;
    return () => {
        a = (a + 0x6D2B79F5) | 0;
        let t = Math.imul(a ^ (a >>> 15), 1 | a);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

const pick = <T,>(r: () => number, xs: T[]): T => xs[Math.floor(r() * xs.length)];
const title = (s: string) => s.replace(/\b\w/g, c => c.toUpperCase());

function nicheFor(query: string, r: () => number): Niche {
    return NICHES.find(n => n.match.test(query)) ?? pick(r, NICHES);
}

/** One demo person: stored in full, returned short (as the list endpoints do). */
function person(src: Source, index: number): ProfileRow {
    const r = rng(hash(`${src.kind}:${src.query}:${index}`));
    const niche = nicheFor(src.query, r);
    const first = pick(r, FIRST);
    const last = pick(r, LAST);
    const username = `${first.toLowerCase()}-${pick(r, niche.words)}-${index + 1}`;
    const pk = String(1_000_000_000 + (hash(username + src.query) % 8_999_999_999));
    const followers = Math.round(Math.exp(5.5 + r() * 6)); // ~250 to ~100k, log-spread

    const full: ProfileRow = {
        pk,
        username,
        full_name: `${first} ${last}`,
        biography: pick(r, niche.bios),
        follower_count: followers,
        following_count: Math.round(200 + r() * 1800),
        media_count: Math.round(20 + r() * 900),
        is_private: r() < 0.12,
        is_verified: r() < 0.03,
        is_business: r() < 0.6,
        category: niche.category,
        city_name: src.kind === 'location' ? title(src.query) : pick(r, CITIES),
    };
    profiles.set(pk, full);
    return { pk, username, full_name: full.full_name, is_private: full.is_private, is_verified: full.is_verified };
}

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

function notFound(src: Source): never {
    const q = src.query;
    const message = {
        keyword: `No accounts matched "${q}".`,
        hashtag: `#${q} has no recent posts.`,
        followers: `There's no Instagram account called @${q}.`,
        following: `There's no Instagram account called @${q}.`,
        similar: `There's no Instagram account called @${q}.`,
        likers: "That post couldn't be found — it may be private or deleted.",
        commenters: "That post couldn't be found — it may be private or deleted.",
        location: `No Instagram place matches "${q}".`,
        profiles: 'None of those accounts exist.',
    }[src.kind];
    throw new FunctionError(message, { code: 'not_found' });
}

function targetLabel(src: Source): string | undefined {
    if (src.kind === 'followers' || src.kind === 'following' || src.kind === 'similar') return `@${src.query}`;
    if (src.kind === 'location') return title(src.query);
    if (src.kind === 'likers' || src.kind === 'commenters') return 'the post';
    return undefined;
}

export async function demoScrape(
    body: Record<string, unknown>,
    opts: { delayMs?: number } = {},
): Promise<unknown> {
    const delay = opts.delayMs ?? 450 + Math.random() * 500;

    if (body.op === 'enrich') {
        const ids = Array.isArray(body.ids) ? (body.ids as string[]).slice(0, ENRICH_BATCH) : [];
        await sleep(delay * 1.5);
        used += ids.length;
        const rows = ids.map(id => profiles.get(id)).filter((r): r is ProfileRow => !!r);
        return { rows, used, limit: LIMIT };
    }

    const src = parseSource(body.source);
    if (!src) throw new FunctionError('That search is empty or not in a form Instagram accepts.', { code: 'bad_source' });
    await sleep(delay);

    if (src.kind === 'profiles') {
        const missing: string[] = [];
        const rows: ProfileRow[] = [];
        for (const name of src.query.split(',')) {
            if (name.includes('nobody')) { missing.push(name); continue; }
            // Never the typed handle itself — that one may be a real person.
            const demo = person({ kind: 'profiles', query: name }, 0);
            const full = { ...profiles.get(demo.pk)!, username: `${name.replace(/[._]+/g, '-')}-demo` };
            profiles.set(full.pk, full);
            rows.push(full);
        }
        used += src.query.split(',').length;
        return { rows, complete: true, cursor: null, missing, used, limit: LIMIT };
    }

    if (/nobody|deleted/.test(src.query)) notFound(src);
    if ((src.kind === 'followers' || src.kind === 'following') && src.query.includes('private')) {
        throw new FunctionError(
            `@${src.query} is private — Instagram doesn't show its ${src.kind} list to anyone.`,
            { code: 'private_target' },
        );
    }

    let page = 0;
    try {
        page = Number(JSON.parse(String(body.cursor ?? '{}')).p ?? 0) || 0;
    } catch { /* first page */ }

    const { size, total } = SHAPE[src.kind];
    const start = page * size;
    const rows = Array.from({ length: Math.max(0, Math.min(size, total - start)) }, (_, i) => person(src, start + i));
    const more = start + size < total;
    used += page === 0 && targetLabel(src) ? 2 : 1; // the target lookup, then the page

    return {
        rows,
        complete: false,
        cursor: more ? JSON.stringify({ p: String(page + 1) }) : null,
        target: targetLabel(src),
        used,
        limit: LIMIT,
    };
}
