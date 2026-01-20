import type { Metadata } from 'next';
import { SidebarServer } from '@/components/SidebarServer';
import { Footer } from '@/components/Footer';

export const metadata: Metadata = {
  title: 'Privacy Policy | Blumenous Poetry',
  description: 'Privacy policy for Blumenous Poetry',
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen has-sidebar">
      <SidebarServer />
      <main id="main-content" className="flex-1 flex flex-col">
        <div className="flex-1">
          <article className="page-content max-w-2xl mx-auto px-4 py-8 md:px-6 md:py-12">
            <header className="mb-8">
              <h1 className="text-xl md:text-2xl font-normal text-[var(--text-primary)] leading-tight">
                Privacy Policy
              </h1>
            </header>

            <div className="prose prose-sm text-[var(--text-primary)] leading-relaxed space-y-4">
              <p>
                Blumenous Poetry collects minimal data to provide you with a better experience.
              </p>

              <h2 className="text-lg font-medium mt-6 mb-2">Newsletter Subscription</h2>
              <p>
                If you subscribe to the newsletter, we collect your email address to send you
                occasional updates about new poems. You can unsubscribe at any time using the
                link in any email.
              </p>

              <h2 className="text-lg font-medium mt-6 mb-2">Analytics</h2>
              <p>
                We use Vercel Analytics to understand how visitors use the site. This collects
                anonymous usage data and does not track individual users.
              </p>

              <h2 className="text-lg font-medium mt-6 mb-2">Comments and Likes</h2>
              <p>
                Comments and likes are stored to display on the site. Comments include the
                name you provide and your message. No account is required.
              </p>

              <h2 className="text-lg font-medium mt-6 mb-2">Contact</h2>
              <p>
                For any privacy concerns, contact{' '}
                <a
                  href="mailto:desmond.blume@gmail.com"
                  className="text-[var(--accent)] hover:underline"
                >
                  desmond.blume@gmail.com
                </a>
              </p>
            </div>
          </article>
        </div>
        <Footer />
      </main>
    </div>
  );
}
