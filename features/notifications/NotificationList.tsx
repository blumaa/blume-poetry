import Link from 'next/link';
import { formatRelative } from '@/lib/date';
import { Icon } from '@/components/icons';
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
          <Icon name="comment" size="sm" className={styles.commentIcon} />
        ) : (
          <Icon name="heart-filled" size="sm" className={styles.likeIcon} />
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
