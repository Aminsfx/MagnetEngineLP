import { describe, it, expect, vi } from 'vitest';
import {
    billedUnits,
    decodeCursor,
    encodeCursor,
    extractUsers,
    HikerError,
    hikerGet,
    mapLimit,
    pageRequest,
    parseSource,
    readNextPage,
    readTarget,
    resolveRequest,
    toRow,
    toShortcode,
    toUsername,
} from '../../supabase/functions/_shared/hiker.ts';

/**
 * The scrape function's parsing, executed. Like completion.ts, the module
 * holds no Deno globals so this suite can import it — which also pulls it into
 * `npm run typecheck`.
 *
 * The payloads below follow HikerAPI's documented response shapes (hiker.json
 * and the published examples), trimmed to the fields that matter plus the
 * neighbours that make extraction hard: a hashtag post also names its tagged
 * users and a preview of its commenters, and none of them posted it.
 */

const user = (id: number, username: string, extra: Record<string, unknown> = {}) => ({
    pk: id, pk_id: String(id), id: String(id), username, full_name: username.toUpperCase(),
    is_private: false, is_verified: false, profile_pic_url: `https://cdn/${username}.jpg`, ...extra,
});

describe('parseSource — only what this module builds ever reaches the API', () => {
    it.each([
        [{ kind: 'hashtag', query: '#SMMA ' }, 'smma'],
        [{ kind: 'followers', query: '@GaryVee' }, 'garyvee'],
        [{ kind: 'followers', query: 'https://www.instagram.com/garyvee/?hl=en' }, 'garyvee'],
        [{ kind: 'likers', query: 'https://www.instagram.com/p/C8xYz12AbCd/?img_index=1' }, 'C8xYz12AbCd'],
        [{ kind: 'commenters', query: 'https://www.instagram.com/reel/DW34WvtSBpb/' }, 'DW34WvtSBpb'],
        [{ kind: 'location', query: '  Miami ' }, 'Miami'],
        [{ kind: 'profiles', query: '@a.b, c_d\nC_D https://instagram.com/e' }, 'a.b,c_d,e'],
    ])('%j → %s', (raw, query) => {
        expect(parseSource(raw)?.query).toBe(query);
    });

    it.each([
        [{ kind: 'nope', query: 'x' }],
        [{ kind: 'followers', query: 'not a username!' }],
        [{ kind: 'likers', query: 'https://example.com/p/abc' }],
        [{ kind: 'keyword', query: '   ' }],
        [null],
    ])('rejects %j', (raw) => {
        expect(parseSource(raw)).toBeNull();
    });

    it('caps a handle list at one batch per call', () => {
        const names = Array.from({ length: 25 }, (_, i) => `user${i}`).join(',');
        expect(parseSource({ kind: 'profiles', query: names })?.query.split(',')).toHaveLength(10);
    });

    it('reads usernames and shortcodes the way Instagram writes them', () => {
        expect(toUsername('@Jane.Coaching')).toBe('jane.coaching');
        expect(toUsername('has-hyphen')).toBe(''); // Instagram allows no hyphen
        expect(toShortcode('https://instagram.com/someone/p/ABCdef123/')).toBe('ABCdef123');
        expect(toShortcode('instagram.com/stories/x/123')).toBe('');
    });
});

describe('requests', () => {
    it('resolves a username once, then pages by id', () => {
        const src = parseSource({ kind: 'followers', query: 'garyvee' })!;
        expect(resolveRequest(src)).toEqual({ path: '/v1/user/by/username', params: { username: 'garyvee' } });
        expect(pageRequest(src, { t: '123' })).toEqual({ path: '/g2/user/followers', params: { user_id: '123' } });
        expect(pageRequest(src, { t: '123', p: 'next' }).params.page_id).toBe('next');
    });

    it('needs no lookup for a keyword or hashtag', () => {
        expect(resolveRequest(parseSource({ kind: 'keyword', query: 'coach' })!)).toBeNull();
        expect(pageRequest(parseSource({ kind: 'hashtag', query: 'smma' })!, {}).path).toBe('/v2/hashtag/medias/recent');
    });

    it('round-trips a cursor and ignores a tampered one', () => {
        expect(decodeCursor(encodeCursor({ t: '1', p: 'x', l: '@a' }))).toEqual({ t: '1', p: 'x', l: '@a' });
        expect(decodeCursor('not json')).toEqual({});
        expect(decodeCursor(JSON.stringify({ t: { evil: true } }))).toEqual({ t: undefined, p: undefined, l: undefined });
    });
});

