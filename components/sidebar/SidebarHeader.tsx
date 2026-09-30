import { SITE_NAME } from '@/lib/brand';
import Link from 'next/link';
import { BrandLogo } from '../BrandLogo';
import { Button } from '@/components/mds';
import { Icon } from '@/components/icons';
import { ThemeToggle } from '../ThemeToggle';
import { SubscribeButton } from '@/features/subscribers';
import { InfoButton } from '../InfoButton';
import { LoginButton } from '../LoginButton';
import styles from './SidebarHeader.module.css';

interface SidebarHeaderProps {
  variant: 'mobile' | 'desktop';
  isCollapsed?: boolean;
  onClose?: () => void;
  onToggleCollapse?: () => void;
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
          aria-label={SITE_NAME}
        >
          <BrandLogo />
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
            <Icon name="close" size="lg" />
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
          aria-label={SITE_NAME}
        >
          <BrandLogo />
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
          <Icon
            name="chevrons-left"
            className={`${styles.collapseIcon} ${isCollapsed ? styles.collapseIconRotated : ''}`}
          />
        </Button>
      </div>
    </div>
  );
}
