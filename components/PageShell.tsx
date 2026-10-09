import { SidebarServer } from '@/components/SidebarServer';
import { Footer } from '@/components/Footer';
import styles from './PageShell.module.css';

/** Sidebar, main column and footer around a public page. Rendered once by the
    (site) layout, so the sidebar keeps its state across navigations. */
export function PageShell({ children }: { children: React.ReactNode }) {
  return (
    <div className={`has-sidebar ${styles.shell}`}>
      <SidebarServer />
      <main id="main-content" className={styles.main}>
        <div className={styles.content}>{children}</div>
        <Footer />
      </main>
    </div>
  );
}
