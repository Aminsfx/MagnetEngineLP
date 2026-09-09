import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { EMPTY_COMPLETION, isEmptyCompletion } from './api';
import { FunctionError } from './functions';

/**
 * `empty_completion` is a wire literal typed on both sides of a boundary the
 * build never crosses: an Edge Function running on Deno, and the browser
 * bundle. The repo already treats that shape as needing a test rather than a
 * comment — `extensionProtocol.test.ts` evaluates `extension/protocol.js` to
 * prove the two halves of the extension protocol agree — so this does the same
 * for the one code the DM generator raises.
 *
 * What it cannot prove is that the *deployed* function agrees; the dashboard
 * and the function ship separately. That is why the client still treats a 200
 * carrying a blank `dm` as a failed generation: an older deployment answers
 * that way, and the Operator must not be handed an empty DM either way.
 */
const GENERATE_DM = resolve(__dirname, '../../supabase/functions/generate-dm/index.ts');

describe('the generate-dm error contract', () => {
  it('raises the same code the client branches on', () => {
    const source = readFileSync(GENERATE_DM, 'utf8');

    expect(source).toContain(`code: "${EMPTY_COMPLETION}"`);
  });

  it('spends no quota on the answer carrying that code', () => {
    // The 502 must return BEFORE increment_dm_usage. A blank the Operator never
    // sees is not something to bill them for, and the retry above it means the
    // provider was already asked twice by the time we get here.
    const source = readFileSync(GENERATE_DM, 'utf8');

    expect(source.indexOf(`code: "${EMPTY_COMPLETION}"`))
      .toBeLessThan(source.indexOf('increment_dm_usage'));
  });
});

describe('isEmptyCompletion', () => {
  it('recognises the code on a FunctionError', () => {
    expect(isEmptyCompletion(new FunctionError('empty', { code: EMPTY_COMPLETION }))).toBe(true);
  });

  it('reads the code structurally, not by class identity', () => {
    // A bundler resolving a second copy of FunctionError, or an error crossing
    // a module boundary, must not silently turn a skip back into a stop.
    expect(isEmptyCompletion({ code: EMPTY_COMPLETION })).toBe(true);
  });

  it('leaves every other failure to stop the batch', () => {
    expect(isEmptyCompletion(new FunctionError('No AI provider configured'))).toBe(false);
    expect(isEmptyCompletion(new Error('network down'))).toBe(false);
    expect(isEmptyCompletion(null)).toBe(false);
    expect(isEmptyCompletion(undefined)).toBe(false);
    expect(isEmptyCompletion('empty_completion')).toBe(false);
  });
});
