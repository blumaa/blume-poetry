import { toInbox } from './inbox';
import type { Notification } from './api/activity';

const at = (iso: string): Notification => ({
  id: iso,
  type: 'like',
  created_at: iso,
  poem: { slug: 's', title: 'T', collection: 'main' },
});

const items = [at('2026-01-03T00:00:00Z'), at('2026-01-02T00:00:00Z'), at('2026-01-01T00:00:00Z')];

describe('toInbox', () => {
  it('shows everything and counts all unread when nothing is marked', () => {
    expect(toInbox(items, { clearedAt: null, lastSeen: null })).toMatchObject({
      visible: items,
      unreadCount: 3,
    });
  });

  it('hides items up to the cleared mark', () => {
    const inbox = toInbox(items, { clearedAt: '2026-01-01T12:00:00Z', lastSeen: null });
    expect(inbox.visible).toEqual(items.slice(0, 2));
    expect(inbox.unreadCount).toBe(2);
  });

  it('counts only visible items newer than last seen', () => {
    const inbox = toInbox(items, { clearedAt: null, lastSeen: '2026-01-02T12:00:00Z' });
    expect(inbox.unreadCount).toBe(1);
  });

  /* Marks are server timestamps taken from the list itself, never the
     device clock, so a fast or slow clock cannot hide or revive an item. */
  it('reports the newest visible item as the mark to save', () => {
    const shuffled = [items[1], items[0], items[2]];
    expect(toInbox(shuffled, { clearedAt: null, lastSeen: null }).newestAt).toBe(
      '2026-01-03T00:00:00Z'
    );
  });

  it('has no mark to save when nothing is visible', () => {
    expect(
      toInbox(items, { clearedAt: '2026-01-03T00:00:00Z', lastSeen: null }).newestAt
    ).toBeNull();
  });
});
