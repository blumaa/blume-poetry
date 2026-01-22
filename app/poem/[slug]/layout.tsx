import { SidebarServer } from '@/components/SidebarServer';
import { Footer } from '@/components/Footer';

interface PoemLayoutProps {
  children: React.ReactNode;
}

export default function PoemLayout({ children }: PoemLayoutProps) {
  return (
    <div className="min-h-screen has-sidebar">
      <SidebarServer />
      <main id="main-content" className="flex-1 flex flex-col">
        <div className="flex-1">{children}</div>
        <Footer />
      </main>
    </div>
  );
}
