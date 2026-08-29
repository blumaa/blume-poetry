import Link from 'next/link';
import { Button } from '@/components/mds';
import { ThemeToggle } from '../ThemeToggle';
import { SubscribeButton } from '../SubscribeButton';
import { InfoButton } from '../InfoButton';
import { LoginButton } from '../LoginButton';

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
      className={`transition-transform ${isCollapsed ? 'rotate-180' : ''}`}
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
      <div className="p-4 border-b border-border flex items-center justify-between">
        <Link
          href="/"
          onClick={onClose}
          className="text-lg font-medium text-primary hover:text-secondary transition-colors h-[44px] flex items-center"
        >
          Blumenous Poetry
        </Link>

        <div className="flex items-center">
          <InfoButton className="text-secondary" />
          <SubscribeButton className="text-secondary" />
          <ThemeToggle />
          <LoginButton className="text-secondary" />
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
    <div className={`p-4 border-b border-border ${isCollapsed ? 'flex flex-col items-center gap-2' : ''}`}>
      {!isCollapsed && (
        <Link
          href="/"
          className="block text-lg font-medium text-primary hover:text-secondary transition-colors truncate mb-3"
        >
          Blumenous Poetry
        </Link>
      )}

      <div className={`flex items-center ${isCollapsed ? 'flex-col gap-2' : 'gap-1'}`}>
        <InfoButton className="text-secondary" />
        <SubscribeButton className="text-secondary" />
        <ThemeToggle />
        <LoginButton className="text-secondary" />
        <Button
          iconOnly
          variant="ghost"
          onClick={onToggleCollapse}
          className={isCollapsed ? 'order-first' : ''}
          aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          title={isCollapsed ? 'Expand' : 'Collapse'}
        >
          <CollapseIcon isCollapsed={isCollapsed} />
        </Button>
      </div>
    </div>
  );
}
