import type { Notification } from './api/activity';

export interface InboxMarks {
  /** Everything at or before this is hidden. */
  clearedAt: string | null;
  /** Everything at or before this counts as read. */
  lastSeen: string | null;
}

/* Notifications are derived from comments/likes rows, so "clear" cannot delete
   anything server-side; it hides everything up to the cleared mark. */
export function toInbox(notifications: Notification[], marks: InboxMarks) {
  const after = (mark: string | null) => (n: Notification) =>
    mark === null || new Date(n.created_at) > new Date(mark);

  const visible = notifications.filter(after(marks.clearedAt));
  const unreadCount = visible.filter(after(marks.lastSeen)).length;
  return { visible, unreadCount };
}
