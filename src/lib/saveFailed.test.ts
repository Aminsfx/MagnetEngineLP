import { describe, it, expect, vi, beforeEach } from 'vitest';
import { saveFailedNotice, SAVE_FAILED } from './saveFailed';

describe('saveFailedNotice', () => {
  beforeEach(() => { vi.spyOn(console, 'error').mockImplementation(() => {}); });

  it('says it once for a burst, logs every failure, and says it again after the gap', () => {
    let t = 0;
    const say = vi.fn();
    const notice = saveFailedNotice(say, 15_000, () => t);

    notice('saving Leads', new Error('offline'));
    t = 5_000;
    notice('saving the inbox', new Error('offline'));
    expect(say).toHaveBeenCalledExactlyOnceWith(SAVE_FAILED);
    expect(console.error).toHaveBeenCalledTimes(2);

    t = 20_000;
    notice('saving settings', new Error('offline'));
    expect(say).toHaveBeenCalledTimes(2);
  });
});
