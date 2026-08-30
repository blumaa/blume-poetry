import type { ReactNode } from 'react';
import { SubscribeForm } from '../SubscribeForm';
import styles from './SidebarFooter.module.css';

interface SidebarFooterProps {
  hint: ReactNode;
}

export function SidebarFooter({ hint }: SidebarFooterProps) {
  return (
    <div className={styles.footer}>
      <div className={styles.subscribeBlock}>
        <p className={styles.subscribeLabel}>Subscribe</p>
        <SubscribeForm compact />
      </div>
      <div className={styles.hint}>{hint}</div>
    </div>
  );
}
