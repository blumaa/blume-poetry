import type { Metadata } from 'next';
import Link from 'next/link';
import { SidebarServer } from '@/components/SidebarServer';
import { Footer } from '@/components/Footer';
import { UnsubscribeTracker } from '@/components/UnsubscribeTracker';

export const metadata: Metadata = {
  title: 'Unsubscribed | Blumenous Poetry',
  description: 'You have been unsubscribed from Blumenous Poetry',
};

export default function UnsubscribePage() {
  return (
    <div className="min-h-screen has-sidebar">
      <UnsubscribeTracker />
      <SidebarServer />
      <main id="main-content" className="flex-1 flex flex-col">
        <div className="flex-1 flex items-center justify-center px-4 py-12">
          <div className="text-center max-w-md">
            <div className="text-accent mb-6">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-16 w-16 mx-auto"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
            <h1 className="text-xl md:text-2xl font-normal text-primary mb-4">
              You&apos;ve been unsubscribed
            </h1>
            <p className="text-secondary mb-8">
              You will no longer receive email updates from Blumenous Poetry.
            </p>
            <Link
              href="/"
              className="inline-block px-6 py-3 bg-accent text-white rounded hover:bg-accent-hover transition-colors"
            >
              Return to poems
            </Link>
          </div>
        </div>
        <Footer />
      </main>
    </div>
  );
}
