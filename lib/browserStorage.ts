/* The only module that touches localStorage / sessionStorage (ESLint enforces).
   Every stored fact is registered once in STORAGE_KEYS; readers subscribe, so
   all mounted readers of a key see the same value. Access is guarded: storage
   throws in private mode or when blocked, and a preference is never worth a crash.
   No React here — server components import STORAGE_KEYS (theme boot script). */

type Area = 'local' | 'session';

export const STORAGE_KEYS = {
  theme: { name: 'theme', area: 'local' },
  sidebarCollapsed: { name: 'sidebar_collapsed', area: 'local' },
  commentName: { name: 'comment_name', area: 'local' },
  visitorId: { name: 'visitor_id', area: 'local' },
  notificationsLastSeen: { name: 'admin_notifications_last_seen', area: 'local' },
  notificationsCleared: { name: 'admin_notifications_cleared', area: 'local' },
  flashToast: { name: 'toast', area: 'session' },
} as const satisfies Record<string, { name: string; area: Area }>;

export type StorageKey = keyof typeof STORAGE_KEYS;

const listeners = new Map<StorageKey, Set<() => void>>();

function storageFor(key: StorageKey): Storage {
  return STORAGE_KEYS[key].area === 'session' ? sessionStorage : localStorage;
}

function notify(key: StorageKey) {
  listeners.get(key)?.forEach((listener) => listener());
}

export function readStored(key: StorageKey): string | null {
  try {
    return storageFor(key).getItem(STORAGE_KEYS[key].name);
  } catch {
    return null;
  }
}

export function writeStored(key: StorageKey, value: string): void {
  try {
    storageFor(key).setItem(STORAGE_KEYS[key].name, value);
  } catch {
    // Unavailable storage: the value lives for this page only. Readers still update.
  }
  notify(key);
}

export function clearStored(key: StorageKey): void {
  try {
    storageFor(key).removeItem(STORAGE_KEYS[key].name);
  } catch {
    // Nothing stored to clear.
  }
  notify(key);
}

/** Same-tab writes notify directly; other tabs arrive as `storage` events. */
export function subscribeStored(key: StorageKey, listener: () => void): () => void {
  let set = listeners.get(key);
  if (!set) {
    set = new Set();
    listeners.set(key, set);
  }
  set.add(listener);

  const onStorage = (event: StorageEvent) => {
    if (event.key === STORAGE_KEYS[key].name) listener();
  };
  window.addEventListener('storage', onStorage);

  return () => {
    set.delete(listener);
    window.removeEventListener('storage', onStorage);
  };
}
