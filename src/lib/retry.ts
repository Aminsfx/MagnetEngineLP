/**
 * How long to wait before each new attempt at a load that failed. The last
 * wait repeats: a connection that is down for ten minutes is retried every
 * minute, not hammered and not given up on.
 */
export const RETRY_DELAYS_MS: readonly number[] = [3_000, 10_000, 30_000, 60_000];

/**
 * Load something that has to arrive before anything else can happen, trying
 * again for as long as it fails.
 *
 * Written for the inbox history. It was loaded once, with no catch: a load
 * that failed left the inbox log unhydrated for the rest of the session, so
 * every snapshot the extension sent afterwards was parked, the Inbox stayed
 * empty, and nothing on screen said why.
 *
 * `onFailed` is called for every failed attempt, so the caller can say so
 * while it waits. Returns a stop function: after it, nothing more is loaded
 * and an answer still on its way is dropped.
 */
export function untilLoaded<T>(
  load: () => Promise<T>,
  onLoaded: (value: T) => void,
  onFailed: (error: unknown) => void,
  delays: readonly number[] = RETRY_DELAYS_MS,
): () => void {
  let stopped = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let failures = 0;

  const attempt = () => {
    // Inside a promise, so a `load` that throws instead of rejecting is
    // retried like any other failure.
    Promise.resolve().then(load).then(
      (value) => {
        if (!stopped) onLoaded(value);
      },
      (error: unknown) => {
        if (stopped) return;
        onFailed(error);
        timer = setTimeout(attempt, delays[Math.min(failures, delays.length - 1)]);
        failures += 1;
      },
    );
  };

  attempt();
  return () => {
    stopped = true;
    clearTimeout(timer);
  };
}