describe('readTarget', () => {
    it('flags a private account, whose follower list nobody can read', () => {
        const src = parseSource({ kind: 'followers', query: 'shy' })!;
        expect(readTarget(src, user(9, 'shy', { is_private: true }))).toEqual({ id: '9', label: '@shy', isPrivate: true });
    });

    it('unwraps the v2 `{ user }` envelope', () => {
        const src = parseSource({ kind: 'similar', query: 'nasa' })!;
        expect(readTarget(src, { user: user(528817151, 'nasa'), status: 'ok' })?.id).toBe('528817151');
    });

    it('picks the city over venues that merely mention it — measured on live data', () => {
        // v3 answered "Miami" with Homestead-Miami Speedway first; v2 lists the
        // city, but not always first.
        const src = parseSource({ kind: 'location', query: 'miami' })!;
        expect(resolveRequest(src)?.path).toBe('/v2/fbsearch/places');
        const data = { items: [
            { title: 'Homestead-Miami Speedway', location: { pk: 351890 } },
            { title: 'Miami South Beach', location: { pk: 1916759361938729 } },
            { title: 'Miami, FL', location: { pk: 222957150 } },
            { title: 'Miami', location: { pk: '183204781823602' } },
        ] };
        expect(readTarget(src, data)).toEqual({ id: '183204781823602', label: 'Miami' });
    });

    it('takes the first place that has a pk, and names it', () => {
        const src = parseSource({ kind: 'location', query: 'miami' })!;
        const data = { items: [{ title: 'Nowhere', location: {} }, { title: 'Miami, Florida', location: { pk: 212928653, name: 'Miami' } }] };
        expect(readTarget(src, data)).toEqual({ id: '212928653', label: 'Miami, Florida' });
    });

    it('reads a media pk answered as a bare string', () => {
        expect(readTarget(parseSource({ kind: 'likers', query: 'ABCdef123' })!, '3162273595027945978')?.id).toBe('3162273595027945978');
    });
});

describe('extractUsers — each source reads users from one place only', () => {
    it('hashtag: the author of each post, not the people tagged or commenting on it', () => {
        const post = (id: number, author: ReturnType<typeof user>) => ({
            pk: String(id), id: `${id}_x`, code: `code${id}`,
            user: author,
            caption: { text: '#smma', user: author },
            usertags: { in: [{ user: user(900 + id, `tagged${id}`) }] },
            preview_comments: [{ text: 'nice', user: user(800 + id, `commenter${id}`) }],
            coauthor_producers: [user(700 + id, `coauthor${id}`)],
        });
        const data = {
            response: {
                sections: [
                    { layout_content: { medias: [{ media: post(1, user(1, 'poster_one')) }, { media: post(2, user(2, 'poster_two')) }] } },
                    { layout_content: { one_by_two_item: { clips: { items: [{ media: post(3, user(1, 'poster_one')) }] } } } },
                ],
            },
            next_page_id: 'page2',
        };

        expect(extractUsers('hashtag', data).map(u => u.username)).toEqual(['poster_one', 'poster_two']);
        expect(readNextPage('hashtag', data)).toBe('page2');
    });

    it('location: v1 chunk tuples [medias, next_max_id]', () => {
        const data = [[{ pk: '1', id: '1_1', code: 'a', user: user(1, 'local_one') }], 'max2'];
        expect(extractUsers('location', data).map(u => u.username)).toEqual(['local_one']);
        expect(readNextPage('location', data)).toBe('max2');
        expect(readNextPage('location', [[], null])).toBeNull();
    });

    it('commenters: comment authors, including replies', () => {
        const data = {
            response: {
                comments: [
                    { pk: 'c1', text: 'how much?', user: user(1, 'asker'), preview_child_comments: [{ pk: 'c2', text: 'dm me', user: user(2, 'replier') }] },
                    { pk: 'c3', text: 'same q', user: user(1, 'asker') },
                ],
                caption: { text: 'post', user: user(3, 'post_author') },
            },
            next_page_id: null,
        };
        expect(extractUsers('commenters', data).map(u => u.username)).toEqual(['asker', 'replier']);
        expect(readNextPage('commenters', data)).toBeNull();
    });

    it('followers: the g2 `response.users` page', () => {
        const data = { response: { users: [user(1, 'a'), user(2, 'b')], should_limit_list_of_followers: true }, next_page_id: 'n' };
        expect(extractUsers('followers', data).map(u => u.username)).toEqual(['a', 'b']);
        expect(readNextPage('followers', data)).toBe('n');
    });

    it('keyword: fbsearch `users`, paged by page_token until has_more is false', () => {
        const data = { num_results: 2, users: [user(1, 'coach_a'), user(2, 'coach_b')], has_more: true, page_token: 'tok' };
        expect(extractUsers('keyword', data)).toHaveLength(2);
        expect(readNextPage('keyword', data)).toBe('tok');
        expect(readNextPage('keyword', { ...data, has_more: false })).toBeNull();
    });

    it('keyword: also reads `{ position, user }` list items', () => {
        expect(extractUsers('keyword', { users: [{ position: 0, user: user(1, 'wrapped') }] })[0].username).toBe('wrapped');
    });

    it('likers: one unpaged `users` list', () => {
        const data = { users: [user(1, 'fan')], user_count: 1, status: 'ok' };
        expect(extractUsers('likers', data)[0].username).toBe('fan');
        expect(readNextPage('likers', data)).toBeNull();
    });

    it('similar: anything user-shaped, minus the seed account', () => {
        const data = { response: { suggested_users: { suggestions: [{ user: user(2, 'lookalike') }, { user: user(1, 'seed') }] } } };
        expect(extractUsers('similar', data, '1').map(u => u.username)).toEqual(['lookalike']);
    });

    it('finds nothing in an empty page rather than throwing', () => {
        expect(extractUsers('hashtag', { response: {}, next_page_id: null })).toEqual([]);
        expect(extractUsers('followers', null)).toEqual([]);
    });
});

