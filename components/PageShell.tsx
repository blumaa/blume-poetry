import { SidebarServer } from '@/components/SidebarServer';
import { Footer } from '@/components/Footer';
import styles from './PageShell.module.css';

interface PageShellProps {
  children: React.ReactNode;
  /** Extra classes merged onto the content wrapper, alongside the shared `flex-1`. */
  contentClassName?: string;
}

export function PageShell({ children, contentClassName }: PageShellProps) {
  const contentClass = contentClassName ? `${styles.content} ${contentClassName}` : styles.content;

  return (
    <div className={`has-sidebar ${styles.shell}`}>
      <SidebarServer />
      <main id="main-content" className={styles.main}>
        <div className={contentClass}>{children}</div>
        <Footer />
      </main>
    </div>
  );
}
