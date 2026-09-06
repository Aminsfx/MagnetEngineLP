import { useEffect, useState } from 'react';

/**
 * How many of `total` items to mount right now, growing by `chunk` a frame
 * until everything is on screen.
 *
 * The Approval Queue mounts a page of 50 rows, and a row is ~40 elements with
 * six icons — so navigating to /queue used to be a single ~140 ms commit that
 * inserted ~2,000 nodes. Nothing painted until all of it landed, which is what
 * "clicking Approval Queue lags" actually was. Growing in chunks puts the
 * toolbar, filters and first rows on screen in the first commit and lets the
 * browser paint (and accept input) between the rest.
 *
 * Growth is a flat chunk, not a doubling: doubling reaches the full page one
 * frame sooner but its last step commits twice the rows, which is a long frame
 * in the middle of the Operator reading the table. One extra frame is cheaper
 * than one janky one.
 *
 * `resetKey` — not the item array's identity — decides when to start over.
 * Keying on identity would collapse a settled table back to one chunk every
 * time a Lead object changed, so approving row 40 would unmount rows 13–50 and
 * re-grow them.
 */
const schedule: (cb: () => void) => number =
  typeof requestAnimationFrame === 'function'
    ? (cb) => requestAnimationFrame(cb)
    : (cb) => setTimeout(cb, 16) as unknown as number;

const cancel = (id: number) => {
  if (typeof cancelAnimationFrame === 'function') cancelAnimationFrame(id);
  else clearTimeout(id);
};

export function useProgressiveCount(total: number, resetKey: string, chunk = 12): number {
  const [count, setCount] = useState(() => Math.min(chunk, total));

  // Adjusted during render (React's sanctioned pattern) rather than in an
  // effect, so a page change never paints the outgoing page's rows first.
  const [lastKey, setLastKey] = useState(resetKey);
  if (resetKey !== lastKey) {
    setLastKey(resetKey);
    setCount(Math.min(chunk, total));
  }

  useEffect(() => {
    if (count >= total) return;
    const id = schedule(() => setCount((c) => Math.min(c + chunk, total)));
    return () => cancel(id);
  }, [count, total, chunk]);

  return Math.min(count, total);
}
