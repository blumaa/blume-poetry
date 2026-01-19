'use client';

/**
 * PoemContent - Renders poem HTML with proper formatting and whitespace preservation.
 * Used by both PoemDisplay (user-facing) and PoemPreview (admin editor).
 *
 * Supports:
 * - Bold, italic, underline formatting
 * - Whitespace/indentation preservation (via CSS white-space: pre-wrap)
 * - Consistent styling across the app
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

  const normalizedHtml = normalizeWhitespace(html);

  return (
    <div
      className={`poem-content text-base md:text-lg leading-relaxed text-[var(--text-primary)] ${className}`}
      style={{
        lineHeight: '1.8',
        fontFamily: 'var(--font-serif)',
        maxWidth: '100%',
        overflowWrap: 'break-word',
      }}
      dangerouslySetInnerHTML={{ __html: normalizedHtml }}
    />
  );
}
