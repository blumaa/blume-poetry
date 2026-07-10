'use client';

import { useState, useEffect, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { NotificationList, type Notification } from './NotificationList';

const LAST_SEEN_KEY = 'admin_notifications_last_seen';

export function NotificationBell() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const dropdownRef = useRef<HTMLDivElement>(null);

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

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
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
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={handleOpen}
        className="relative p-2 text-secondary hover:text-primary transition-colors"
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
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <>
          {/* Mobile: bottom sheet */}
          <div className="md:hidden fixed inset-0 z-50">
            <div className="absolute inset-0 bg-black/50" onClick={() => setIsOpen(false)} />
            <div className="absolute bottom-0 left-0 right-0 bg-surface rounded-t-2xl max-h-[70vh] overflow-y-auto pb-[env(safe-area-inset-bottom)]" style={{ animation: 'slideUp 0.25s ease-out' }}>
              <div className="flex justify-center pt-3 pb-1">
                <div className="w-10 h-1 bg-tertiary/40 rounded-full" />
              </div>
              <div className="p-4 border-b border-border">
                <h3 className="font-medium text-primary">Notifications</h3>
              </div>
              <NotificationList
                notifications={notifications}
                isLoading={isLoading}
                onItemClick={() => setIsOpen(false)}
                formatTime={formatTime}
              />
            </div>
          </div>

          {/* Desktop: dropdown */}
          <div className="hidden md:block absolute right-0 mt-2 w-80 bg-surface border border-border rounded-lg shadow-lg z-50 max-h-96 overflow-y-auto">
            <div className="p-3 border-b border-border">
              <h3 className="font-medium text-primary">Notifications</h3>
            </div>
            <NotificationList
              notifications={notifications}
              isLoading={isLoading}
              onItemClick={() => setIsOpen(false)}
              formatTime={formatTime}
              compact
            />
          </div>
        </>
      )}
    </div>
  );
}
