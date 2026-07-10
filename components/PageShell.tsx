import { SidebarServer } from '@/components/SidebarServer';
import { Footer } from '@/components/Footer';

interface PageShellProps {
  children: React.ReactNode;
  /** Extra classes merged onto the content wrapper, alongside the shared `flex-1`. */
  contentClassName?: string;
}

export function PageShell({ children, contentClassName }: PageShellProps) {
  const contentClass = contentClassName ? `flex-1 ${contentClassName}` : 'flex-1';

  return (
    <div className="min-h-screen has-sidebar">
      <SidebarServer />
      <main id="main-content" className="flex-1 flex flex-col">
        <div className={contentClass}>{children}</div>
        <Footer />
      </main>
    </div>
  );
}
