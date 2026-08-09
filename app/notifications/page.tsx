import type { Metadata } from 'next';
import Link from 'next/link';
import { PageShell } from '@/components/PageShell';
import { NotificationSettings } from './NotificationSettings';

export const metadata: Metadata = {
  title: 'Email settings | Blumenous Poetry',
  description: 'Choose whether to get an email when a new poem is published',
  robots: { index: false, follow: false },
};

export default async function NotificationsPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string; action?: string }>;
}) {
  const { token, action } = await searchParams;

  return (
    <PageShell contentClassName="flex items-center justify-center px-4 py-12">
      <div className="text-center max-w-md">
        {token ? (
          <NotificationSettings
            token={token}
            initialAction={action === 'on' || action === 'off' ? action : undefined}
          />
        ) : (
          <>
            <h1 className="text-xl md:text-2xl font-normal text-primary mb-4">
              This link is missing something
            </h1>
            <p className="text-secondary mb-8">
              Open the link straight from one of my emails and it&rsquo;ll bring you here with
              your settings.
            </p>
            <Link
              href="/"
              className="inline-block px-6 py-3 bg-accent text-white rounded hover:bg-accent-hover transition-colors"
            >
              Return to poems
            </Link>
          </>
        )}
      </div>
    </PageShell>
  );
}
