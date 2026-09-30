'use client';

import { useSyncExternalStore } from 'react';
import { readStored, subscribeStored, type StorageKey } from './browserStorage';

/** Live value of a stored key; null on the server and when unset. */
export function useStored(key: StorageKey): string | null {
  return useSyncExternalStore(
    (listener) => subscribeStored(key, listener),
    () => readStored(key),
    () => null
  );
}
