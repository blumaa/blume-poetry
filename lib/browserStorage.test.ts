import {
  STORAGE_KEYS,
  readStored,
  writeStored,
  clearStored,
  subscribeStored,
} from './browserStorage';

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
});

describe('browserStorage', () => {
  it('reads what it wrote, under the registered name', () => {
    writeStored('commentName', 'Ada');
    expect(readStored('commentName')).toBe('Ada');
    expect(localStorage.getItem(STORAGE_KEYS.commentName.name)).toBe('Ada');
  });

  it('routes session keys to sessionStorage', () => {
    writeStored('flashToast', 'hi');
    expect(sessionStorage.getItem(STORAGE_KEYS.flashToast.name)).toBe('hi');
    expect(localStorage.getItem(STORAGE_KEYS.flashToast.name)).toBeNull();
  });

  it('returns null for a missing key and after clear', () => {
    expect(readStored('theme')).toBeNull();
    writeStored('theme', 'dark');
    clearStored('theme');
    expect(readStored('theme')).toBeNull();
  });

  it('survives a storage that throws', () => {
    const get = jest.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('SecurityError');
    });
    const set = jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceededError');
    });
    expect(readStored('theme')).toBeNull();
    expect(() => writeStored('theme', 'dark')).not.toThrow();
    get.mockRestore();
    set.mockRestore();
  });

  it('notifies every subscriber of that key on write and clear', () => {
    const a = jest.fn();
    const b = jest.fn();
    const other = jest.fn();
    subscribeStored('notificationsCleared', a);
    subscribeStored('notificationsCleared', b);
    subscribeStored('theme', other);

    writeStored('notificationsCleared', 'x');
    clearStored('notificationsCleared');

    expect(a).toHaveBeenCalledTimes(2);
    expect(b).toHaveBeenCalledTimes(2);
    expect(other).not.toHaveBeenCalled();
  });

  it('notifies on a storage event from another tab', () => {
    const listener = jest.fn();
    subscribeStored('theme', listener);
    window.dispatchEvent(new StorageEvent('storage', { key: STORAGE_KEYS.theme.name }));
    window.dispatchEvent(new StorageEvent('storage', { key: 'unrelated' }));
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('stops notifying after unsubscribe', () => {
    const listener = jest.fn();
    const unsubscribe = subscribeStored('theme', listener);
    unsubscribe();
    writeStored('theme', 'dark');
    expect(listener).not.toHaveBeenCalled();
  });
});
