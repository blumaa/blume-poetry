import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Offline | Blumenous Poetry',
};

export default function OfflinePage() {
  return (
    <div className="flex items-center justify-center min-h-screen p-4">
      <div className="text-center max-w-md">
        <h1 className="text-2xl font-medium text-primary mb-4" style={{ fontFamily: 'var(--font-serif)' }}>
          You&apos;re offline
        </h1>
        <p className="text-secondary mb-2">
          It looks like you&apos;ve lost your internet connection.
        </p>
        <p className="text-tertiary text-sm">
          Your poems will be available when you reconnect.
        </p>
      </div>
    </div>
  );
}
