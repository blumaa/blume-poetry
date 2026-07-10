import { PageShell } from '@/components/PageShell';
import Link from 'next/link';

export default function NotFound() {
  return (
    <PageShell contentClassName="flex items-center justify-center px-4 py-12">
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
    </PageShell>
  );
}
