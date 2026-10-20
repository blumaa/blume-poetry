import type { Notification } from './api/activity';

export interface InboxMarks {
  /** Everything at or before this is hidden. */
  clearedAt: string | null;
  /** Everything at or before this counts as read. */
  lastSeen: string | null;
}

export const NO_MARKS: InboxMarks = { clearedAt: null, lastSeen: null };

/* Notifications are derived from comments/likes rows, so "clear" cannot delete
   anything server-side; it hides everything up to the cleared mark. `newestAt`
   is the mark to save: a server timestamp from the list, never the device
   clock. */
export function toInbox(notifications: Notification[], marks: InboxMarks) {
  const after = (mark: string | null) => (n: Notification) =>
    mark === null || new Date(n.created_at) > new Date(mark);

  const visible = notifications.filter(after(marks.clearedAt));
  const unreadCount = visible.filter(after(marks.lastSeen)).length;
  const newestAt = visible.reduce<string | null>(
    (newest, n) => (newest === null || new Date(n.created_at) > new Date(newest) ? n.created_at : newest),
    null
  );
  return { visible, unreadCount, newestAt };
}
