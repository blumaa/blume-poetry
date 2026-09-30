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
import { Icon } from '@/components/icons';
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
          <Icon name="bell" />
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
