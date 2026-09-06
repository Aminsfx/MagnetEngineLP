import { describe, it, expect } from 'vitest';
import {
  intake,
  autoMap,
  canonicalHandle,
  parseFollowerCount,
  parseBoolean,
  dropKnownHandles,
} from './intake';
import type { Lead } from './types';

describe('canonicalHandle', () => {
  it('lowercases, strips @ and whitespace', () => {
    expect(canonicalHandle('  @Founder_Mike ')).toBe('founder_mike');
  });

  it('takes the username out of a profile URL', () => {
    expect(canonicalHandle('https://www.instagram.com/FounderMike/')).toBe('foundermike');
    expect(canonicalHandle('instagram.com/foundermike?hl=en')).toBe('foundermike');
  });

  it('returns empty for nothing usable', () => {
    expect(canonicalHandle(undefined)).toBe('');
    expect(canonicalHandle('   ')).toBe('');
  });
});

describe('parseFollowerCount', () => {
  it.each([
    [12345, 12345],
    ['12,345', 12345],
    ['1.2K', 1200],
    ['3m', 3_000_000],
    ['', 0],
    ['not a number', 0],
    [undefined, 0],
  ])('%p -> %p', (input, expected) => {
    expect(parseFollowerCount(input)).toBe(expected);
  });
});

describe('parseBoolean', () => {
  it('accepts the CSV truthy spellings', () => {
    for (const v of ['true', 'TRUE', '1', 'yes', 'Yes']) expect(parseBoolean(v)).toBe(true);
    for (const v of ['false', '0', 'no', '', undefined]) expect(parseBoolean(v)).toBe(false);
  });
});

describe('intake — scraper sources', () => {
  it('reads the keyword actor camelCase shape', () => {
    const { leads } = intake({
      source: 'search',
      campaignId: 'c1',
      rows: [{
        username: 'FounderMike',
        fullName: 'Mike R',
        followersCount: 4200,
        followingCount: 300,
        postsCount: 88,
        biography: 'agency owner',
        isVerified: true,
        isBusinessAccount: true,
        businessCategoryName: 'Marketing',
        profilePicUrl: 'https://pic',
        city: 'Austin',
      }],
    });

    expect(leads).toHaveLength(1);
    expect(leads[0]).toMatchObject({
      handle: 'foundermike',      // canonical, not the raw casing
      name: 'Mike R',
      followers: 4200,
      following: 300,
      postsCount: 88,
      bio: 'agency owner',
      verified: true,
      businessAccount: true,
      businessCategory: 'Marketing',
      city: 'Austin',
      status: 'cold',
      dmSent: false,
    });
  });

  it('reads the followers actor snake_case and GraphQL-edge shape', () => {
    const { leads } = intake({
      source: 'followers',
      campaignId: 'c1',
      rows: [{
        username: 'coach_jane',
        full_name: 'Jane',
        edge_followed_by: { count: 9100 },
        edge_follow: { count: 410 },
        is_private: true,
        is_verified: false,
        business_category_name: 'Coaching',
        profile_pic_url: 'https://pic',
      }],
    });

    // The old split mappers disagreed here: the keyword one had no
    // edge_followed_by alias, so the same row scraped two ways gave 0 vs 9100.
    expect(leads[0]).toMatchObject({
      handle: 'coach_jane',
      name: 'Jane',
      followers: 9100,
      following: 410,
      isPrivate: true,
      businessCategory: 'Coaching',
    });
  });

  it('skips rows with no handle and repeats within the batch', () => {
    const { leads, skipped } = intake({
      source: 'search',
      campaignId: 'c1',
      rows: [
        { username: 'a' },
        { username: '@A' },          // same handle, different casing
        { fullName: 'no handle' },
        { username: 'b' },
      ],
    });

    expect(leads.map((l) => l.handle)).toEqual(['a', 'b']);
    expect(skipped).toBe(2);
  });

  it('gives every lead its own id and the batch campaignId', () => {
    const { leads } = intake({
      source: 'search',
      campaignId: 'camp-9',
      rows: [{ username: 'a' }, { username: 'b' }],
    });

    expect(new Set(leads.map((l) => l.id)).size).toBe(2);
    expect(leads.every((l) => l.campaignId === 'camp-9')).toBe(true);
  });
});

describe('intake — csv source', () => {
  const mapping = { handle: 'Profile', name: 'Name', followers: 'Followers', isPrivate: 'Private' };

  it('maps mapped columns and defaults the rest', () => {
    const { leads } = intake({
      source: 'csv',
      campaignId: 'c1',
      mapping,
      rows: [{ Profile: 'https://instagram.com/Bob/', Name: 'Bob', Followers: '1.2K', Private: 'yes' }],
    });

    expect(leads[0]).toMatchObject({
      handle: 'bob',
      name: 'Bob',
      followers: 1200,
      isPrivate: true,
      status: 'cold',
    });
  });

  it('falls back to the handle when the name cell is blank', () => {
    const { leads } = intake({
      source: 'csv', campaignId: 'c1', mapping,
      rows: [{ Profile: 'bob', Name: '   ' }],
    });
    expect(leads[0].name).toBe('bob');
  });

  it('skips every row when no handle column is mapped', () => {
    const { leads, skipped } = intake({
      source: 'csv', campaignId: 'c1', mapping: {},
      rows: [{ Profile: 'bob' }, { Profile: 'jane' }],
    });
    expect(leads).toEqual([]);
    expect(skipped).toBe(2);
  });
});

describe('autoMap', () => {
  it('matches headers regardless of spacing and case', () => {
    expect(autoMap(['User Name', 'Full_Name', 'Followers Count', 'Bio'])).toEqual({
      handle: 'User Name',
      name: 'Full_Name',
      followers: 'Followers Count',
      bio: 'Bio',
    });
  });

  it('leaves unmatched fields out', () => {
    expect(autoMap(['something', 'else'])).toEqual({});
  });
});

describe('dropKnownHandles', () => {
  const lead = (handle: string): Lead => ({
    id: handle, campaignId: 'c', handle, name: handle, followers: 0,
    isPrivate: false, status: 'cold', dmSent: false, replied: false,
  });

  it('drops handles already known, whatever their form', () => {
    const { fresh, duplicates } = dropKnownHandles(
      [lead('New'), lead('existing')],
      ['@Existing', 'https://instagram.com/other/'],
    );

    expect(fresh.map((l) => l.handle)).toEqual(['New']);
    expect(duplicates).toBe(1);
  });

  it('also drops repeats inside the incoming batch', () => {
    const { fresh, duplicates } = dropKnownHandles([lead('a'), lead('A'), lead('b')], []);
    expect(fresh.map((l) => l.handle)).toEqual(['a', 'b']);
    expect(duplicates).toBe(1);
  });
});
