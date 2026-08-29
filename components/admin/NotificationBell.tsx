'use client';

import { useState, useEffect, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Button, Popover, PopoverBody, PopoverHeader } from '@/components/mds';
import { NotificationList, type Notification } from './NotificationList';

const LAST_SEEN_KEY = 'admin_notifications_last_seen';

export function NotificationBell() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const anchorRef = useRef<HTMLButtonElement>(null);

  // Fetch notifications on mount
  useEffect(() => {
    let cancelled = false;

    async function loadNotifications() {
      const supabase = createClient();
      const lastSeen = localStorage.getItem(LAST_SEEN_KEY) || '1970-01-01T00:00:00Z';

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

      if (cancelled) return;

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
      const allNotifs = [...commentNotifs, ...likeNotifs]
        .filter((n) => n.poem) // Filter out any with missing poem data
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, 20);

      setNotifications(allNotifs);

      // Count unread
      const unread = allNotifs.filter((n) => new Date(n.created_at) > new Date(lastSeen)).length;
      setUnreadCount(unread);
      setIsLoading(false);
    }

    loadNotifications();

    return () => {
      cancelled = true;
    };
  }, []);

  const handleOpen = () => {
    setIsOpen(!isOpen);
    if (!isOpen && unreadCount > 0) {
      // Mark as seen when opening
      localStorage.setItem(LAST_SEEN_KEY, new Date().toISOString());
      setUnreadCount(0);
    }
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

  return (
    <>
      <span className="relative inline-flex">
        <Button
          ref={anchorRef}
          iconOnly
          variant="ghost"
          onClick={handleOpen}
          aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
            />
          </svg>
        </Button>
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center pointer-events-none">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </span>

      <Popover
        open={isOpen}
        onClose={() => setIsOpen(false)}
        anchorRef={anchorRef}
        label="Notifications"
        placement="bottom-end"
        className="w-80 max-h-96 overflow-y-auto"
      >
        <PopoverHeader onClose={() => setIsOpen(false)} closeLabel="Close notifications">
          Notifications
        </PopoverHeader>
        <PopoverBody>
          <NotificationList
            notifications={notifications}
            isLoading={isLoading}
            onItemClick={() => setIsOpen(false)}
            formatTime={formatTime}
            compact
          />
        </PopoverBody>
      </Popover>
    </>
  );
}