describe('toRow', () => {
    it('trims a full v1 profile to the fields a Lead holds', () => {
        const row = toRow({
            pk: '25025320', username: 'instagram', full_name: 'Instagram', biography: 'Discover what’s new',
            follower_count: 700000000, following_count: 150, media_count: 7000, is_private: false,
            is_verified: true, is_business: false, account_type: 3, category_name: 'Brand',
            profile_pic_url: 'https://cdn/p.jpg', city_name: '', public_email: 'x@y.z',
        });
        expect(row).toEqual({
            pk: '25025320', username: 'instagram', full_name: 'Instagram', biography: 'Discover what’s new',
            follower_count: 700000000, following_count: 150, media_count: 7000, is_private: false,
            is_verified: true, is_business: false, category: 'Brand', profile_pic_url: 'https://cdn/p.jpg',
        });
    });

    it('reads a business from account_type when is_business is absent', () => {
        expect(toRow({ pk: 1, username: 'shop', account_type: 2 })?.is_business).toBe(true);
        expect(toRow({ pk: 1, username: 'creator', account_type: 3 })?.is_business).toBeUndefined();
    });

    it('unwraps `{ user }` and drops a user with no username', () => {
        expect(toRow({ user: user(5, 'wrapped'), status: 'ok' })?.pk).toBe('5');
        expect(toRow({ pk: 1, username: '' })).toBeNull();
    });
});

describe('hikerGet', () => {
    const req = { path: '/v1/user/by/id', params: { id: '1' } };
    const response = (status: number, body: unknown = {}, headers: Record<string, string> = {}) =>
        new Response(JSON.stringify(body), { status, headers });

    it('sends the key as a header, never in the URL, and reads billed units', async () => {
        const fetchImpl = vi.fn(async () => response(200, { ok: 1 }, { 'x-hiker-info': 'reqs=2' }));
        const res = await hikerGet('secret-key', req, { fetchImpl });
        const [url, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit];
        expect(url).not.toContain('secret-key');
        expect((init.headers as Record<string, string>)['x-access-key']).toBe('secret-key');
        expect(res).toEqual({ data: { ok: 1 }, units: 2 });
    });

    it.each([
        [404, 'not_found'],
        [401, 'upstream_auth'],
        [403, 'upstream_auth'],
        [402, 'upstream_balance'],
        [400, 'upstream_error'],
    ])('maps %i to %s', async (status, code) => {
        const fetchImpl = vi.fn(async () => response(status));
        await expect(hikerGet('k', req, { fetchImpl })).rejects.toMatchObject({ code });
    });

    it('retries a 5xx once — HikerAPI does not bill it', async () => {
        const fetchImpl = vi.fn()
            .mockResolvedValueOnce(response(503))
            .mockResolvedValueOnce(response(200, { ok: 1 }));
        await expect(hikerGet('k', req, { fetchImpl })).resolves.toMatchObject({ data: { ok: 1 } });
        expect(fetchImpl).toHaveBeenCalledTimes(2);
    });

    it('backs off on 429 and gives up as upstream_rate', async () => {
        vi.useFakeTimers();
        const fetchImpl = vi.fn(async () => response(429));
        const done = hikerGet('k', req, { fetchImpl }).catch((e: unknown) => e);
        await vi.runAllTimersAsync();
        const err = await done;
        vi.useRealTimers();
        expect(err).toBeInstanceOf(HikerError);
        expect((err as HikerError).code).toBe('upstream_rate');
        expect(fetchImpl).toHaveBeenCalledTimes(5);
    });

    it('counts an unannotated success as one unit', () => {
        expect(billedUnits(null)).toBe(1);
        expect(billedUnits('reqs=3; foo=bar')).toBe(3);
    });
});

describe('mapLimit', () => {
    it('keeps input order and never exceeds the limit', async () => {
        let inFlight = 0;
        let peak = 0;
        const out = await mapLimit([30, 10, 20, 5], 2, async (ms) => {
            inFlight++;
            peak = Math.max(peak, inFlight);
            await new Promise(r => setTimeout(r, ms));
            inFlight--;
            return ms * 2;
        });
        expect(out).toEqual([60, 20, 40, 10]);
        expect(peak).toBe(2);
    });
});
