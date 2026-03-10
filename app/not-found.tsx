import { SidebarServer } from '@/components/SidebarServer';
import { Footer } from '@/components/Footer';
import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen has-sidebar">
      <SidebarServer />
      <main id="main-content" className="flex-1 flex flex-col">
        <div className="flex-1 flex items-center justify-center px-4 py-12">
          <div className="text-center max-w-md">
            <h1 className="text-xl md:text-2xl font-normal text-primary mb-4">
              Page not found
            </h1>
            <p className="text-secondary mb-8">
              The poem you are looking for may have moved or does not exist.
            </p>
            <Link
              href="/"
              className="inline-flex items-center px-6 py-3 bg-accent text-white rounded hover:bg-accent-hover transition-colors min-h-[44px]"
            >
              Return to latest poem
            </Link>
          </div>
        </div>
        <Footer />
      </main>
    </div>
  );
}
