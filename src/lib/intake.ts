import type { Lead, ColumnMapping } from './types';

/**
 * Lead intake — the only way a Lead enters the product.
 *
 * Three sources feed it (keyword search, followers scrape, CSV upload) and each
 * used to build Leads its own way: two alias tables in apify.ts that disagreed
 * about follower-count field names, a third parser in CsvImport, three
 * different handle normalizers, and dedupe in two unrelated modules. The
 * invariant that actually matters — a Handle is lowercase, `@`-less, URL-less,
 * and unique — was enforced nowhere in the type and re-derived at four call
 * sites, which is how d836a3e (duplicate Leads across scrapes) happened.
 *
 * Everything a source knows is a bag of loosely-typed rows. Everything that
 * comes back out satisfies the invariants, so downstream code can assume them.
 */

type RawRow = Record<string, unknown>;

export interface IntakeResult {
  /** Canonical, de-duplicated within this batch. */
  leads: Lead[];
  /** Rows dropped: no usable handle, or a repeat of one earlier in the batch. */
  skipped: number;
}

export type IntakeRequest =
  | { source: 'search'; rows: RawRow[]; campaignId: string }
  | { source: 'followers'; rows: RawRow[]; campaignId: string }
  | { source: 'csv'; rows: RawRow[]; campaignId: string; mapping: ColumnMapping };

// ─── Canonical forms ─────────────────────────────────────────────────────────

/**
 * A Handle in canonical form: lowercase, no leading `@`, no profile URL.
 * Returns '' when there's nothing usable, which is the caller's signal to skip.
 */
