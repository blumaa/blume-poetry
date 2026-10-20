import { SidebarServer } from '@/components/SidebarServer';
import { Footer } from '@/components/Footer';
import type { PoemCollection } from '@/lib/collections';
import styles from './PageShell.module.css';

interface PageShellProps {
  /** Whose poems the sidebar lists. */
  collection: PoemCollection;
  children: React.ReactNode;
}

/** Sidebar, main column and footer around a public page. Rendered once by the
    (site) and kinky layouts, so the sidebar keeps its state across navigations. */
export function PageShell({ collection, children }: PageShellProps) {
  return (
    <div className={`has-sidebar ${styles.shell}`}>
      <SidebarServer collection={collection} />
      <main id="main-content" className={styles.main}>
        <div className={styles.content}>{children}</div>
        <Footer />
      </main>
    </div>
  );
}
