import Link from 'next/link';

export function Footer() {
  return (
    <footer className="py-6 px-4 text-center text-sm text-tertiary border-t border-border">
      <div className="max-w-2xl mx-auto flex items-center justify-center gap-2">
        <span>© 2026 Desmond Blume</span>
        <span>·</span>
        <Link
          href="/about"
          className="hover:text-secondary transition-colors"
        >
          About
        </Link>
        <span>·</span>
        <Link
          href="/privacy"
          className="hover:text-secondary transition-colors"
        >
          Privacy
        </Link>
      </div>
    </footer>
  );
}
