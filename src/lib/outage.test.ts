import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  AI_OUTAGE,
  AI_OUTAGE_ERROR,
  AiOutage,
  outageCause,
  outageLog,
} from '../../supabase/functions/_shared/outage.ts';

const functions = resolve(__dirname, '../../supabase/functions');
const source = (path: string) => readFileSync(resolve(functions, path), 'utf8');

describe('outageCause', () => {
  it('reads the answer that stopped a run on 2026-11-10 as out of credit', () => {
    const body = JSON.stringify({
      type: 'error',
      error: {
        type: 'invalid_request_error',
        message: 'Your credit balance is too low to access the Anthropic API. Please go to Plans & Billing to upgrade or purchase credits.',
      },
      request_id: 'req_011Cgu6KnTbRYT7JGAToSBYG',
    });
    expect(outageCause(400, body)).toBe('credit');
  });

  it('knows an exhausted quota from a plain rate limit', () => {
    // Both are 429s from OpenAI. Only the first is the Owner's to fix; the
    // second clears on its own.
    expect(outageCause(429, '{"error":{"code":"insufficient_quota","type":"insufficient_quota"}}')).toBe('credit');
    expect(outageCause(429, '{"error":{"code":"rate_limit_exceeded"}}')).toBeNull();
  });

  it('reads a billing error and a refused key', () => {
    expect(outageCause(402, '{"error":{"type":"billing_error"}}')).toBe('credit');
    expect(outageCause(401, '{"error":{"type":"authentication_error"}}')).toBe('key');
    expect(outageCause(403, '{"error":{"type":"permission_error"}}')).toBe('key');
    expect(outageCause(400, '{"error":{"status":"INVALID_ARGUMENT","details":[{"reason":"API_KEY_INVALID"}]}}')).toBe('key');
  });

  it('leaves what is worth retrying, and what is a bug, as an ordinary error', () => {
    expect(outageCause(529, '{"error":{"type":"overloaded_error"}}')).toBeNull();
    expect(outageCause(500, 'internal error')).toBeNull();
    expect(outageCause(400, '{"error":{"message":"max_tokens: must be at least 1"}}')).toBeNull();
  });
});

describe('what the Operator and the Owner are told', () => {
  it('names no provider and no account detail to the Operator', () => {
    expect(AI_OUTAGE_ERROR).not.toMatch(/claude|anthropic|openai|gemini|credit|key|billing/i);
    expect(AI_OUTAGE_ERROR).toMatch(/Nothing was counted/);
  });

  it('tells the Owner the cause and what fixes it', () => {
    const credit = outageLog('generate-dm', 'claude', new AiOutage('credit', 400, 'Claude API error 400: low'));
    expect(credit).toMatch(/AI OUTAGE/);
    expect(credit).toMatch(/out of credit/);
    const key = outageLog('generate-reply', 'openai', new AiOutage('key', 401, 'OpenAI API error 401'));
    expect(key).toMatch(/supabase secrets set/);
  });
});

describe('both generators answer an outage, and bill nothing for it', () => {
  it.each(['generate-dm/index.ts', 'generate-reply/index.ts'])('%s answers it with its own code', (path) => {
    const text = source(path);
    expect(text).toContain('e instanceof AiOutage');
    expect(text).toContain('code: AI_OUTAGE');
  });

  it('generate-dm answers it before anything is counted', () => {
    const text = source('generate-dm/index.ts');
    expect(text.indexOf('code: AI_OUTAGE')).toBeLessThan(text.indexOf('increment_dm_usage'));
  });

  it('every provider call throws its error through the outage check', () => {
    // A provider added with its own `throw new Error(...)` would answer an
    // empty account with "try again in a minute" again.
    const text = source('_shared/ai.ts');
    expect(text).not.toMatch(/throw new Error\(`(Claude|OpenAI|Gemini) API error/);
    expect(text.match(/throw providerError\(/g)?.length).toBeGreaterThanOrEqual(4);
  });

  it('keeps the wire code stable', () => {
    expect(AI_OUTAGE).toBe('ai_unavailable');
  });
});
