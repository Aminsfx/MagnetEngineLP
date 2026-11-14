/**
 * Said when the store refused a write. The change is still on screen, which is
 * exactly why it has to be said: until 2026-11-13 the store logged the error
 * and resolved, and the Operator found out at the next reload.
 */
export const SAVE_FAILED =
  "Your last change couldn't be saved, so it will be gone when you reload. Check your connection, then make it again.";

/** One failed save after another is one problem: said once per this long. */
export const SAVE_FAILED_GAP_MS = 15_000;

/**
 * Report failed saves to the Operator without repeating it on every click.
 * A dropped connection fails every write after it; the first one is news and
 * the next twenty are the same news. Every failure is still logged.
 */
export function saveFailedNotice(
  say: (message: string) => void,
  gapMs: number = SAVE_FAILED_GAP_MS,
  now: () => number = Date.now,
): (what: string, error: unknown) => void {
  let saidAt = -Infinity;
  return (what, error) => {
    console.error(`[save] ${what} failed:`, error);
    const t = now();
    if (t - saidAt < gapMs) return;
    saidAt = t;
    say(SAVE_FAILED);
  };
}
