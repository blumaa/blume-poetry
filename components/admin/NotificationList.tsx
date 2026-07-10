import Link from 'next/link';

export interface Notification {
  id: string;
  type: 'comment' | 'like';
  created_at: string;
  poem: {
    slug: string;
    title: string;
  };
  // Comment-specific
  author_name?: string;
  content?: string;
}

interface NotificationItemProps {
  notification: Notification;
  onItemClick: () => void;
  formatTime: (dateString: string) => string;
  compact?: boolean;
}

function NotificationItem({ notification, onItemClick, formatTime, compact = false }: NotificationItemProps) {
  const iconSize = compact ? 'w-4 h-4' : 'w-5 h-5';
  const iconWrapperClass = compact ? 'shrink-0' : 'shrink-0 mt-0.5';

  return (
    <Link
      href={`/poem/${notification.poem.slug}`}
      className={`block ${compact ? 'p-3' : 'p-4'} hover:bg-hover transition-colors`}
      onClick={onItemClick}
    >
      <div className={`flex items-start ${compact ? 'gap-2' : 'gap-3'}`}>
        {notification.type === 'comment' ? (
          <span className={`text-blue-500 ${iconWrapperClass}`}>
            <svg className={iconSize} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          </span>
        ) : (
          <span className={`text-red-500 ${iconWrapperClass}`}>
            <svg className={iconSize} fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
            </svg>
          </span>
        )}
        <div className="flex-1 min-w-0">
          <p className="text-sm text-primary">
            {notification.type === 'comment' ? (
              <>
                <span className="font-medium">{notification.author_name}</span>
                {' commented on '}
              </>
            ) : (
              'New like on '
            )}
            <span className="font-medium">&ldquo;{notification.poem.title}&rdquo;</span>
          </p>
          {notification.type === 'comment' && notification.content && (
            <p className="text-xs text-tertiary truncate mt-0.5">
              {notification.content}
            </p>
          )}
          <p className="text-xs text-tertiary mt-1">
            {formatTime(notification.created_at)}
          </p>
        </div>
      </div>
    </Link>
  );
}

interface NotificationListProps {
  notifications: Notification[];
  isLoading: boolean;
  onItemClick: () => void;
  formatTime: (dateString: string) => string;
  compact?: boolean;
}

export function NotificationList({
  notifications,
  isLoading,
  onItemClick,
  formatTime,
  compact = false,
}: NotificationListProps) {
  if (isLoading) {
    return <div className="p-4 text-center text-tertiary">Loading...</div>;
  }

  if (notifications.length === 0) {
    return <div className="p-4 text-center text-tertiary">No notifications</div>;
  }

  return (
    <div className="divide-y divide-border">
      {notifications.map((notif) => (
        <NotificationItem
          key={notif.id}
          notification={notif}
          onItemClick={onItemClick}
          formatTime={formatTime}
          compact={compact}
        />
      ))}
    </div>
  );
}