export function canonicalHandle(raw: unknown): string {
  let s = String(raw ?? '').trim().toLowerCase();
  if (!s) return '';
  if (s.includes('instagram.com')) {
    s = s.replace(/[?#].*$/, '').replace(/\/+$/, '');
    s = s.slice(s.lastIndexOf('/') + 1);
  }
  return s.replace(/^@/, '').trim();
}

/** Follower counts arrive as 12345, "12,345", "1.2K" or "3M" depending on source. */
export function parseFollowerCount(raw: unknown): number {
  if (typeof raw === 'number') return Number.isFinite(raw) ? Math.round(raw) : 0;
  const s = String(raw ?? '').trim().replace(/,/g, '');
  if (!s) return 0;
  const m = s.match(/^([\d.]+)\s*([kKmM])?$/);
  if (!m) return 0;
  const n = parseFloat(m[1]);
  if (!Number.isFinite(n)) return 0;
  const suffix = m[2]?.toLowerCase();
  const mult = suffix === 'm' ? 1_000_000 : suffix === 'k' ? 1_000 : 1;
  return Math.round(n * mult);
}

/** CSV booleans: "true" / "1" / "yes" (any case) are true, everything else false. */
export function parseBoolean(raw: unknown): boolean {
  if (typeof raw === 'boolean') return raw;
  const s = String(raw ?? '').trim().toLowerCase();
  return s === 'true' || s === '1' || s === 'yes';
}

// ─── Scraper field aliases ───────────────────────────────────────────────────
// One table for both scrapers. The keyword actor returns camelCase, the
// followers actor a mix of snake_case and GraphQL edges; splitting these into
// two mappers is how the two ended up disagreeing about which aliases exist.

const ALIASES = {
  handle: ['username', 'handle', 'userName'],
  name: ['fullName', 'full_name', 'name', 'displayName'],
  followers: ['followersCount', 'followers', 'followers_count'],
  following: ['followingCount', 'following', 'following_count'],
  postsCount: ['postsCount', 'mediaCount', 'posts'],
  bio: ['biography', 'bio', 'description'],
  isPrivate: ['isPrivate', 'is_private'],
  verified: ['isVerified', 'verified', 'is_verified'],
  businessAccount: ['isBusinessAccount', 'is_business_account', 'isBusiness'],
  businessCategory: ['businessCategoryName', 'business_category_name', 'category_name', 'category'],
  profilePicUrl: ['profilePicUrl', 'profile_pic_url', 'profilePicUrlHD'],
  city: ['city', 'locationName'],
} as const;

function pick(row: RawRow, field: keyof typeof ALIASES): unknown {
  for (const alias of ALIASES[field]) {
    const value = row[alias];
    if (value !== undefined && value !== null && value !== '') return value;
  }
  return undefined;
}

/** GraphQL edge shapes (`edge_followed_by.count`) the followers actor still emits. */
function edgeCount(row: RawRow, edge: string): number | undefined {
  const node = row[edge];
  if (node && typeof node === 'object' && 'count' in node) {
    return parseFollowerCount((node as { count: unknown }).count);
  }
  return undefined;
}

function fromScrape(row: RawRow, campaignId: string): Lead | null {
  const handle = canonicalHandle(pick(row, 'handle'));
  if (!handle) return null;

  const name = String(pick(row, 'name') ?? '').trim() || handle;
  const bio = String(pick(row, 'bio') ?? '').trim();
  const category = pick(row, 'businessCategory');
  const picture = pick(row, 'profilePicUrl');
  const city = pick(row, 'city');

  return {
    id: crypto.randomUUID(),
    campaignId,
    handle,
    name,
    followers: parseFollowerCount(pick(row, 'followers') ?? edgeCount(row, 'edge_followed_by')),
    following: parseFollowerCount(pick(row, 'following') ?? edgeCount(row, 'edge_follow')),
    postsCount: parseFollowerCount(pick(row, 'postsCount')),
    bio: bio || undefined,
    isPrivate: parseBoolean(pick(row, 'isPrivate')),
    verified: parseBoolean(pick(row, 'verified')),
    businessAccount: parseBoolean(pick(row, 'businessAccount')),
    businessCategory: category === undefined ? undefined : String(category),
    profilePicUrl: picture === undefined ? undefined : String(picture),
    city: city === undefined ? undefined : String(city),
    status: 'cold',
    dmSent: false,
    replied: false,
  };
}

function fromCsv(row: RawRow, campaignId: string, mapping: ColumnMapping): Lead | null {
  if (!mapping.handle) return null;
  const handle = canonicalHandle(row[mapping.handle]);
  if (!handle) return null;

  const name = mapping.name ? String(row[mapping.name] ?? '').trim() : '';
  const bio = mapping.bio ? String(row[mapping.bio] ?? '').trim() : '';

  return {
    id: crypto.randomUUID(),
    campaignId,
    handle,
    name: name || handle,
    followers: mapping.followers ? parseFollowerCount(row[mapping.followers]) : 0,
    bio: bio || undefined,
    isPrivate: mapping.isPrivate ? parseBoolean(row[mapping.isPrivate]) : false,
    status: 'cold',
    dmSent: false,
    replied: false,
  };
}

// ─── CSV header mapping ──────────────────────────────────────────────────────

const CSV_ALIASES: Record<keyof ColumnMapping, string[]> = {
  handle: ['username', 'handle', 'ig', 'instagram', 'account', 'profile', 'profileurl'],
  name: ['fullname', 'name', 'displayname'],
  followers: ['followerscount', 'followers', 'followercount'],
  bio: ['biography', 'bio', 'description', 'about'],
  isPrivate: ['private', 'isprivate'],
};

/** Best-guess mapping from a CSV's header row to Lead fields. */
export function autoMap(headers: string[]): ColumnMapping {
  const mapping: ColumnMapping = {};
  const normalized = headers.map((h) => ({ raw: h, norm: h.toLowerCase().replace(/[\s_]/g, '') }));
  (Object.keys(CSV_ALIASES) as Array<keyof ColumnMapping>).forEach((field) => {
    const hit = normalized.find((h) => CSV_ALIASES[field].includes(h.norm));
    if (hit) mapping[field] = hit.raw;
  });
  return mapping;
}

// ─── The interface ───────────────────────────────────────────────────────────

/** Turn a source's raw rows into canonical Leads, unique within the batch. */
export function intake(req: IntakeRequest): IntakeResult {
  const seen = new Set<string>();
  const leads: Lead[] = [];
  let skipped = 0;

  for (const row of req.rows) {
    const lead = req.source === 'csv'
      ? fromCsv(row, req.campaignId, req.mapping)
      : fromScrape(row, req.campaignId);

    if (!lead || seen.has(lead.handle)) {
      skipped++;
      continue;
    }
    seen.add(lead.handle);
    leads.push(lead);
  }

  return { leads, skipped };
}

/**
 * Drop Leads whose Handle is already known. Separate from `intake` because
 * only the caller holds the existing set — but it lives here so cross-batch
 * dedupe uses the same canonical form as everything else.
 */
export function dropKnownHandles(
  leads: Lead[],
  existing: Iterable<string>,
): { fresh: Lead[]; duplicates: number } {
  const known = new Set<string>();
  for (const h of existing) known.add(canonicalHandle(h));

  const fresh = leads.filter((l) => {
    const handle = canonicalHandle(l.handle);
    if (known.has(handle)) return false;
    known.add(handle);
    return true;
  });

  return { fresh, duplicates: leads.length - fresh.length };
}
