import type { Metadata } from 'next';
import { PageShell } from '@/components/PageShell';

export const metadata: Metadata = {
  title: 'About | Blumenous Poetry',
  description: 'About Blumenous Poetry by Desmond Blume',
  alternates: {
    canonical: '/about',
  },
};

export default function AboutPage() {
  return (
    <PageShell>
      <article className="page-content max-w-2xl mx-auto px-4 py-8 md:px-6 md:py-12">
        <header className="mb-8">
          <h1 className="text-xl md:text-2xl font-normal text-primary leading-tight">
            About
          </h1>
        </header>

        <div className="poem-content text-primary text-base leading-relaxed">
          <p className="italic mb-8">
            Blumenous Poetry, by Desmond Blume, is a collection of writings, sometimes dark,
            other times out there, usually influenced by the moon, never far from the truth,
            always full of farce.
          </p>

          <p>
            <a
              href="mailto:desmond.blume@gmail.com"
              className="text-accent hover:underline"
            >
              desmond.blume@gmail.com
            </a>
          </p>
        </div>
      </article>
    </PageShell>
  );
}
