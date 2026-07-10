import { useSyncExternalStore } from 'react';

const emptySubscribe = () => () => {};

/**
 * Returns true once the component has mounted on the client.
 *
 * Used to guard client-only rendering (e.g. portals, theme state) so the
 * server-rendered HTML matches the initial client render and avoids
 * hydration mismatches.
 */
export function useMounted(): boolean {
  return useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );
}
