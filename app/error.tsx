'use client';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex items-center justify-center min-h-screen p-4">
      <div className="text-center max-w-md">
        <h1 className="text-xl font-medium text-primary mb-2">Something went wrong</h1>
        <p className="text-secondary mb-6">
          An unexpected error occurred. Please try again.
        </p>
        <button
          onClick={reset}
          className="px-6 py-2 bg-accent text-white rounded hover:bg-accent-hover transition-colors min-h-[44px]"
        >
          Try again
        </button>
      </div>
    </div>
  );
}
