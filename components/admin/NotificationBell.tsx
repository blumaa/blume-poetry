'use client';

import { useState, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import {
  Button,
  Popover,
  PopoverBody,
  PopoverFooter,
  PopoverHeader,
  Sheet,
  SheetBody,
  SheetFooter,
  SheetHeader,
} from '@/components/mds';
import { useIsMobile } from '@/lib/useIsMobile';
import { NotificationList, type Notification } from './NotificationList';
import styles from './NotificationBell.module.css';

const LAST_SEEN_KEY = 'admin_notifications_last_seen';
const CLEARED_KEY = 'admin_notifications_cleared';
const EPOCH = '1970-01-01T00:00:00Z';

async function fetchActivity(): Promise<Notification[]> {
  const supabase = createClient();

  // Fetch recent comments
  const { data: comments } = await supabase
    .from('comments')
    .select(`
      id,
      author_name,
      content,
      created_at,
      poem:poems(slug, title)
    `)
    .order('created_at', { ascending: false })
    .limit(20);

  // Fetch recent likes
  const { data: likes } = await supabase
    .from('likes')
    .select(`
      id,
      created_at,
      poem:poems(slug, title)
    `)
    .order('created_at', { ascending: false })
    .limit(20);

  // Transform and combine
  const commentNotifs: Notification[] = (comments || []).map((c) => ({
    id: `comment-${c.id}`,
    type: 'comment' as const,
    created_at: c.created_at,
    poem: Array.isArray(c.poem) ? c.poem[0] : c.poem,
    author_name: c.author_name,
    content: c.content,
  }));

  const likeNotifs: Notification[] = (likes || []).map((l) => ({
    id: `like-${l.id}`,
    type: 'like' as const,
    created_at: l.created_at,
    poem: Array.isArray(l.poem) ? l.poem[0] : l.poem,
  }));

  // Combine and sort by date
  return [...commentNotifs, ...likeNotifs]
    .filter((n) => n.poem) // Filter out any with missing poem data
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 20);
}

export function NotificationBell() {
  const [isOpen, setIsOpen] = useState(false);
  // window guard: this component server-renders; localStorage is client-only.
  const [lastSeen, setLastSeen] = useState(() =>
    typeof window === 'undefined' ? EPOCH : localStorage.getItem(LAST_SEEN_KEY) || EPOCH
  );
  const [clearedAt, setClearedAt] = useState(() =>
    typeof window === 'undefined' ? EPOCH : localStorage.getItem(CLEARED_KEY) || EPOCH
  );
  const anchorRef = useRef<HTMLButtonElement>(null);
  const isMobile = useIsMobile();

  const { data: notifications = [], isPending } = useQuery({
    queryKey: ['admin', 'activity'],
    queryFn: fetchActivity,
  });

  /* Notifications are derived from comments/likes rows, so "clear" cannot
     delete anything server-side; it hides everything up to the cleared
     timestamp. Cleared items stay in the query cache but never resurface. */
  const visible = notifications.filter(
    (n) => new Date(n.created_at) > new Date(clearedAt)
  );

  const unreadCount = visible.filter(
    (n) => new Date(n.created_at) > new Date(lastSeen)
  ).length;

  const handleOpen = () => {
    setIsOpen(!isOpen);
    if (!isOpen && unreadCount > 0) {
      // Mark as seen when opening
      const now = new Date().toISOString();
      localStorage.setItem(LAST_SEEN_KEY, now);
      setLastSeen(now);
    }
  };

  const handleClose = () => setIsOpen(false);

  const handleClear = () => {
    const now = new Date().toISOString();
    localStorage.setItem(CLEARED_KEY, now);
    setClearedAt(now);
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString();
  };

  const list = (
    <NotificationList
      notifications={visible}
      isLoading={isPending}
      onItemClick={handleClose}
      formatTime={formatTime}
      compact
    />
  );

  const clearButton =
    visible.length > 0 ? (
      <Button variant="ghost" size="sm" onClick={handleClear}>
        Clear notifications
      </Button>
    ) : null;

  return (
    <>
      <span className={styles.bellWrap}>
        <Button
          ref={anchorRef}
          iconOnly
          variant="ghost"
          onClick={handleOpen}
          aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
        >
          <svg className={styles.icon} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
            />
          </svg>
        </Button>
        {unreadCount > 0 && (
          <span className={styles.badge}>
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </span>

      {isMobile ? (
        <Sheet open={isOpen} onClose={handleClose} label="Notifications">
          <SheetHeader onClose={handleClose} closeLabel="Close notifications">
            Notifications
          </SheetHeader>
          <SheetBody>{list}</SheetBody>
          {clearButton && <SheetFooter>{clearButton}</SheetFooter>}
        </Sheet>
      ) : (
        <Popover
          open={isOpen}
          onClose={handleClose}
          anchorRef={anchorRef}
          label="Notifications"
          placement="bottom-end"
          className={styles.popoverPanel}
        >
          <PopoverHeader onClose={handleClose} closeLabel="Close notifications">
            Notifications
          </PopoverHeader>
          <PopoverBody>{list}</PopoverBody>
          {clearButton && <PopoverFooter>{clearButton}</PopoverFooter>}
        </Popover>
      )}
    </>
  );
}
