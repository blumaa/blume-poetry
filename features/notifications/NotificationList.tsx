import Link from 'next/link';
import { formatRelative } from '@/lib/date';
import type { Notification } from './api/activity';
import styles from './NotificationList.module.css';

function NotificationItem({
  notification,
  onItemClick,
}: {
  notification: Notification;
  onItemClick: () => void;
}) {
  return (
    <Link
      href={`/poem/${notification.poem.slug}`}
      className={styles.itemLink}
      onClick={onItemClick}
    >
      <div className={styles.itemRow}>
        {notification.type === 'comment' ? (
          <span className={`${styles.commentIcon} ${styles.iconWrapper}`}>
            <svg className={styles.icon} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          </span>
        ) : (
          <span className={`${styles.likeIcon} ${styles.iconWrapper}`}>
            <svg className={styles.icon} fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
            </svg>
          </span>
        )}
        <div className={styles.itemContent}>
          <p className={styles.itemText}>
            {notification.type === 'comment' ? (
              <>
                <span className={styles.emphasis}>{notification.author_name}</span>
                {' commented on '}
              </>
            ) : (
              'New like on '
            )}
            <span className={styles.emphasis}>&ldquo;{notification.poem.title}&rdquo;</span>
          </p>
          {notification.type === 'comment' && notification.content && (
            <p className={styles.itemPreview}>{notification.content}</p>
          )}
          <p className={styles.itemTime}>{formatRelative(notification.created_at)}</p>
        </div>
      </div>
    </Link>
  );
}

interface NotificationListProps {
  notifications: Notification[];
  isPending: boolean;
  isError: boolean;
  onItemClick: () => void;
}

export function NotificationList({
  notifications,
  isPending,
  isError,
  onItemClick,
}: NotificationListProps) {
  if (isPending) return <div className={styles.stateMessage}>Loading...</div>;
  if (isError) return <div className={styles.stateMessage}>Couldn&rsquo;t load notifications</div>;
  if (notifications.length === 0) {
    return <div className={styles.stateMessage}>No notifications</div>;
  }

  return (
    <div className={styles.list}>
      {notifications.map((notification) => (
        <NotificationItem
          key={notification.id}
          notification={notification}
          onItemClick={onItemClick}
        />
      ))}
    </div>
  );
}
