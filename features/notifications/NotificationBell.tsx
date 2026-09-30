'use client';

import { useRef, useState } from 'react';
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
import { useIsMobile } from '@/lib/useMediaQuery';
import { NotificationList } from './NotificationList';
import { useInbox } from './useInbox';
import styles from './NotificationBell.module.css';

export function NotificationBell() {
  const [isOpen, setIsOpen] = useState(false);
  const anchorRef = useRef<HTMLButtonElement>(null);
  const isMobile = useIsMobile();
  const { visible, unreadCount, isPending, isError, markSeen, clear } = useInbox();

  const handleToggle = () => {
    if (!isOpen && unreadCount > 0) markSeen();
    setIsOpen(!isOpen);
  };

  const handleClose = () => setIsOpen(false);

  const list = (
    <NotificationList
      notifications={visible}
      isPending={isPending}
      isError={isError}
      onItemClick={handleClose}
    />
  );

  const clearButton =
    visible.length > 0 ? (
      <Button variant="ghost" size="sm" onClick={clear}>
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
          onClick={handleToggle}
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
          <span className={styles.badge}>{unreadCount > 9 ? '9+' : unreadCount}</span>
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
