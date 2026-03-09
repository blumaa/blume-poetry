'use client';

import Link from 'next/link';

export default function PoemError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex items-center justify-center min-h-[60vh] p-4">
      <div className="text-center max-w-md">
        <h1 className="text-xl font-medium text-primary mb-2">Could not load poem</h1>
        <p className="text-secondary mb-6">
          There was a problem loading this poem. Please try again.
        </p>
        <div className="flex gap-4 justify-center">
          <button
            onClick={reset}
            className="px-6 py-2 bg-accent text-white rounded hover:bg-accent-hover transition-colors min-h-[44px]"
          >
            Try again
          </button>
          <Link
            href="/"
            className="px-6 py-2 border border-border rounded hover:border-accent transition-colors text-primary min-h-[44px] flex items-center"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}
