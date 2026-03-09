import { sanitizePoemHtml } from '@/lib/sanitize';

/**
 * PoemContent - Renders poem HTML with proper formatting and whitespace preservation.
 * Used by both PoemDisplay (user-facing) and PoemPreview (admin editor).
 *
 * HTML is sanitized server-side to prevent XSS.
 */

interface PoemContentProps {
  html: string;
  className?: string;
}

/**
 * Convert non-breaking spaces back to regular spaces.
 * CSS `white-space: pre-wrap` preserves regular spaces AND allows wrapping.
 * Non-breaking spaces don't wrap, causing mobile overflow issues.
 */
function normalizeWhitespace(html: string): string {
  return html
    .replace(/\u00A0/g, ' ')  // Unicode non-breaking space
    .replace(/&nbsp;/g, ' '); // HTML entity
}

export function PoemContent({ html, className = '' }: PoemContentProps) {
  if (!html || html.trim() === '') {
    return null;
  }

  const sanitizedHtml = sanitizePoemHtml(normalizeWhitespace(html));

  return (
    <div
      className={`poem-content text-base md:text-lg leading-relaxed text-primary ${className}`}
      style={{
        lineHeight: '1.8',
        fontFamily: 'var(--font-serif)',
        maxWidth: '100%',
        overflowWrap: 'break-word',
      }}
      dangerouslySetInnerHTML={{ __html: sanitizedHtml }}
    />
  );
}
