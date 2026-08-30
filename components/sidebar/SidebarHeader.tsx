import { SITE_NAME } from '@/lib/brand';
import Link from 'next/link';
import { Button } from '@/components/mds';
import { ThemeToggle } from '../ThemeToggle';
import { SubscribeButton } from '../SubscribeButton';
import { InfoButton } from '../InfoButton';
import { LoginButton } from '../LoginButton';
import styles from './SidebarHeader.module.css';

interface SidebarHeaderProps {
  variant: 'mobile' | 'desktop';
  isCollapsed?: boolean;
  onClose?: () => void;
  onToggleCollapse?: () => void;
}

function CloseIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

function CollapseIcon({ isCollapsed }: { isCollapsed: boolean }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`${styles.collapseIcon} ${isCollapsed ? styles.collapseIconRotated : ''}`}
    >
      <path d="M11 17l-5-5 5-5" />
      <path d="M18 17l-5-5 5-5" />
    </svg>
  );
}

export function SidebarHeader({
  variant,
  isCollapsed = false,
  onClose,
  onToggleCollapse,
}: SidebarHeaderProps) {
  if (variant === 'mobile') {
    return (
      <div className={styles.headerMobile}>
        <Link
          href="/"
          onClick={onClose}
          className={styles.brandLinkMobile}
        >
          {SITE_NAME}
        </Link>

        <div className={styles.actionsMobile}>
          <InfoButton className={styles.iconButton} />
          <SubscribeButton className={styles.iconButton} />
          <ThemeToggle />
          <LoginButton className={styles.iconButton} />
          <Button
            iconOnly
            variant="ghost"
            onClick={onClose}
            aria-label="Close navigation menu"
          >
            <CloseIcon />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className={`${styles.headerDesktop} ${isCollapsed ? styles.headerDesktopCollapsed : ''}`}>
      {!isCollapsed && (
        <Link
          href="/"
          className={styles.brandLinkDesktop}
        >
          {SITE_NAME}
        </Link>
      )}

      <div className={`${styles.actions} ${isCollapsed ? styles.actionsCollapsed : ''}`}>
        <InfoButton className={styles.iconButton} />
        <SubscribeButton className={styles.iconButton} />
        <ThemeToggle />
        <LoginButton className={styles.iconButton} />
        <Button
          iconOnly
          variant="ghost"
          onClick={onToggleCollapse}
          className={isCollapsed ? styles.orderFirst : ''}
          aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          title={isCollapsed ? 'Expand' : 'Collapse'}
        >
          <CollapseIcon isCollapsed={isCollapsed} />
        </Button>
      </div>
    </div>
  );
}
