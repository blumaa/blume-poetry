import type { CSSProperties } from 'react';
import { sanitizePoemHtml } from '@/lib/sanitize';
import { estimateLongestLineEm } from '@/lib/poemFit';
import styles from './PoemContent.module.css';

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

  // Typography and column sizing live in `.poem-content` (globals.css), shared
  // with the email renderer. Inline styles here would override that rule and
  // pin every poem to one measure.
  //
  // The one thing CSS can't work out for itself is how wide the poem's longest
  // line is, so it is measured here and handed over as `--poem-line`. The
  // wrapper is the query container that number is fitted against.
  return (
    <div
      className="poem-fit"
      style={{ '--poem-line': estimateLongestLineEm(sanitizedHtml) } as CSSProperties}
    >
      <div
        className={`poem-content ${styles.text} ${className}`}
        dangerouslySetInnerHTML={{ __html: sanitizedHtml }}
      />
    </div>
  );
}
