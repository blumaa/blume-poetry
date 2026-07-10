import type { ReactNode } from 'react';
import { SubscribeForm } from '../SubscribeForm';

interface SidebarFooterProps {
  hint: ReactNode;
}

export function SidebarFooter({ hint }: SidebarFooterProps) {
  return (
    <div className="p-3 border-t border-border">
      <div className="mb-4">
        <p className="text-xs text-tertiary mb-2">Subscribe</p>
        <SubscribeForm compact />
      </div>
      <div className="text-xs text-tertiary">{hint}</div>
    </div>
  );
}
