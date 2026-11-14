import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { untilLoaded } from './retry';

describe('untilLoaded', () => {
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); });

  it('hands over what loaded, and does not load again', async () => {
    const load = vi.fn(async () => 'history');
    const onLoaded = vi.fn();
    const onFailed = vi.fn();

    untilLoaded(load, onLoaded, onFailed, [100]);
    await vi.advanceTimersByTimeAsync(1_000);

    expect(onLoaded).toHaveBeenCalledExactlyOnceWith('history');
    expect(onFailed).not.toHaveBeenCalled();
    expect(load).toHaveBeenCalledTimes(1);
  });

  // The regression: the inbox was loaded once, with no catch. A load that
  // failed left the inbox log unhydrated for the rest of the session, so every
  // snapshot the extension sent afterwards was parked and the Inbox stayed
  // empty with nothing on screen to say why.
  it('says a load failed, then tries again until one succeeds', async () => {
    const load = vi.fn<() => Promise<string>>()
      .mockRejectedValueOnce(new Error('offline'))
      .mockRejectedValueOnce(new Error('still offline'))
      .mockResolvedValue('history');
    const onLoaded = vi.fn();
    const onFailed = vi.fn();

    untilLoaded(load, onLoaded, onFailed, [100, 500]);
    await vi.advanceTimersByTimeAsync(0);
    expect(onFailed).toHaveBeenCalledTimes(1);
    expect(onLoaded).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(100);
    expect(onFailed).toHaveBeenCalledTimes(2);

    // The second wait is the longer one.
    await vi.advanceTimersByTimeAsync(400);
    expect(onLoaded).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(100);
    expect(onLoaded).toHaveBeenCalledExactlyOnceWith('history');
  });

  it('keeps the last wait once the list of waits runs out', async () => {
    const load = vi.fn<() => Promise<string>>().mockRejectedValue(new Error('offline'));

    untilLoaded(load, vi.fn(), vi.fn(), [100]);
    await vi.advanceTimersByTimeAsync(350);

    expect(load).toHaveBeenCalledTimes(4);
  });

  it('stops for good when told to: no retry, and a late answer is dropped', async () => {
    let finish: (value: string) => void = () => {};
    const load = vi.fn(() => new Promise<string>((resolve) => { finish = resolve; }));
    const onLoaded = vi.fn();

    const stop = untilLoaded(load, onLoaded, vi.fn(), [100]);
    stop();
    finish('history');
    await vi.advanceTimersByTimeAsync(1_000);

    expect(onLoaded).not.toHaveBeenCalled();
    expect(load).toHaveBeenCalledTimes(1);
  });
});
