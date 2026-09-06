import { useEffect, useRef, useState } from 'react';

/**
 * Returns a callback with a permanently stable identity that always invokes the
 * latest version of `fn`.
 *
 * Needed for `React.memo` children: a handler recreated on every render defeats
 * the memo comparison, so every child re-renders anyway. Wrapping the handler
 * here keeps the prop identity fixed while the closure stays current.
 *
 * Only safe for event handlers and other post-commit callers — the returned
 * function must not be called during render, where `ref.current` may still
 * point at the previous render's closure.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function useStable<T extends (...args: any[]) => any>(fn: T): T {
  const latest = useRef(fn);

  useEffect(() => {
    latest.current = fn;
  });

  // Built once by the lazy initialiser and never replaced, so the identity is
  // stable for the life of the component.
  const [stable] = useState(() => ((...args: Parameters<T>) => latest.current(...args)) as T);

  return stable;
}
